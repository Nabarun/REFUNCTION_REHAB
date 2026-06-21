#!/usr/bin/env node
/**
 * One-time: create the "new booking" WhatsApp Content template with
 * Confirm / Decline quick-reply buttons, and print its ContentSid.
 *
 * Copy the printed HX... sid into .env.local as TWILIO_BOOKING_CONTENT_SID.
 *
 * Usage: node scripts/setup-booking-content-template.js
 *
 * Reuses an existing template if one with the same friendly_name already exists,
 * so it's safe to run more than once.
 */
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local'), override: true })
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

const FRIENDLY_NAME = 'refunction_new_booking_alert'
const { TWILIO_ACCOUNT_SID: SID, TWILIO_AUTH_TOKEN: TOKEN } = process.env

const BODY =
  '🗓️ New appointment booked\n' +
  'Patient: {{1}} ({{2}})\n' +
  'Service: {{3}}\n' +
  'Date: {{4}} at {{5}}\n' +
  'Type: {{6}}'

function authHeader() {
  return 'Basic ' + Buffer.from(`${SID}:${TOKEN}`).toString('base64')
}

async function findExisting() {
  const res = await fetch('https://content.twilio.com/v1/Content?PageSize=200', {
    headers: { Authorization: authHeader() },
  })
  if (!res.ok) return null
  const data = await res.json()
  return (data.contents || []).find((c) => c.friendly_name === FRIENDLY_NAME) || null
}

async function create() {
  const res = await fetch('https://content.twilio.com/v1/Content', {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      friendly_name: FRIENDLY_NAME,
      language: 'en',
      variables: { 1: 'Name', 2: 'Mobile', 3: 'Service', 4: 'Date', 5: 'Time', 6: 'Type' },
      types: {
        'twilio/quick-reply': {
          body: BODY,
          actions: [
            { title: 'Confirm', id: 'confirm' },
            { title: 'Decline', id: 'decline' },
          ],
        },
      },
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Content API ${res.status}: ${JSON.stringify(data)}`)
  }
  return data
}

async function main() {
  if (!SID || !TOKEN) {
    console.error('Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN in .env.local')
    process.exit(1)
  }

  const existing = await findExisting()
  if (existing) {
    console.log('ℹ️  Template already exists — reusing it.')
    console.log('   friendly_name: ' + existing.friendly_name)
    console.log('   ContentSid:    ' + existing.sid)
    console.log('\nSet this in .env.local:')
    console.log('   TWILIO_BOOKING_CONTENT_SID=' + existing.sid)
    return
  }

  const created = await create()
  console.log('✅ Created Content template')
  console.log('   friendly_name: ' + created.friendly_name)
  console.log('   ContentSid:    ' + created.sid)
  console.log('\nSet this in .env.local:')
  console.log('   TWILIO_BOOKING_CONTENT_SID=' + created.sid)
}

main().catch((e) => {
  console.error('❌ ' + e.message)
  process.exit(1)
})
