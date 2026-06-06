const cron = require('node-cron')
const prisma = require('../../lib/prisma')
const { renderTemplate } = require('../notifications/templates')
const { sendWhatsApp } = require('../notifications/whatsapp')
const { sendSMS } = require('../notifications/sms')

function start() {
  // Run every hour at :00
  cron.schedule('0 * * * *', async () => {
    try {
      await sendReminders()
    } catch (err) {
      console.error('[Workflow:appointment-reminder] Cron error:', err)
    }
  })

  console.log('[Workflow:appointment-reminder] Cron registered (hourly)')
}

async function sendReminders() {
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  // Get tomorrow's date range to query appointments
  const appointments = await prisma.appointment.findMany({
    where: {
      status: 'booked',
      reminderSent: false,
      appointmentDate: {
        gte: new Date(now.toISOString().slice(0, 10) + 'T00:00:00'),
        lte: new Date(in24h.toISOString().slice(0, 10) + 'T23:59:59'),
      },
    },
    include: {
      patient: { select: { id: true, fullName: true, mobile: true, whatsappConsent: true, smsConsent: true } },
    },
  })

  for (const appt of appointments) {
    // Check if the appointment is actually within the next 24 hours
    const apptDateTime = new Date(appt.appointmentDate)
    const [h, m] = appt.startTime.split(':').map(Number)
    apptDateTime.setHours(h, m, 0, 0)

    if (apptDateTime <= now || apptDateTime > in24h) continue

    try {
      const firstName = appt.patient.fullName.split(' ')[0]
      const { message, templateName } = renderTemplate('reminder', {
        name: firstName,
        serviceType: appt.serviceType,
        time: appt.startTime,
        date: appt.appointmentDate.toISOString().slice(0, 10),
      })

      if (appt.patient.whatsappConsent) {
        await sendWhatsApp({
          patientId: appt.patient.id,
          mobile: appt.patient.mobile,
          message,
          type: 'reminder',
          templateName,
          metadata: { appointmentId: appt.id },
        })
      }

      if (appt.patient.smsConsent) {
        try {
          await sendSMS({
            patientId: appt.patient.id,
            mobile: appt.patient.mobile,
            message,
            type: 'reminder',
            templateName,
            metadata: { appointmentId: appt.id },
          })
        } catch (err) {
          console.error(`[Workflow:appointment-reminder:sms] Failed for appt ${appt.id}:`, err)
        }
      }

      await prisma.appointment.update({
        where: { id: appt.id },
        data: { reminderSent: true },
      })
    } catch (err) {
      console.error(`[Workflow:appointment-reminder] Failed for appt ${appt.id}:`, err)
    }
  }
}

module.exports = { start, sendReminders }
