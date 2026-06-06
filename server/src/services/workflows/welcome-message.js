const prisma = require('../../lib/prisma')
const eventBus = require('../../lib/events')
const { renderTemplate } = require('../notifications/templates')
const { sendWhatsApp } = require('../notifications/whatsapp')
const { sendSMS } = require('../notifications/sms')

function register() {
  eventBus.on('patient:enrolled', async ({ patientId }) => {
    try {
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { id: true, fullName: true, mobile: true, whatsappConsent: true, smsConsent: true },
      })

      if (!patient) return

      // Deduplicate: skip if a welcome notification was already sent/pending for this patient
      const existing = await prisma.notification.findFirst({
        where: { patientId: patient.id, type: 'welcome' },
      })
      if (existing) return

      const firstName = patient.fullName.split(' ')[0]
      const { message, templateName } = renderTemplate('welcome', { name: firstName })

      if (patient.whatsappConsent) {
        await sendWhatsApp({
          patientId: patient.id,
          mobile: patient.mobile,
          message,
          type: 'welcome',
          templateName,
        })
      }

      if (patient.smsConsent) {
        try {
          await sendSMS({
            patientId: patient.id,
            mobile: patient.mobile,
            message,
            type: 'welcome',
            templateName,
          })
        } catch (err) {
          console.error('[Workflow:welcome-message:sms]', err)
        }
      }
    } catch (err) {
      console.error('[Workflow:welcome-message]', err)
    }
  })
}

module.exports = { register }
