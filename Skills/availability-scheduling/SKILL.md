# Availability & Scheduling

Use this skill whenever you need to work on doctor weekly schedule configuration, slot duration settings, slot overrides (holidays, blocked times), or the DoctorAvailability/SlotOverride data models.

## Architecture

| Page | Route | File |
|------|-------|------|
| Availability Management | `/admin/availability` | `client/src/pages/admin/Availability.jsx` |

| API Route File | Endpoints |
|----------------|-----------|
| `server/src/routes/availability.js` | Availability CRUD + slot overrides |

## Prisma Models

```prisma
model DoctorAvailability {
  id           String   @id @default(cuid())
  dayOfWeek    Int                       // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime    String                    // "HH:mm" (24-hour format, e.g., "09:00")
  endTime      String                    // "HH:mm" (e.g., "13:00")
  slotDuration Int      @default(45)     // minutes per slot
  maxPatients  Int      @default(1)      // concurrent patients (>1 for group/batch sessions)
  sessionType  String   @default("In-Person")  // In-Person | Online | Home Visit
  label        String?                   // e.g., "Morning Batch", "Women's Health"
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("doctor_availability")
}

model SlotOverride {
  id        String   @id @default(cuid())
  date      DateTime                     // specific date this override applies to
  startTime String?                      // null + isBlocked=true → entire day blocked
  endTime   String?
  isBlocked Boolean  @default(true)      // true = unavailable
  reason    String?                      // "Public Holiday", "Doctor on leave"
  createdAt DateTime @default(now())

  @@map("slot_overrides")
}
```

## API Endpoints

### Availability Blocks (Admin, Protected)

**GET `/api/admin/availability`** — List all availability blocks
```
Response: [{ id, dayOfWeek, startTime, endTime, slotDuration, maxPatients, sessionType, label, isActive }]
```

**POST `/api/admin/availability`** — Create availability block
```
Request: {
  dayOfWeek: number,       // 0-6 (Sun-Sat)
  startTime: string,       // "09:00"
  endTime: string,         // "13:00"
  slotDuration?: number,   // default 45
  maxPatients?: number,    // default 1
  sessionType?: string,    // default "In-Person"
  label?: string
}
Response: { ...availabilityBlock }
```

**PATCH `/api/admin/availability/:id`** — Update block
```
Request:  { dayOfWeek?, startTime?, endTime?, slotDuration?, maxPatients?, sessionType?, label?, isActive? }
Response: { ...updatedBlock }
```

**DELETE `/api/admin/availability/:id`** — Delete block
```
Response: { message: "Deleted" }
```

### Slot Overrides (Admin, Protected)

**GET `/api/admin/availability/overrides`** — List overrides
```
Query:    from=YYYY-MM-DD, to=YYYY-MM-DD (defaults to next 30 days)
Response: [{ id, date, startTime, endTime, isBlocked, reason }]
```

**POST `/api/admin/availability/overrides`** — Create override
```
Request: {
  date: string,            // "2026-03-15"
  startTime?: string,      // null → entire day override
  endTime?: string,
  isBlocked?: boolean,     // default true
  reason?: string
}
Response: { ...override }
```
- If `startTime` is null and `isBlocked: true` → blocks the entire day
- If `startTime`/`endTime` provided → blocks only that time range

**DELETE `/api/admin/availability/overrides/:id`** — Remove override
```
Response: { message: "Deleted" }
```

## Key Files

| File | Purpose |
|------|---------|
| `server/src/routes/availability.js` | Availability CRUD + override CRUD |
| `client/src/pages/admin/Availability.jsx` | Weekly schedule view + override management |
| `client/src/lib/api.js` | `getAvailability()`, `createAvailability()`, `updateAvailability()`, `deleteAvailability()`, `getSlotOverrides()`, `createSlotOverride()`, `deleteSlotOverride()` |

## Operations

### Setting Up Weekly Schedule

1. Navigate to `/admin/availability`
2. Add availability blocks per day:
   - Select day of week (Monday–Sunday)
   - Set start/end times (e.g., 09:00–13:00)
   - Set slot duration (30/45/60 min)
   - Set max patients per slot (1 for individual, >1 for group batches)
   - Optional: session type, label
3. Toggle blocks active/inactive without deleting

### Recommended Configuration

| Block | Days | Hours | Duration | Max Patients | Label |
|-------|------|-------|----------|-------------|-------|
| Morning OPD | Mon–Sat | 09:00–13:00 | 45 min | 1 | Morning Session |
| Afternoon OPD | Mon–Sat | 14:00–18:00 | 45 min | 1 | Afternoon Session |
| Follow-up | Mon, Wed, Fri | 18:00–19:00 | 30 min | 1 | Quick Follow-up |
| Women's Health | Saturday | 19:00–20:00 | 60 min | 8 | Women's Health Batch |
| Online Consult | Tue, Thu | 18:00–19:30 | 30 min | 1 | Online Consultation |

### Blocking a Day (Holiday/Leave)

1. Go to Availability → Slot Overrides section
2. Select the date
3. Leave start/end times empty
4. Set `isBlocked: true`
5. Add reason: "Public Holiday" or "Doctor on leave"
6. Save → that day shows as blocked in the booking calendar

### Blocking a Specific Time Range

1. Select the date
2. Set `startTime` and `endTime` (e.g., 14:00–16:00)
3. Set `isBlocked: true`
4. Add reason
5. Save → only those slots are blocked, rest of the day remains available

### Slot Duration Guide

| Duration | Use Case | Patients/4hrs |
|----------|----------|---------------|
| 30 min | Follow-ups, quick reviews | 8 |
| 45 min | Standard therapy sessions (recommended) | 5 |
| 60 min | Initial evaluations, complex cases | 4 |

45 minutes is the recommended default — covers assessment, treatment, and exercise guidance with a 15-minute buffer.

## Business Rules

- Slot duration is **fully configurable per availability block** — different blocks can have different durations
- Multiple blocks can exist for the same day (e.g., morning + afternoon)
- `maxPatients > 1` enables group/batch sessions (e.g., Women's Health batch with 8 patients)
- Inactive blocks (`isActive: false`) are ignored during slot generation but preserved for re-activation
- Overrides take precedence over regular availability — a blocked date overrides all blocks for that day
- Slot-level overrides only block the specified time range, not the entire day
- The `/api/appointments/slots` endpoint reads availability + overrides to compute available slots at request time (see [Appointment Booking](../appointment-booking/SKILL.md))

## Common Issues

**No slots showing for a date** — Check: (1) Is there an active availability block for that day of week? (2) Is there a slot override blocking that date?

**Group session capacity wrong** — Check `maxPatients` on the availability block. Default is 1 (individual sessions).

**Slots not updating after availability change** — Slots are computed at request time, not pre-generated. Changes take effect immediately for future bookings.

## Related Skills

- [Appointment Booking](../appointment-booking/SKILL.md) — Slot generation uses availability + overrides
- [Auth & Admin](../auth-and-admin/SKILL.md) — Availability page is protected behind JWT
- [Database Migrations](../database-migrations/SKILL.md) — DoctorAvailability and SlotOverride models
