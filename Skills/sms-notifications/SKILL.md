# SMS Notifications

Use this skill whenever you need to work on automated SMS messages, Fast2SMS integration, SMS notification workflows, or the `smsConsent` patient field.

## Architecture

| Component | Detail |
|-----------|--------|
| Provider | Fast2SMS (Indian SMS gateway) |
| API endpoint | `POST https://www.fast2sms.com/dev/bulkV2` |
| Auth | `authorization` header with `FAST2SMS_API_KEY` |
| Consent field | `patient.smsConsent` (independent from WhatsApp) |
| Mode | `SMS_ENABLED=true` (live) or `false` (dry-run / log only) |

## How It Works

SMS runs as a **parallel channel** alongside WhatsApp. Both channels share the same message templates and workflow triggers, but use independent consent flags (`whatsappConsent` vs `smsConsent`) and independent try/catch blocks so one channel's failure never affects the other.

## SMS Sender

**File:** `server/src/services/notifications/sms.js`

```js
async function sendSMS({ patientId, mobile, message, type, templateName, metadata }) {
  // 1. Extract last 10 digits from mobile
  // 2. Create pending Notification record with channel: 'sms'
  // 3. If SMS_ENABLED=true → call Fast2SMS API
  //    If SMS_ENABLED=false → log only (dry-run)
  // 4. Update Notification with sent/failed status
}

async function retrySMSNotification(id) {
  // Re-sends a failed SMS notification
}
```

### Fast2SMS API Call

```js
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
    numbers: digits,  // 10-digit number
  }),
})
```

### Mobile Number Formatting

```js
// Extracts last 10 digits from Indian mobile
// Input: "+919900911795" → Output: "9900911795"
const digits = mobile.replace(/\D/g, '').slice(-10)
```

## Notification Workflows

SMS is integrated into all 6 existing notification workflows. Each workflow checks `patient.smsConsent` independently from `patient.whatsappConsent`.

| File | Type | Trigger |
|------|------|---------|
| `server/src/services/workflows/welcome-message.js` | Event | `patient:enrolled` |
| `server/src/services/workflows/appointment-reminder.js` | Cron | Hourly — appointments within next 24h |
| `server/src/services/workflows/no-show-followup.js` | Event | `appointment:no-show` |
| `server/src/services/workflows/package-milestone.js` | Event | `visit:recorded` (every 5th visit) |
| `server/src/services/workflows/package-completion.js` | Event | `package:completed` |
| `server/src/services/workflows/inactive-patient.js` | Cron | Daily 10 AM — active package, no visit in 30+ days |

### Pattern Used in Each Workflow

```js
// After existing WhatsApp block:
if (patient.smsConsent) {
  try {
    await sendSMS({
      patientId: patient.id,
      mobile: patient.mobile,
      message,
      type: '...',
      templateName,
    })
  } catch (err) {
    console.error('[Workflow:...:sms]', err)
  }
}
```

## API Endpoints

**GET `/api/admin/notifications`** [Protected] — List notifications
```
Query:    page, limit, type, status, patientId, channel, from, to
          channel=sms|whatsapp (filter by channel)
```

**POST `/api/admin/notifications/:id/retry`** [Protected] — Retry failed notification
- Automatically routes to `retrySMSNotification()` or `retryNotification()` based on `notification.channel`

## Database

### Patient Model — SMS Consent

```prisma
model Patient {
  ...
  whatsappConsent   Boolean   @default(true)
  smsConsent        Boolean   @default(true)
  ...
}
```

### Notification Records

SMS notifications use the same `Notification` model with `channel: 'sms'` instead of `channel: 'whatsapp'`.

## Key Files

| File | Purpose |
|------|---------|
| `server/src/services/notifications/sms.js` | `sendSMS()`, `retrySMSNotification()` — Fast2SMS integration |
| `server/src/services/notifications/whatsapp.js` | `sendWhatsApp()` — Twilio integration (parallel channel) |
| `server/src/services/notifications/templates.js` | Shared message templates |
| `server/src/routes/notifications.js` | Admin notification list + retry (routes to SMS or WhatsApp) |
| `server/src/services/workflows/*.js` | All 6 workflow files send both WhatsApp and SMS |
| `server/prisma/schema.prisma` | `smsConsent` field on Patient model |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `FAST2SMS_API_KEY` | Fast2SMS API authorization key |
| `SMS_ENABLED` | `true` = live, `false` = dry-run |
| `SMS_SENDER_ID` | DLT-registered sender ID (default: `RFREHB`) |
| `SMS_ROUTE` | Fast2SMS route: `dlt` (production) or `q` (quick/testing) |

## Operations

### Testing SMS (Dry-Run)

Set `SMS_ENABLED=false` in `.env`. Messages are logged to console with `[SMS DRY-RUN]` prefix instead of sent via Fast2SMS. Notification records are still created in the database with `channel: 'sms'` and `status: 'sent'`.

### Going Live

1. Create a Fast2SMS account at https://www.fast2sms.com
2. Get API key from the dashboard
3. Register DLT templates (required for transactional SMS in India)
4. Set `FAST2SMS_API_KEY`, `SMS_ENABLED=true`, `SMS_ROUTE=dlt` in production `.env`
5. Register sender ID (`RFREHB`) on DLT portal

### Adding SMS to a New Workflow

1. Import `sendSMS` from `../notifications/sms`
2. Fetch `smsConsent` in the patient query select
3. Add SMS send block after WhatsApp (check `patient.smsConsent`)
4. Wrap in independent try/catch

## Business Rules

- **Patient consent required** — checks `patient.smsConsent` before sending
- **Independent from WhatsApp** — SMS failures never affect WhatsApp delivery and vice versa
- **Same templates** — reuses the same rendered message content as WhatsApp
- **Audit trail** — every SMS attempt is recorded in the Notification table with `channel: 'sms'`
- **Retry** — failed SMS notifications can be retried from the admin panel
- **Default opt-in** — new patients have `smsConsent: true` by default

## Common Issues

**SMS not sending** — Check `SMS_ENABLED=true` in `.env`. If `false`, messages are only logged.

**"Fast2SMS API error"** — Verify `FAST2SMS_API_KEY` in `.env`. Check Fast2SMS dashboard for API quota/balance.

**DLT registration required** — For production transactional SMS in India, templates must be registered on the DLT portal (TRAI regulation).

**Duplicate notifications** — Each workflow has its own dedup logic. SMS and WhatsApp create separate Notification records (different `channel` values).

## Related Skills

- [WhatsApp Notifications](../whatsapp-notifications/SKILL.md) — Parallel WhatsApp channel via Twilio
- [Patient Management](../patient-management/SKILL.md) — `patient:enrolled` event source, `smsConsent` field
- [Treatment Packages](../treatment-packages/SKILL.md) — `visit:recorded` and `package:completed` events
- [Appointment Booking](../appointment-booking/SKILL.md) — `appointment:no-show` event, reminder cron
- [Deployment](../deployment/SKILL.md) — Fast2SMS environment variables on VPS
