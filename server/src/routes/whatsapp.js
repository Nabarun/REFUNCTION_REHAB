const router = require('express').Router()
const twilio = require('twilio')
const { computeDaySlots } = require('./appointments')

// Collect open slots across the next ~1 day (today + tomorrow), soonest first.
async function findNextDayOpenSlots(maxResults = 6) {
  const now = new Date()
  const dates = [0, 1].map((offset) => {
    const d = new Date(now)
    d.setDate(d.getDate() + offset)
    return d.toISOString().slice(0, 10)
  })

  const open = []
  for (const date of dates) {
    const { blocked, slots } = await computeDaySlots(date)
    if (blocked) continue
    for (const s of slots) {
      if (s.available > 0) open.push({ date, ...s })
      if (open.length >= maxResults) break
    }
    if (open.length >= maxResults) break
  }
  return open
}

function formatSlotsMessage(slots) {
  if (!slots.length) {
    return 'No open slots in the next 24 hours. Please check the admin calendar for later availability.'
  }
  const lines = slots.map(
    (s) => `• ${s.date} ${s.startTime}-${s.endTime}${s.label ? ` (${s.label})` : ''} — ${s.available} open`
  )
  return `🗓️ Open slots in the next 24h:\n${lines.join('\n')}`
}

// ─── Twilio inbound WhatsApp webhook ─────────────────────────────────────────
// Configure the sandbox "When a message comes in" to POST here.
// On the doctor tapping "Suggest a slot", reply with the next 24h of openings.
// (A button tap is an inbound message, so the 24h window allows a freeform reply.)
router.post('/inbound', async (req, res) => {
  // Optional Twilio signature validation (enable with TWILIO_VALIDATE_INBOUND=true).
  try {
    const signature = req.headers['x-twilio-signature']
    const host = req.headers['x-forwarded-host'] || req.headers.host
    const url = `https://${host}${req.originalUrl}`
    const valid =
      signature && twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN, signature, url, req.body)
    if (process.env.TWILIO_VALIDATE_INBOUND === 'true' && !valid) {
      console.warn('[whatsapp inbound] signature validation failed')
      return res.status(403).end()
    }
  } catch (e) {
    console.warn('[whatsapp inbound] signature check error:', e.message)
  }

  const from = req.body.From // e.g. "whatsapp:+9173..."
  const payload = (req.body.ButtonPayload || '').toLowerCase()
  const buttonText = (req.body.ButtonText || '').toLowerCase()
  const body = (req.body.Body || '').toLowerCase()
  const wantsSlots =
    payload.includes('suggest') || buttonText.includes('suggest') || body.includes('suggest')

  // Ack Twilio immediately so it doesn't retry; continue work afterwards.
  res.type('text/xml').send('<Response></Response>')

  if (!from || !wantsSlots) return // Confirm / other taps are a no-op for now.

  try {
    const slots = await findNextDayOpenSlots()
    const message = formatSlotsMessage(slots)

    if (process.env.WHATSAPP_ENABLED !== 'true') {
      console.log(`[whatsapp inbound DRY-RUN] would reply to ${from}:\n${message}`)
      return
    }

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: from,
      body: message,
    })
    console.log(`[whatsapp inbound] sent slot suggestions to ${from}`)
  } catch (err) {
    console.error('[whatsapp inbound] failed to send slot suggestions:', err.message)
  }
})

module.exports = router
