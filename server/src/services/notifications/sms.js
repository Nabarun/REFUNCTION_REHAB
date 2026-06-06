const prisma = require('../../lib/prisma')

/**
 * Extract last 10 digits from a mobile number.
 */
function formatSMSNumber(mobile) {
  return mobile.replace(/\D/g, '').slice(-10)
}

/**
 * Send an SMS via Fast2SMS and log to Notification table.
 */
async function sendSMS({ patientId, mobile, message, type, templateName, metadata }) {
  const digits = formatSMSNumber(mobile)

  // Create pending notification record
  const notification = await prisma.notification.create({
    data: {
      patientId,
      type,
      channel: 'sms',
      toNumber: digits,
      messageContent: message,
      templateName: templateName || null,
      status: 'pending',
      metadata: metadata || null,
    },
  })

  try {
    if (process.env.SMS_ENABLED !== 'true') {
      // Dry-run mode
      console.log(`[SMS DRY-RUN] To: ${digits} | Type: ${type}`)
      console.log(`[SMS DRY-RUN] Message: ${message}`)
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'sent', sentAt: new Date(), errorMessage: 'dry-run' },
      })
      return notification
    }

    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': process.env.FAST2SMS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: process.env.SMS_ROUTE || 'q',
        sender_id: process.env.SMS_SENDER_ID || 'RFREHB',
        message,
        language: 'english',
        flash: 0,
        numbers: digits,
      }),
    })

    const result = await response.json()

    if (!response.ok || result.return === false) {
      throw new Error(result.message?.[0] || result.message || 'Fast2SMS API error')
    }

    await prisma.notification.update({
      where: { id: notification.id },
      data: { status: 'sent', sentAt: new Date() },
    })

    console.log(`[SMS] Sent ${type} to ${digits} (request_id: ${result.request_id || 'N/A'})`)
    return notification
  } catch (err) {
    console.error(`[SMS] Failed to send ${type} to ${digits}:`, err.message)
    await prisma.notification.update({
      where: { id: notification.id },
      data: { status: 'failed', errorMessage: err.message },
    })
    return notification
  }
}

/**
 * Retry a failed SMS notification by ID.
 */
async function retrySMSNotification(id) {
  const notification = await prisma.notification.findUnique({
    where: { id },
    include: { patient: { select: { mobile: true } } },
  })
  if (!notification) throw new Error('Notification not found')
  if (notification.status !== 'failed') throw new Error('Only failed notifications can be retried')

  return sendSMS({
    patientId: notification.patientId,
    mobile: notification.patient.mobile,
    message: notification.messageContent,
    type: notification.type,
    templateName: notification.templateName,
    metadata: notification.metadata,
  })
}

module.exports = { sendSMS, retrySMSNotification }
