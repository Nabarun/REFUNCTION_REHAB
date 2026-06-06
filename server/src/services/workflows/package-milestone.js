const prisma = require('../../lib/prisma')
const eventBus = require('../../lib/events')
const { renderTemplate } = require('../notifications/templates')
const { sendWhatsApp } = require('../notifications/whatsapp')
const { sendSMS } = require('../notifications/sms')

function register() {
  eventBus.on('visit:recorded', async ({ packageId, patientId, visitNumber, totalSessions }) => {
    try {
      // Only trigger on every 5th visit
      if (visitNumber % 5 !== 0) return

      // Skip if this is the final visit — completion workflow handles it
      if (visitNumber >= totalSessions) return

      // Verify the package is still active
      const pkg = await prisma.treatmentPackage.findUnique({
        where: { id: packageId },
        select: { id: true, status: true, packageName: true },
      })
      if (!pkg || pkg.status !== 'active') return

      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { id: true, fullName: true, mobile: true, whatsappConsent: true, smsConsent: true },
      })
      if (!patient) return

      const firstName = patient.fullName.split(' ')[0]
      const { message, templateName } = renderTemplate('milestone', {
        name: firstName,
        visitNumber: String(visitNumber),
        totalSessions: String(totalSessions),
        packageName: pkg.packageName,
      })

      if (patient.whatsappConsent) {
        await sendWhatsApp({
          patientId: patient.id,
          mobile: patient.mobile,
          message,
          type: 'milestone',
          templateName,
          metadata: { packageId, visitNumber, totalSessions },
        })
      }

      if (patient.smsConsent) {
        try {
          await sendSMS({
            patientId: patient.id,
            mobile: patient.mobile,
            message,
            type: 'milestone',
            templateName,
            metadata: { packageId, visitNumber, totalSessions },
          })
        } catch (err) {
          console.error('[Workflow:package-milestone:sms]', err)
        }
      }
    } catch (err) {
      console.error('[Workflow:package-milestone]', err)
    }
  })
}

module.exports = { register }
