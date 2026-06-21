#!/usr/bin/env node
/**
 * Standalone Twilio WhatsApp sandbox test.
 *
 * Talks to Twilio directly (no DB, no Patient row) so you can confirm the
 * sandbox + credentials work before wiring notifications into the app.
 *
 * Usage:
 *   node scripts/test-whatsapp-sandbox.js <to-number>
 *   node scripts/test-whatsapp-sandbox.js 9812345678
 *   node scripts/test-whatsapp-sandbox.js +919812345678 "Custom message"
 *
 * Reads the same env files the server does (../.env.local then ../.env).
 * Required env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
 * Optional env: WHATSAPP_COUNTRY_CODE (default +91)
 */
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local'), override: true })
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

function formatWhatsAppNumber(mobile) {
  // If the caller already passed a full +<cc><number>, respect it.
  const trimmed = String(mobile).trim()
  if (trimmed.startsWith('+')) return `whatsapp:${trimmed.replace(/\s/g, '')}`
  const countryCode = process.env.WHATSAPP_COUNTRY_CODE || '+91'
  const digits = trimmed.replace(/\D/g, '').slice(-10)
  return `whatsapp:${countryCode}${digits}`
}

async function main() {
  const to = process.argv[2]
  const customMessage = process.argv[3]

  if (!to) {
    console.error('Usage: node scripts/test-whatsapp-sandbox.js <to-number> ["message"]')
    process.exit(1)
  }

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM } = process.env
  const missing = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_FROM']
    .filter((k) => !process.env[k])
  if (missing.length) {
    console.error('Missing env vars: ' + missing.join(', '))
    console.error('Set them in ReFunction_Rehab/.env.local (gitignored) and retry.')
    process.exit(1)
  }

  const toNumber = formatWhatsAppNumber(to)
  const body = customMessage ||
    'ReFunction Rehab test ✅ — if you can read this, the WhatsApp sandbox is working.'

  console.log(`From: ${TWILIO_WHATSAPP_FROM}`)
  console.log(`To:   ${toNumber}`)
  console.log(`Body: ${body}`)
  console.log('Sending…\n')

  const twilio = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  try {
    const msg = await twilio.messages.create({
      from: TWILIO_WHATSAPP_FROM,
      to: toNumber,
      body,
    })
    console.log('✅ Accepted by Twilio')
    console.log('   SID:    ' + msg.sid)
    console.log('   Status: ' + msg.status)
    console.log('\nCheck the recipient phone. If nothing arrives, the most common cause is')
    console.log('that this number has not joined the sandbox — see "join <code>" step.')
  } catch (err) {
    console.error('❌ Twilio rejected the message')
    console.error('   Code:    ' + (err.code || 'n/a'))
    console.error('   Message: ' + err.message)
    if (err.code === 63007 || err.code === 21910) {
      console.error('\n→ TWILIO_WHATSAPP_FROM is not a valid/enabled sandbox sender.')
      console.error('  Use exactly the number shown in Console → Messaging → Try it out → WhatsApp sandbox,')
      console.error('  in the form  whatsapp:+14155238886')
    }
    if (err.code === 63015 || err.code === 63016) {
      console.error('\n→ The recipient has not joined the sandbox (or the 24h window lapsed).')
      console.error('  From the recipient phone, WhatsApp "join <two-word-code>" to the sandbox number.')
    }
    process.exit(1)
  }
}

main()
