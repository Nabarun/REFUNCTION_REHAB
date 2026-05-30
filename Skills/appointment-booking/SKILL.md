# Appointment Booking

Use this skill whenever you need to work on the patient booking flow, appointment management, slot generation, cancellation/rescheduling, quick-register, admin scheduling, or the Appointment data model.

## Architecture

| Page | Route | File |
|------|-------|------|
| Patient Booking | `/book` | `client/src/pages/Book.jsx` |
| Admin Appointments | `/admin/appointments` | `client/src/pages/admin/Appointments.jsx` |
| Admin Calendar | `/admin/calendar` | (alias for `/admin/appointments`) |

| API Route File | Endpoints |
|----------------|-----------|
| `server/src/routes/appointments.js` | Booking, lookup, quick-register, admin management |

## Prisma Model

```prisma
model Appointment {
  id                String            @id @default(cuid())
  patientId         String
  patient           Patient           @relation(fields: [patientId], references: [id])
  packageId         String?
  package           TreatmentPackage? @relation(fields: [packageId], references: [id])
  appointmentDate   DateTime
  startTime         String            // "HH:mm" (24-hour)
  endTime           String            // "HH:mm"
  serviceType       String            // "Physiotherapy", "Consultation", etc.
  sessionType       String  @default("In-Person")  // In-Person | Online | Home Visit
  status            String  @default("booked")      // booked | completed | cancelled | no-show
  notes             String?
  cancellationReason String?
  cancelledAt       DateTime?
  reminderSent      Boolean @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([patientId, appointmentDate, startTime])
  @@map("appointments")
}
```

## API Endpoints

### Public (Patient-Facing)

**GET `/api/appointments/slots?date=YYYY-MM-DD`** — Available time slots
```
Response: {
  date: string,
  blocked: boolean,
  blockReason?: string,
  slots: [{
    startTime: string,     // "09:00"
    endTime: string,       // "09:45"
    capacity: number,      // maxPatients for this slot
    booked: number,        // current bookings
    available: number,     // capacity - booked
    label?: string,        // "Morning Session"
    sessionType: string    // "In-Person"
  }]
}
```

**POST `/api/appointments/lookup`** — Patient lookup for booking
```
Request:  { q: string }          // Patient ID or mobile (min 3 chars)
Response: { id, fullName, mobile, program, sessionType, registrationStatus }
```

**POST `/api/appointments/quick-register`** — Inline quick registration
```
Request:  { fullName: string, mobile: string, gender: string, age: number }
Response: { id: "RF-0123", fullName, mobile, registrationStatus: "quick" }
```
- Rate limited: 5 req/min per IP
- If mobile already exists → returns existing patient (idempotent)
- Creates patient with `registrationStatus: "quick"`, minimal data

**POST `/api/appointments`** — Book appointment
```
Request: {
  patientId: string,
  packageId?: string,          // link to active treatment package
  appointmentDate: string,     // "YYYY-MM-DD"
  startTime: string,           // "09:00"
  endTime: string,             // "09:45"
  serviceType: string,
  sessionType?: string,        // default "In-Person"
  notes?: string
}
Response: { id, patientId, appointmentDate, startTime, endTime, status: "booked" }
```
- Validates: slot exists, not at capacity, patient doesn't have this slot, date is future
- Concurrency: database unique constraint prevents double-booking

**PATCH `/api/appointments/:id/cancel`** — Cancel appointment
```
Request:  { patientId: string, reason?: string }
Response: { ...appointment, status: "cancelled" }
```
- Must be ≥4 hours before appointment start
- Sets `cancelledAt` timestamp and `cancellationReason`

### Admin (Protected)

**GET `/api/appointments`** [Protected] — List all appointments
```
Query:    page=1, limit=20, status=, search=, patientId=, from=, to=
Response: {
  appointments: [{ ...appointment, patient: { id, fullName, mobile } }],
  total, page, totalPages
}
```

**GET `/api/appointments/today`** [Protected] — Today's schedule
```
Response: [{
  ...appointment,
  patient: { id, fullName, mobile }
}]
```
- Sorted by startTime ascending

**PATCH `/api/appointments/:id`** [Protected] — Update appointment status
```
Request:  { status: string, notes?: string, cancellationReason?: string }
Response: { ...updatedAppointment }
```
- When `status: "completed"`:
  1. Finds patient's active package
  2. Auto-creates a visit (`markedBy: "Auto (appointment completed)"`)
  3. Emits `visit:recorded` event (triggers milestone notification)
  4. If final session, auto-completes package + emits `package:completed`
- When `status: "no-show"`:
  - Emits `appointment:no-show` event (triggers follow-up notification)

## Key Files

| File | Purpose |
|------|---------|
| `server/src/routes/appointments.js` | All booking + admin appointment endpoints |
| `client/src/pages/Book.jsx` | Patient booking flow (5 steps) |
| `client/src/pages/admin/Appointments.jsx` | Admin appointment management |
| `client/src/lib/api.js` | `getAvailableSlots()`, `lookupPatient()`, `quickRegister()`, `createAppointment()`, `cancelAppointment()`, `getAdminAppointments()`, `updateAppointment()`, `getTodaysSchedule()` |

## Operations

### Patient Booking Flow (5 Steps)

**Step 0 — Patient Identification:**
- Search by Patient ID or mobile number
- "New patient? Register here" link always visible → opens quick-register form
- If `?patientId=XXX` in URL → auto-lookup, skip to Step 1
- If `?admin=1` → show "Back to Patients" link (admin booking shortcut)

**Step 1 — Select Service:**
- Radio cards: Physiotherapy, General Health, Kids Exercise, Post-Surgery, Sports Injury, Elderly Care
- Session type: In-Person / Online / Home Visit
- Pre-fills from patient's enrollment data

**Step 2 — Pick Date:**
- Calendar widget (month view)
- Past dates greyed out
- Clicking a date fetches available slots

**Step 3 — Pick Time Slot:**
- Slot grid below calendar
- Color-coded: green (available), amber (1 spot), grey (full/disabled)
- Shows time range, availability count, batch label

**Step 4 — Confirm:**
- Summary card: Patient, Service, Date, Time, Session Type
- Optional notes field
- Confirm button → `POST /api/appointments`

### Slot Generation Algorithm

Slots are computed at request time (not pre-generated):

```
1. Get DoctorAvailability for the date's dayOfWeek (where isActive = true)
2. Check SlotOverrides for the specific date:
   - Entire day blocked → return empty with blockReason
   - Specific slots blocked → exclude those time ranges
3. Generate time slots from availability windows using slotDuration
   Example: 09:00–13:00 with 45min → [09:00-09:45, 09:45-10:30, 10:30-11:15, 11:15-12:00, 12:00-12:45]
4. For each slot, count Appointments where status != 'cancelled'
5. available = maxPatients - booked
6. Return slots with capacity info
```

### Admin Booking (On Behalf of Patient)

Staff can book for patients from the admin Patients table:
1. Click "Book" action on a patient row
2. Links to `/book?patientId={id}&admin=1`
3. Patient auto-looked up, skip to service selection
4. Same flow as patient booking — uses same `POST /api/appointments` endpoint

### Auto-Visit on Appointment Completion

When admin marks appointment as `completed`:
1. Previous status must NOT already be `completed` (prevents double-counting)
2. Finds patient's active package (prefers linked `packageId`, else most recent active)
3. Creates `PatientVisit` with `markedBy: "Auto (appointment completed)"`
4. Emits `visit:recorded` → milestone notification on every 5th visit
5. If final session → auto-completes package, emits `package:completed`
6. If no active package → appointment completes with no visit side-effect
7. If auto-visit fails → appointment update still succeeds (non-blocking)

## Business Rules

- **Enrolled patients only** — must have Patient ID to book (quick-register provides this)
- **Booking window** — up to 30 days in advance, minimum 2 hours before slot start
- **Cancellation** — ≥4 hours before appointment start time
- **No-show tracking** — staff marks `no-show`, triggers WhatsApp follow-up
- **One slot per patient** — unique constraint on `[patientId, appointmentDate, startTime]`
- **Slot capacity** — bookings rejected when `booked >= maxPatients`
- **Walk-ins** — staff can book for current time slot from admin
- **Rescheduling** — cancel + re-book (cancellation opens the old slot)
- **Quick-register** — 4 fields only (name, mobile, gender, age), `registrationStatus: "quick"`
- **Concurrency** — database unique constraint handles simultaneous last-slot bookings

## Common Issues

**"Slot no longer available"** — Another patient booked the last slot. Concurrency is handled by the database constraint; the second booking fails gracefully.

**"Cannot cancel — less than 4 hours"** — Cancellation window has passed. Patient must call the clinic.

**No slots for a date** — Check availability blocks and slot overrides. See [Availability & Scheduling](../availability-scheduling/SKILL.md).

**Quick-register "mobile already exists"** — Returns the existing patient instead of erroring (idempotent behavior).

## Related Skills

- [Availability & Scheduling](../availability-scheduling/SKILL.md) — Availability blocks and overrides used for slot generation
- [Patient Management](../patient-management/SKILL.md) — Patient lookup, quick-register creates minimal patient
- [Treatment Packages](../treatment-packages/SKILL.md) — Auto-visit on appointment completion
- [WhatsApp Notifications](../whatsapp-notifications/SKILL.md) — Appointment reminders, no-show follow-ups
