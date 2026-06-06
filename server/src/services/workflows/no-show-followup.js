const prisma = require('../../lib/prisma')
const eventBus = require('../../lib/events')
const { renderTemplate } = require('../notifications/templates')
const { sendWhatsApp } = require('../notifications/whatsapp')
const { sendSMS } = require('../notifications/sms')

function register() {
  eventBus.on('appointment:no-show', async ({ appointmentId, patientId }) => {
    try {
      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { id: true, serviceType: true, appointmentDate: true, startTime: true },
      })
      if (!appt) return

      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { id: true, fullName: true, mobile: true, whatsappConsent: true, smsConsent: true },
      })
      if (!patient) return

      const firstName = patient.fullName.split(' ')[0]
      const { message, templateName } = renderTemplate('noShow', {
        name: firstName,
        serviceType: appt.serviceType,
        date: appt.appointmentDate.toISOString().slice(0, 10),
        time: appt.startTime,
      })

      if (patient.whatsappConsent) {
        await sendWhatsApp({
          patientId: patient.id,
          mobile: patient.mobile,
          message,
          type: 'no-show',
          templateName,
          metadata: { appointmentId },
        })
      }

      if (patient.smsConsent) {
        try {
          await sendSMS({
            patientId: patient.id,
            mobile: patient.mobile,
            message,
            type: 'no-show',
            templateName,
            metadata: { appointmentId },
          })
        } catch (err) {
          console.error('[Workflow:no-show-followup:sms]', err)
        }
      }
    } catch (err) {
      console.error('[Workflow:no-show-followup]', err)
    }
  })
}

module.exports = { register }
