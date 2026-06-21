const prisma = require('../../lib/prisma')

let twilioClient = null

function getTwilioClient() {
  if (twilioClient) return twilioClient
  if (process.env.WHATSAPP_ENABLED === 'true') {
    const twilio = require('twilio')
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )
  }
  return twilioClient
}

/**
 * Format a 10-digit mobile number to whatsapp:+<country_code><number>
 */
function formatWhatsAppNumber(mobile) {
  const countryCode = process.env.WHATSAPP_COUNTRY_CODE || '+91'
  const digits = mobile.replace(/\D/g, '').slice(-10)
  return `whatsapp:${countryCode}${digits}`
}

/**
 * Send a WhatsApp message and log to Notification table.
 */
async function sendWhatsApp({ patientId, mobile, message, type, templateName, metadata, contentSid, contentVariables }) {
  const toNumber = formatWhatsAppNumber(mobile)

  // Create pending notification record
  const notification = await prisma.notification.create({
    data: {
      patientId,
      type,
      channel: 'whatsapp',
      toNumber,
      messageContent: message,
      templateName: templateName || null,
      status: 'pending',
      metadata: metadata || null,
    },
  })

  try {
    if (process.env.WHATSAPP_ENABLED !== 'true') {
      // Dry-run mode
      console.log(`[WhatsApp DRY-RUN] To: ${toNumber} | Type: ${type}`)
      console.log(`[WhatsApp DRY-RUN] Message: ${message}`)
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'sent', sentAt: new Date(), errorMessage: 'dry-run' },
      })
      return notification
    }

    const client = getTwilioClient()
    const createOpts = {
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: toNumber,
    }
    if (contentSid) {
      // Interactive / approved template message (e.g. quick-reply buttons).
      createOpts.contentSid = contentSid
      if (contentVariables) {
        createOpts.contentVariables =
          typeof contentVariables === 'string'
            ? contentVariables
            : JSON.stringify(contentVariables)
      }
    } else {
      createOpts.body = message
    }
    const result = await client.messages.create(createOpts)

    await prisma.notification.update({
      where: { id: notification.id },
      data: { status: 'sent', twilioSid: result.sid, sentAt: new Date() },
    })

    console.log(`[WhatsApp] Sent ${type} to ${toNumber} (SID: ${result.sid})`)
    return notification
  } catch (err) {
    console.error(`[WhatsApp] Failed to send ${type} to ${toNumber}:`, err.message)
    await prisma.notification.update({
      where: { id: notification.id },
      data: { status: 'failed', errorMessage: err.message },
    })
    return notification
  }
}

/**
 * Retry a failed notification by ID.
 */
async function retryNotification(id) {
  const notification = await prisma.notification.findUnique({
    where: { id },
    include: { patient: { select: { mobile: true } } },
  })
  if (!notification) throw new Error('Notification not found')
  if (notification.status !== 'failed') throw new Error('Only failed notifications can be retried')

  return sendWhatsApp({
    patientId: notification.patientId,
    mobile: notification.patient.mobile,
    message: notification.messageContent,
    type: notification.type,
    templateName: notification.templateName,
    metadata: notification.metadata,
  })
}

module.exports = { sendWhatsApp, retryNotification }
