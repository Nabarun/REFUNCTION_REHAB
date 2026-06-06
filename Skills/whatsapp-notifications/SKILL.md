# WhatsApp Notifications

Use this skill whenever you need to work on automated WhatsApp messages, Twilio integration, notification workflows, message templates, the event bus, or the Notification data model.

## Architecture

| Component | Detail |
|-----------|--------|
| Provider | Twilio WhatsApp Business API |
| Event system | Node.js EventEmitter (`server/src/lib/events.js`) |
| Workflow engine | `server/src/services/workflows/engine.js` |
| Scheduler | `node-cron` for recurring tasks |
| Mode | `WHATSAPP_ENABLED=true` (live) or `false` (dry-run / log only) |

| Page | Route | File |
|------|-------|------|
| Admin Notifications | `/admin/notifications` | `client/src/pages/admin/Notifications.jsx` |

## Prisma Model

```prisma
model Notification {
  id              String    @id @default(cuid())
  patientId       String
  patient         Patient   @relation(fields: [patientId], references: [id])
  type            String                     // welcome|milestone|completion|reminder|no-show|re-engagement
  channel         String    @default("whatsapp")
  toNumber        String                     // formatted: whatsapp:+91XXXXXXXXXX
  messageContent  String                     // rendered message text
  templateName    String?                    // template identifier
  status          String    @default("pending")  // pending|sent|delivered|failed
  twilioSid       String?                    // Twilio message SID
  errorMessage    String?                    // error details on failure
  metadata        Json?                      // additional context
  sentAt          DateTime?
  deliveredAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([patientId])
  @@index([type])
  @@index([status])
  @@index([createdAt])
  @@map("notifications")
}
```

## API Endpoints

**GET `/api/admin/notifications`** [Protected] — List notifications
```
Query:    page=1, limit=20, type=, status=, patientId=, from=, to=
Response: {
  notifications: [{ id, patientId, patient: { fullName }, type, channel,
                     toNumber, messageContent, status, sentAt, createdAt }],
  total, page, totalPages,
  summary: { total, sent, failed, pending }
}
```

**POST `/api/admin/notifications/:id/retry`** [Protected] — Retry failed notification
```
Response: { ...notification, status: "sent"|"failed" }
```
- Re-sends the same message via Twilio
- Updates status and error message

## Event Bus

**File:** `server/src/lib/events.js`

```js
// Global event emitter with safe emission (catches listener errors)
const EventBus = new EventEmitter();
EventBus.setMaxListeners(20);
EventBus.safeEmit = (event, data) => {
  try { EventBus.emit(event, data); } catch (err) { console.error(err); }
};
```

### Events

| Event | Emitted By | Data | Triggers |
|-------|-----------|------|----------|
| `patient:enrolled` | `POST /api/patients/enroll` | `{ patient }` | Welcome message |
| `visit:recorded` | `POST /api/admin/packages/:id/visits` | `{ visit, package }` | Milestone (every 5th visit) |
| `package:completed` | Visit recording (auto) | `{ package, patient }` | Completion message |
| `appointment:no-show` | `PATCH /api/admin/appointments/:id` | `{ appointment, patient }` | No-show follow-up |

## Notification Workflows

### Workflow Files

| File | Type | Trigger |
|------|------|---------|
| `server/src/services/workflows/welcome-message.js` | Event | `patient:enrolled` |
| `server/src/services/workflows/appointment-reminder.js` | Cron | Hourly — appointments within next 24h |
| `server/src/services/workflows/no-show-followup.js` | Event | `appointment:no-show` |
| `server/src/services/workflows/package-milestone.js` | Event | `visit:recorded` (every 5th visit) |
| `server/src/services/workflows/package-completion.js` | Event | `package:completed` |
| `server/src/services/workflows/inactive-patient.js` | Cron | Daily 10 AM — active package, no visit in 30+ days |

### Workflow Engine

**File:** `server/src/services/workflows/engine.js`

Registers all event listeners and cron jobs on server startup:
```js
// Called from server/src/index.js
registerWorkflows();
// → Listens to EventBus events
// → Schedules cron jobs via node-cron
```

### 1. Welcome Message

- **Trigger:** `patient:enrolled` event
- **Dedup:** Only one welcome per patient (checks existing Notification records)
- **Template vars:** `{{name}}`

### 2. Appointment Reminder

- **Trigger:** Cron (hourly)
- **Logic:** Find appointments in next 24h where `reminderSent = false`
- **Dedup:** Sets `appointment.reminderSent = true` after sending
- **Template vars:** `{{name}}`, `{{serviceType}}`, `{{date}}`, `{{time}}`

### 3. No-Show Follow-up

- **Trigger:** `appointment:no-show` event
- **Logic:** Sends follow-up offering to reschedule
- **Template vars:** `{{name}}`, `{{serviceType}}`, `{{date}}`, `{{time}}`

### 4. Package Milestone

- **Trigger:** `visit:recorded` event
- **Logic:** Only sends on every 5th visit (visitNumber % 5 === 0)
- **Template vars:** `{{name}}`, `{{visitNumber}}`, `{{totalSessions}}`, `{{packageName}}`

### 5. Package Completion

- **Trigger:** `package:completed` event
- **Logic:** Sends congratulations + renewal prompt
- **Template vars:** `{{name}}`, `{{packageName}}`, `{{totalSessions}}`

### 6. Re-engagement (Inactive Patient)

- **Trigger:** Cron (daily at 10 AM)
- **Logic:** Active package with no visit in 30+ days
- **Dedup:** Max one per patient per 30-day window
- **Template vars:** `{{name}}`

## Message Templates

**File:** `server/src/services/notifications/templates.js`

Each type has multiple message variants. `renderTemplate(type, variables)` picks a random variant and substitutes `{{variable}}` placeholders.

## WhatsApp Sender

**File:** `server/src/services/notifications/whatsapp.js`

```js
async function sendWhatsApp({ patientId, toNumber, type, messageContent, templateName, metadata }) {
  // 1. Check patient.whatsappConsent
  // 2. Create pending Notification record
  // 3. If WHATSAPP_ENABLED=true → send via Twilio
  //    If WHATSAPP_ENABLED=false → log only (dry-run)
  // 4. Update Notification with sent/failed status, twilioSid
}
```

### Mobile Number Formatting

```js
// Formats Indian mobile to WhatsApp format
// Input: "9900911795" → Output: "whatsapp:+919900911795"
const formatted = `whatsapp:${WHATSAPP_COUNTRY_CODE}${mobile}`;
```

## Key Files

| File | Purpose |
|------|---------|
| `server/src/lib/events.js` | EventBus (global EventEmitter) |
| `server/src/services/notifications/whatsapp.js` | `sendWhatsApp()` — Twilio integration |
| `server/src/services/notifications/templates.js` | Message templates with variable substitution |
| `server/src/services/workflows/engine.js` | Registers all listeners + cron jobs |
| `server/src/services/workflows/welcome-message.js` | Welcome workflow |
| `server/src/services/workflows/appointment-reminder.js` | Reminder cron |
| `server/src/services/workflows/no-show-followup.js` | No-show workflow |
| `server/src/services/workflows/package-milestone.js` | Milestone workflow |
| `server/src/services/workflows/package-completion.js` | Completion workflow |
| `server/src/services/workflows/inactive-patient.js` | Re-engagement cron |
| `server/src/routes/notifications.js` | Admin notification list + retry |
| `client/src/pages/admin/Notifications.jsx` | Admin notification history page |
| `client/src/lib/api.js` | `getNotifications()`, `retryNotification()` |

## Operations

### Adding a New Notification Type

1. Create workflow file in `server/src/services/workflows/`
2. Add message template(s) in `server/src/services/notifications/templates.js`
3. Register the workflow in `server/src/services/workflows/engine.js`
4. If event-driven: emit the event from the relevant route handler using `EventBus.safeEmit()`
5. If cron-based: add `node-cron` schedule in the engine

### Testing Notifications (Dry-Run)

Set `WHATSAPP_ENABLED=false` in `.env`. Messages are logged to console instead of sent via Twilio. Notification records are still created in the database with `status: "sent"`.

### Twilio Production Upgrade

From sandbox to production:
1. Buy Twilio virtual number (~$1-2/month)
2. Register as WhatsApp sender: Console → Messaging → WhatsApp Senders → Self Sign-up
3. Complete Meta Business Verification (PAN/GSTIN, 2-7 days)
4. Create message templates in Content Template Builder (approved in 24-48h)
5. Update `TWILIO_WHATSAPP_FROM` in production `.env`

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio account identifier |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_WHATSAPP_FROM` | Sender number (e.g., `whatsapp:+14155238886`) |
| `WHATSAPP_COUNTRY_CODE` | Country code for formatting (default: `+91`) |
| `WHATSAPP_ENABLED` | `true` = live, `false` = dry-run |

## Business Rules

- **Patient consent required** — checks `patient.whatsappConsent` before sending
- **Deduplication** — each workflow has its own dedup logic (see individual workflows)
- **Non-blocking** — notification failures never block the triggering operation
- **Retry** — failed notifications can be retried from the admin panel
- **Audit trail** — every message attempt is recorded in the Notification table
- **Rate awareness** — Twilio sandbox only delivers to opted-in numbers

## Common Issues

**Messages not sending** — Check `WHATSAPP_ENABLED=true` in `.env`. If `false`, messages are only logged.

**"Twilio credentials invalid"** — Verify `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` in `.env`.

**Duplicate messages** — Each workflow has dedup checks. If duplicates appear, check the dedup logic in the specific workflow file.

**Sandbox limitations** — Twilio sandbox only sends to numbers that have sent the join code. For production, complete WhatsApp Business verification.

## Related Skills

- [Patient Management](../patient-management/SKILL.md) — `patient:enrolled` event source
- [Treatment Packages](../treatment-packages/SKILL.md) — `visit:recorded` and `package:completed` events
- [Appointment Booking](../appointment-booking/SKILL.md) — `appointment:no-show` event, reminder cron
- [SMS Notifications](../sms-notifications/SKILL.md) — Parallel SMS channel via Fast2SMS
- [Deployment](../deployment/SKILL.md) — Twilio environment variables on VPS
