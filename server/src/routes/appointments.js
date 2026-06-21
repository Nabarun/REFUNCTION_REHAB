const router      = require('express').Router()
const prisma      = require('../lib/prisma')
const eventBus    = require('../lib/events')
const rateLimit   = require('express-rate-limit')
const { requireAuth } = require('../middleware/auth')
const { sendWhatsApp } = require('../services/notifications/whatsapp')

// Sends a WhatsApp alert to the clinic/doctor when a new appointment is booked.
// Gated on CLINIC_WHATSAPP_TO; runs in dry-run unless WHATSAPP_ENABLED === 'true'.
async function notifyDoctorOfBooking(appointment) {
  const to = process.env.CLINIC_WHATSAPP_TO
  if (!to) return // not configured → skip silently

  const dateStr = new Date(appointment.appointmentDate).toISOString().slice(0, 10)
  const name = appointment.patient?.fullName || 'Unknown'
  const mobile = appointment.patient?.mobile || 'n/a'
  const sessionType = appointment.sessionType || 'In-Person'

  // Human-readable copy stored in the Notification log (and the fallback body
  // if no Content template is configured).
  const message =
    `🗓️ New appointment booked\n` +
    `Patient: ${name} (${mobile})\n` +
    `Service: ${appointment.serviceType}\n` +
    `Date: ${dateStr} at ${appointment.startTime}\n` +
    `Type: ${sessionType}`

  const contentSid = process.env.TWILIO_BOOKING_CONTENT_SID
  const contentVariables = contentSid
    ? {
        1: name,
        2: mobile,
        3: appointment.serviceType,
        4: dateStr,
        5: appointment.startTime,
        6: sessionType,
      }
    : undefined

  await sendWhatsApp({
    patientId: appointment.patientId,
    mobile: to,
    message,
    type: 'new-booking',
    templateName: 'new_booking_alert',
    metadata: { appointmentId: appointment.id, recipient: 'clinic' },
    contentSid,
    contentVariables,
  })
}

const quickRegLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please try again in a minute.' },
})

// ─── Helpers ─────────────────────────────────────────────────────────────────
function generateSlots(startTime, endTime, duration) {
  const slots = []
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  let cur = sh * 60 + sm
  const end = eh * 60 + em
  while (cur + duration <= end) {
    const slotStart = `${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`
    const slotEnd   = `${String(Math.floor((cur + duration) / 60)).padStart(2, '0')}:${String((cur + duration) % 60).padStart(2, '0')}`
    slots.push({ startTime: slotStart, endTime: slotEnd })
    cur += duration
  }
  return slots
}

// ─── PUBLIC: GET /api/appointments/slots?date=YYYY-MM-DD ─────────────────────
router.get('/slots', async (req, res) => {
  try {
    const { date } = req.query
    if (!date) return res.status(400).json({ error: 'date query param is required' })

    const targetDate = new Date(date + 'T00:00:00')
    const dayOfWeek  = targetDate.getDay() // 0=Sun

    // 1. Get availability blocks for this day of week
    const availability = await prisma.doctorAvailability.findMany({
      where: { dayOfWeek, isActive: true },
      orderBy: { startTime: 'asc' },
    })

    // 2. Get overrides for this date
    const dayStart = new Date(date + 'T00:00:00')
    const dayEnd   = new Date(date + 'T23:59:59')
    const overrides = await prisma.slotOverride.findMany({
      where: { date: { gte: dayStart, lte: dayEnd } },
    })

    // Check for day-level block (override with no startTime = whole day blocked)
    const dayBlocked = overrides.some(o => o.isBlocked && !o.startTime)
    if (dayBlocked) {
      const reason = overrides.find(o => o.isBlocked && !o.startTime)?.reason
      return res.json({ date, blocked: true, reason: reason || 'Unavailable', slots: [] })
    }

    // 3. Generate time slots from availability
    const allSlots = []
    for (const block of availability) {
      const slots = generateSlots(block.startTime, block.endTime, block.slotDuration)
      for (const slot of slots) {
        // Check slot-level overrides
        const slotBlocked = overrides.some(o =>
          o.isBlocked && o.startTime && o.startTime === slot.startTime
        )
        if (!slotBlocked) {
          allSlots.push({
            startTime:    slot.startTime,
            endTime:      slot.endTime,
            sessionType:  block.sessionType,
            label:        block.label,
            maxPatients:  block.maxPatients,
          })
        }
      }
    }

    // 4. Count existing non-cancelled appointments per slot
    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: { gte: dayStart, lte: dayEnd },
        status: { notIn: ['cancelled'] },
      },
      select: { startTime: true },
    })

    const bookingCounts = {}
    for (const appt of appointments) {
      bookingCounts[appt.startTime] = (bookingCounts[appt.startTime] || 0) + 1
    }

    // 5. Calculate availability, filter past slots if today
    const now = new Date()
    const isToday = date === now.toISOString().slice(0, 10)

    const result = allSlots.map(slot => {
      const booked    = bookingCounts[slot.startTime] || 0
      const available = Math.max(0, slot.maxPatients - booked)
      return { ...slot, booked, available }
    }).filter(slot => {
      if (!isToday) return true
      // Slot must be at least 2 hours from now
      const [h, m] = slot.startTime.split(':').map(Number)
      const slotTime = new Date(now)
      slotTime.setHours(h, m, 0, 0)
      return slotTime.getTime() > now.getTime() + 2 * 60 * 60 * 1000
    })

    res.json({ date, blocked: false, slots: result })
  } catch (err) {
    console.error('[appointments slots]', err)
    res.status(500).json({ error: 'Failed to fetch slots' })
  }
})

// ─── PUBLIC: POST /api/appointments/lookup ────────────────────────────────────
router.post('/lookup', async (req, res) => {
  try {
    const { q } = req.body
    if (!q || q.trim().length < 3) {
      return res.status(400).json({ error: 'Search query must be at least 3 characters' })
    }

    const patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { id: q.trim() },
          { mobile: q.trim() },
        ],
      },
      select: {
        id: true, fullName: true, mobile: true, program: true,
        sessionType: true, preferredTime: true,
      },
    })

    if (!patient) return res.status(404).json({ error: 'Patient not found' })
    res.json(patient)
  } catch (err) {
    console.error('[appointments lookup]', err)
    res.status(500).json({ error: 'Lookup failed' })
  }
})

// ─── PUBLIC: POST /api/appointments/quick-register ──────────────────────────
router.post('/quick-register', quickRegLimiter, async (req, res) => {
  try {
    const { fullName, mobile, gender, age } = req.body

    // Validate required fields
    if (!fullName || !mobile || !gender || age === undefined || age === null || age === '') {
      return res.status(400).json({ error: 'All fields are required: fullName, mobile, gender, age' })
    }
    if (fullName.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters' })
    }
    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ error: 'Mobile must be exactly 10 digits' })
    }
    const allowedGenders = ['Male', 'Female', 'Other', 'Prefer not to say']
    if (!allowedGenders.includes(gender)) {
      return res.status(400).json({ error: `Gender must be one of: ${allowedGenders.join(', ')}` })
    }
    const ageNum = parseInt(age)
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      return res.status(400).json({ error: 'Age must be between 1 and 120' })
    }

    // Check if mobile already exists — return existing patient (idempotent)
    const existing = await prisma.patient.findUnique({
      where: { mobile },
      select: { id: true, fullName: true, mobile: true, program: true, sessionType: true, preferredTime: true },
    })
    if (existing) return res.status(200).json(existing)

    // Generate Patient ID via same sequence as enrollment
    const [{ nextval }] = await prisma.$queryRaw`SELECT nextval('patient_serial_seq')`
    const patientId = `RF-${String(nextval).padStart(4, '0')}`

    const patient = await prisma.patient.create({
      data: {
        id:                 patientId,
        fullName:           fullName.trim(),
        mobile,
        gender,
        age:                ageNum,
        program:            [],
        sessionType:        'In-Person',
        preferredDays:      [],
        preferredTime:      '',
        conditions:         [],
        fitnessGoals:       [],
        painAreas:          [],
        consentGiven:       false,
        registrationStatus: 'quick',
      },
    })

    eventBus.safeEmit('patient:enrolled', { patientId: patient.id })

    res.status(201).json({
      id:            patient.id,
      fullName:      patient.fullName,
      mobile:        patient.mobile,
      program:       patient.program,
      sessionType:   patient.sessionType,
      preferredTime: patient.preferredTime,
    })
  } catch (err) {
    // Handle race condition: another request created the same mobile concurrently
    if (err.code === 'P2002') {
      const existing = await prisma.patient.findUnique({
        where: { mobile: req.body.mobile },
        select: { id: true, fullName: true, mobile: true, program: true, sessionType: true, preferredTime: true },
      })
      if (existing) return res.status(200).json(existing)
    }
    console.error('[quick-register]', err)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// ─── PUBLIC: POST /api/appointments ──────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { patientId, packageId, appointmentDate, startTime, endTime, serviceType, sessionType, notes } = req.body

    if (!patientId || !appointmentDate || !startTime || !endTime || !serviceType) {
      return res.status(400).json({ error: 'patientId, appointmentDate, startTime, endTime, and serviceType are required' })
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({ where: { id: patientId } })
    if (!patient) return res.status(404).json({ error: 'Patient not found' })

    // Capacity check + create in transaction
    const appointment = await prisma.$transaction(async (tx) => {
      // Get availability block for capacity info
      const dateObj = new Date(appointmentDate + 'T00:00:00')
      const dayOfWeek = dateObj.getDay()
      const block = await tx.doctorAvailability.findFirst({
        where: { dayOfWeek, isActive: true, startTime: { lte: startTime }, endTime: { gte: endTime } },
      })
      const maxPatients = block?.maxPatients || 1

      // Count current bookings for this slot
      const dayStart = new Date(appointmentDate + 'T00:00:00')
      const dayEnd   = new Date(appointmentDate + 'T23:59:59')
      const count = await tx.appointment.count({
        where: {
          appointmentDate: { gte: dayStart, lte: dayEnd },
          startTime,
          status: { notIn: ['cancelled'] },
        },
      })

      if (count >= maxPatients) {
        throw new Error('SLOT_FULL')
      }

      return tx.appointment.create({
        data: {
          patientId,
          packageId:       packageId || null,
          appointmentDate: new Date(appointmentDate + 'T00:00:00'),
          startTime,
          endTime,
          serviceType,
          sessionType:     sessionType || 'In-Person',
          notes:           notes || null,
        },
        include: {
          patient: { select: { fullName: true, mobile: true } },
        },
      })
    })

    res.status(201).json(appointment)

    // Fire-and-forget: alert the clinic/doctor. Never blocks or fails the booking.
    notifyDoctorOfBooking(appointment).catch((err) =>
      console.error('[appointments] doctor WhatsApp alert failed:', err.message)
    )
  } catch (err) {
    if (err.message === 'SLOT_FULL') {
      return res.status(409).json({ error: 'This slot is fully booked. Please choose another time.' })
    }
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'You already have an appointment at this time.' })
    }
    console.error('[appointments POST]', err)
    res.status(500).json({ error: 'Failed to book appointment' })
  }
})

// ─── PUBLIC: PATCH /api/appointments/:id/cancel ──────────────────────────────
router.patch('/:id/cancel', async (req, res) => {
  try {
    const { patientId, reason } = req.body

    const appt = await prisma.appointment.findUnique({ where: { id: req.params.id } })
    if (!appt) return res.status(404).json({ error: 'Appointment not found' })
    if (appt.patientId !== patientId) {
      return res.status(403).json({ error: 'Not authorized to cancel this appointment' })
    }
    if (appt.status === 'cancelled') {
      return res.status(400).json({ error: 'Appointment is already cancelled' })
    }

    // Must be at least 4 hours before appointment
    const apptDateTime = new Date(appt.appointmentDate)
    const [h, m] = appt.startTime.split(':').map(Number)
    apptDateTime.setHours(h, m, 0, 0)
    const hoursUntil = (apptDateTime.getTime() - Date.now()) / (1000 * 60 * 60)
    if (hoursUntil < 4) {
      return res.status(400).json({ error: 'Appointments can only be cancelled at least 4 hours in advance' })
    }

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: {
        status: 'cancelled',
        cancellationReason: reason || null,
        cancelledAt: new Date(),
      },
    })
    res.json(updated)
  } catch (err) {
    console.error('[appointments cancel]', err)
    res.status(500).json({ error: 'Failed to cancel appointment' })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN-ONLY routes below this point
// ═══════════════════════════════════════════════════════════════════════════════
router.use(requireAuth)

// ─── GET /api/appointments (admin) ───────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const page      = parseInt(req.query.page)  || 1
    const limit     = parseInt(req.query.limit) || 20
    const status    = req.query.status || ''
    const search    = req.query.search || ''
    const patientId = req.query.patientId || ''
    const from      = req.query.from ? new Date(req.query.from) : undefined
    const to        = req.query.to   ? new Date(req.query.to)   : undefined

    const where = {
      ...(status && { status }),
      ...(patientId && { patientId }),
      ...(search && {
        OR: [
          { patient: { fullName: { contains: search, mode: 'insensitive' } } },
          { patient: { mobile:   { contains: search } } },
          { patientId: { contains: search } },
        ],
      }),
      ...(from || to ? {
        appointmentDate: {
          ...(from && { gte: from }),
          ...(to   && { lte: to   }),
        },
      } : {}),
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        orderBy: [{ appointmentDate: 'desc' }, { startTime: 'asc' }],
        skip:  (page - 1) * limit,
        take:  limit,
        include: {
          patient: { select: { fullName: true, mobile: true } },
        },
      }),
      prisma.appointment.count({ where }),
    ])

    res.json({ appointments, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    console.error('[appointments admin GET]', err)
    res.status(500).json({ error: 'Failed to fetch appointments' })
  }
})

// ─── GET /api/appointments/today (admin) ─────────────────────────────────────
router.get('/today', async (req, res) => {
  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: { gte: todayStart, lte: todayEnd },
        status: { notIn: ['cancelled'] },
      },
      orderBy: { startTime: 'asc' },
      include: {
        patient: { select: { fullName: true, mobile: true } },
      },
    })
    res.json(appointments)
  } catch (err) {
    console.error('[appointments today]', err)
    res.status(500).json({ error: 'Failed to fetch today schedule' })
  }
})

// ─── PATCH /api/appointments/:id (admin) ─────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const { status, notes, cancellationReason } = req.body
    const data = {}
    if (status !== undefined)             data.status             = status
    if (notes !== undefined)              data.notes              = notes
    if (cancellationReason !== undefined) data.cancellationReason = cancellationReason
    if (status === 'cancelled')           data.cancelledAt        = new Date()

    // Fetch current appointment to check previous status
    const current = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      select: { status: true, patientId: true, packageId: true, appointmentDate: true },
    })
    if (!current) return res.status(404).json({ error: 'Appointment not found' })

    const appt = await prisma.appointment.update({
      where: { id: req.params.id },
      data,
      include: {
        patient: { select: { fullName: true, mobile: true } },
      },
    })

    if (status === 'no-show') {
      eventBus.safeEmit('appointment:no-show', {
        appointmentId: appt.id,
        patientId: appt.patientId,
      })
    }

    // Auto-record visit when appointment transitions to "completed"
    let autoVisit = null
    if (status === 'completed' && current.status !== 'completed') {
      try {
        // Find active package: prefer linked packageId, otherwise first active package
        const pkg = current.packageId
          ? await prisma.treatmentPackage.findUnique({
              where: { id: current.packageId },
              include: { _count: { select: { visits: true } } },
            })
          : await prisma.treatmentPackage.findFirst({
              where: { patientId: current.patientId, status: 'active' },
              orderBy: { createdAt: 'desc' },
              include: { _count: { select: { visits: true } } },
            })

        if (pkg && pkg.status === 'active' && pkg._count.visits < pkg.totalSessions) {
          const visitNumber = pkg._count.visits + 1

          autoVisit = await prisma.patientVisit.create({
            data: {
              packageId:      pkg.id,
              visitDate:      current.appointmentDate,
              visitNumber,
              treatmentNotes: notes || null,
              markedBy:       'Auto (appointment completed)',
            },
          })

          console.log(`[auto-visit] Recorded visit ${visitNumber}/${pkg.totalSessions} for patient ${current.patientId} on package ${pkg.id}`)

          eventBus.safeEmit('visit:recorded', {
            packageId: pkg.id,
            patientId: current.patientId,
            visitNumber,
            totalSessions: pkg.totalSessions,
          })

          // Auto-complete package if this was the last session
          if (visitNumber >= pkg.totalSessions) {
            await prisma.treatmentPackage.update({
              where: { id: pkg.id },
              data:  { status: 'completed' },
            })

            eventBus.safeEmit('package:completed', {
              packageId: pkg.id,
              patientId: current.patientId,
            })

            console.log(`[auto-visit] Package ${pkg.id} auto-completed`)
          }
        }
      } catch (visitErr) {
        console.error('[auto-visit] Failed:', visitErr)
        // Don't fail the appointment update if auto-visit fails
      }
    }

    res.json({ ...appt, autoVisit })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Appointment not found' })
    console.error('[appointments admin PATCH]', err)
    res.status(500).json({ error: 'Failed to update appointment' })
  }
})

module.exports = router
