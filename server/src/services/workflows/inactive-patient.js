const cron = require('node-cron')
const prisma = require('../../lib/prisma')
const { renderTemplate } = require('../notifications/templates')
const { sendWhatsApp } = require('../notifications/whatsapp')
const { sendSMS } = require('../notifications/sms')

function start() {
  // Run daily at 10:00 AM
  cron.schedule('0 10 * * *', async () => {
    try {
      await checkInactivePatients()
    } catch (err) {
      console.error('[Workflow:inactive-patient] Cron error:', err)
    }
  })

  console.log('[Workflow:inactive-patient] Cron registered (daily 10:00 AM)')
}

async function checkInactivePatients() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Find patients with at least one active package whose last visit is > 30 days ago
  const patients = await prisma.patient.findMany({
    where: {
      OR: [{ whatsappConsent: true }, { smsConsent: true }],
      packages: {
        some: { status: 'active' },
      },
    },
    select: {
      id: true,
      fullName: true,
      mobile: true,
      whatsappConsent: true,
      smsConsent: true,
      packages: {
        where: { status: 'active' },
        select: {
          id: true,
          visits: {
            orderBy: { visitDate: 'desc' },
            take: 1,
            select: { visitDate: true },
          },
        },
      },
    },
  })

  for (const patient of patients) {
    try {
      // Find the most recent visit across all active packages
      let lastVisitDate = null
      for (const pkg of patient.packages) {
        if (pkg.visits.length > 0) {
          const vDate = new Date(pkg.visits[0].visitDate)
          if (!lastVisitDate || vDate > lastVisitDate) {
            lastVisitDate = vDate
          }
        }
      }

      // If no visits at all or last visit is within 30 days, skip
      if (lastVisitDate && lastVisitDate > thirtyDaysAgo) continue

      // If the patient has active packages but zero visits, also consider them inactive
      // (they enrolled but never came)

      // Check if a re-engagement notification was already sent in the last 30 days
      const recentNotif = await prisma.notification.findFirst({
        where: {
          patientId: patient.id,
          type: 're-engagement',
          createdAt: { gte: thirtyDaysAgo },
        },
      })
      if (recentNotif) continue

      const firstName = patient.fullName.split(' ')[0]
      const { message, templateName } = renderTemplate('reEngagement', {
        name: firstName,
      })

      if (patient.whatsappConsent) {
        await sendWhatsApp({
          patientId: patient.id,
          mobile: patient.mobile,
          message,
          type: 're-engagement',
          templateName,
        })
      }

      if (patient.smsConsent) {
        try {
          await sendSMS({
            patientId: patient.id,
            mobile: patient.mobile,
            message,
            type: 're-engagement',
            templateName,
          })
        } catch (err) {
          console.error(`[Workflow:inactive-patient:sms] Failed for patient ${patient.id}:`, err)
        }
      }
    } catch (err) {
      console.error(`[Workflow:inactive-patient] Failed for patient ${patient.id}:`, err)
    }
  }
}

module.exports = { start, checkInactivePatients }
