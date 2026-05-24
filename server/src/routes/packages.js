const router      = require('express').Router()
const prisma      = require('../lib/prisma')
const eventBus    = require('../lib/events')
const { requireAuth } = require('../middleware/auth')

router.use(requireAuth)

// ─── Helper: expire overdue packages ────────────────────────────────────────
async function expireOverdue() {
  await prisma.treatmentPackage.updateMany({
    where: { status: 'active', expiryDate: { lt: new Date() } },
    data:  { status: 'expired' },
  })
}

// ─── GET /api/admin/packages?patientId= ─────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { patientId } = req.query
    if (!patientId) return res.status(400).json({ error: 'patientId is required' })

    await expireOverdue()

    const packages = await prisma.treatmentPackage.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: {
        payment: { select: { receiptNo: true, totalAmount: true, amountPaid: true, paymentDate: true, services: true } },
        _count:  { select: { visits: true } },
        visits:  { orderBy: { visitNumber: 'asc' } },
      },
    })

    res.json(packages)
  } catch (err) {
    console.error('[packages GET]', err)
    res.status(500).json({ error: 'Failed to fetch packages' })
  }
})

// ─── GET /api/admin/packages/:id ────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    await expireOverdue()

    const pkg = await prisma.treatmentPackage.findUnique({
      where: { id: req.params.id },
      include: {
        patient: { select: { id: true, fullName: true, mobile: true, referralSource: true } },
        payment: { select: { receiptNo: true, totalAmount: true, amountPaid: true, paymentDate: true, paymentMode: true, services: true } },
        visits:  { orderBy: { visitNumber: 'asc' } },
      },
    })
    if (!pkg) return res.status(404).json({ error: 'Package not found' })

    res.json(pkg)
  } catch (err) {
    console.error('[packages GET/:id]', err)
    res.status(500).json({ error: 'Failed to fetch package' })
  }
})

// ─── PATCH /api/admin/packages/:id ──────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const { status, notes, expiryDate, packageName } = req.body
    const data = {}
    if (status !== undefined)      data.status      = status
    if (notes !== undefined)       data.notes        = notes
    if (expiryDate !== undefined)  data.expiryDate   = expiryDate ? new Date(expiryDate) : null
    if (packageName !== undefined) data.packageName  = packageName

    const pkg = await prisma.treatmentPackage.update({
      where: { id: req.params.id },
      data,
      include: {
        _count: { select: { visits: true } },
        visits: { orderBy: { visitNumber: 'asc' } },
      },
    })

    res.json(pkg)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Package not found' })
    console.error('[packages PATCH]', err)
    res.status(500).json({ error: 'Failed to update package' })
  }
})

// ─── POST /api/admin/packages/:id/visits ────────────────────────────────────
router.post('/:id/visits', async (req, res) => {
  try {
    const pkg = await prisma.treatmentPackage.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { visits: true } } },
    })
    if (!pkg) return res.status(404).json({ error: 'Package not found' })
    if (pkg.status !== 'active') return res.status(400).json({ error: 'Package is not active' })

    const visitsDone = pkg._count.visits
    if (visitsDone >= pkg.totalSessions) {
      return res.status(400).json({ error: 'All sessions have been used' })
    }

    const { visitDate, treatmentNotes } = req.body
    const visitNumber = visitsDone + 1

    const visit = await prisma.patientVisit.create({
      data: {
        packageId:      pkg.id,
        visitDate:      visitDate ? new Date(visitDate) : new Date(),
        visitNumber,
        treatmentNotes: treatmentNotes || null,
        markedBy:       req.staff?.name || 'Staff',
      },
    })

    // Emit visit:recorded event (package visits only)
    eventBus.safeEmit('visit:recorded', {
      packageId: pkg.id,
      patientId: pkg.patientId,
      visitNumber,
      totalSessions: pkg.totalSessions,
    })

    // Auto-complete if this was the last session
    if (visitNumber >= pkg.totalSessions) {
      await prisma.treatmentPackage.update({
        where: { id: pkg.id },
        data:  { status: 'completed' },
      })

      eventBus.safeEmit('package:completed', {
        packageId: pkg.id,
        patientId: pkg.patientId,
      })
    }

    const updated = await prisma.treatmentPackage.findUnique({
      where: { id: pkg.id },
      include: {
        _count: { select: { visits: true } },
        visits: { orderBy: { visitNumber: 'asc' } },
      },
    })

    res.status(201).json({ visit, package: updated })
  } catch (err) {
    console.error('[packages POST visit]', err)
    res.status(500).json({ error: 'Failed to record visit' })
  }
})

// ─── DELETE /api/admin/packages/:id/visits/:visitId ─────────────────────────
router.delete('/:id/visits/:visitId', async (req, res) => {
  try {
    const visit = await prisma.patientVisit.findUnique({
      where: { id: req.params.visitId },
    })
    if (!visit || visit.packageId !== req.params.id) {
      return res.status(404).json({ error: 'Visit not found' })
    }

    await prisma.patientVisit.delete({ where: { id: req.params.visitId } })

    // Re-number remaining visits
    const remaining = await prisma.patientVisit.findMany({
      where: { packageId: req.params.id },
      orderBy: { visitDate: 'asc' },
    })
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].visitNumber !== i + 1) {
        await prisma.patientVisit.update({
          where: { id: remaining[i].id },
          data:  { visitNumber: i + 1 },
        })
      }
    }

    // Revert to active if package was completed
    const pkg = await prisma.treatmentPackage.findUnique({ where: { id: req.params.id } })
    if (pkg && pkg.status === 'completed') {
      await prisma.treatmentPackage.update({
        where: { id: req.params.id },
        data:  { status: 'active' },
      })
    }

    const updated = await prisma.treatmentPackage.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { visits: true } },
        visits: { orderBy: { visitNumber: 'asc' } },
      },
    })

    res.json({ message: 'Visit deleted', package: updated })
  } catch (err) {
    console.error('[packages DELETE visit]', err)
    res.status(500).json({ error: 'Failed to delete visit' })
  }
})

module.exports = router
