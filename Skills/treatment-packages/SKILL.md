# Treatment Packages

Use this skill whenever you need to work on treatment package lifecycle, visit tracking, session counting, package completion, or the TreatmentPackage/PatientVisit data models.

## Architecture

| Page | Route | File |
|------|-------|------|
| Packages Modal | `/admin/patients` (modal) | `client/src/pages/admin/Patients.jsx` |
| Package Receipt | `/admin/packages/:id/receipt` | `client/src/pages/admin/PackageReceipt.jsx` |
| Dashboard Stats | `/admin/dashboard` | `client/src/pages/admin/Dashboard.jsx` |

| API Route File | Endpoints |
|----------------|-----------|
| `server/src/routes/packages.js` | Package CRUD + visit recording |
| `server/src/routes/payments.js` | Package creation (via payment) |

## Prisma Models

```prisma
model TreatmentPackage {
  id            String         @id @default(cuid())
  patientId     String
  patient       Patient        @relation(fields: [patientId], references: [id])
  paymentId     String         @unique
  payment       Payment        @relation(fields: [paymentId], references: [id])
  packageName   String                    // e.g., "10-Day Physiotherapy Package"
  totalSessions Int                       // e.g., 10
  startDate     DateTime       @default(now())
  expiryDate    DateTime?                 // optional validity window
  status        String         @default("active")  // active | completed | expired
  notes         String?
  visits        PatientVisit[]
  appointments  Appointment[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@map("treatment_packages")
}

model PatientVisit {
  id             String           @id @default(cuid())
  packageId      String
  package        TreatmentPackage @relation(fields: [packageId], references: [id])
  visitDate      DateTime         @default(now())
  visitNumber    Int                       // 1, 2, 3, ... auto-incremented per package
  treatmentNotes String?
  markedBy       String?                   // staff name or "Auto (appointment completed)"
  createdAt      DateTime         @default(now())

  @@map("patient_visits")
}
```

## API Endpoints

**GET `/api/admin/packages?patientId={id}`** [Protected] — List patient packages
```
Response: [{
  id, packageName, totalSessions, startDate, expiryDate, status, notes,
  _count: { visits },
  visits: [{ id, visitDate, visitNumber, treatmentNotes, markedBy }],
  payment: { id, receiptNo, totalAmount, paymentMode, services }
}]
```
- Sorted: active first, then completed, then expired
- Auto-checks expiry: if `expiryDate < now` and `status = active`, updates to `expired`

**GET `/api/admin/packages/:id`** [Protected] — Package details
```
Response: { ...package, visits[], patient: { id, fullName }, payment: { receiptNo, totalAmount, services } }
```

**PATCH `/api/admin/packages/:id`** [Protected] — Update package
```
Request:  { status?, notes?, expiryDate?, packageName? }
Response: { ...updatedPackage }
```

**POST `/api/admin/packages/:id/visits`** [Protected] — Record a visit
```
Request:  { visitDate?: string, treatmentNotes?: string }
Response: { ...visit, package: { status, _count: { visits } } }
```
- Auto-increments `visitNumber` (max existing + 1)
- If this visit completes all sessions → auto-sets package `status: "completed"`
- Emits `visit:recorded` event → triggers milestone notification (every 5th visit)
- Emits `package:completed` event on final session → triggers completion notification

**DELETE `/api/admin/packages/:id/visits/:visitId`** [Protected] — Remove a visit
```
Response: { message: "Visit deleted" }
```
- Re-numbers remaining visits sequentially
- If package was `completed` and visit is deleted → reverts status to `active`

## Key Files

| File | Purpose |
|------|---------|
| `server/src/routes/packages.js` | Package queries + visit recording/deletion |
| `server/src/routes/payments.js` | Package creation (atomic with payment) |
| `client/src/pages/admin/Patients.jsx` | Packages & Visits modal (primary UI) |
| `client/src/pages/admin/PackageReceipt.jsx` | Package receipt / tax invoice view |
| `client/src/lib/api.js` | `getPatientPackages()`, `getPackageDetails()`, `updatePackage()`, `recordVisit()`, `deleteVisit()` |
| `server/src/lib/events.js` | EventBus for `visit:recorded` and `package:completed` |

## Operations

### Creating a Package (via Patients Page Modal)

1. Admin opens `/admin/patients` → clicks Pkg Status badge or "Visits" action
2. Modal opens → clicks "New Package"
3. Fills form:
   - **Service/Treatment** dropdown (Physiotherapy, Consultation, etc.)
   - **Package Type** preset (5-Session, 10-Session, 15-Session, Monthly Unlimited, Custom)
   - **Total Sessions** (auto-filled from preset, editable)
   - **Enrollment Date** (defaults to today)
   - **Expiry Date** (optional)
   - **Discount** (flat ₹ amount, optional)
   - **Payment Mode** (Cash, UPI, Card, Bank Transfer, Cheque)
4. Price breakdown shows: `sessions × ₹600 - discount = total`
5. Submit → calls `POST /api/payments` with `isPackage: true`
6. Backend creates Payment + TreatmentPackage atomically via `prisma.$transaction()`

**There is no `POST /api/admin/packages`** — packages are always created through the payment route.

### Recording a Visit

1. Admin opens Packages modal for a patient
2. Expands the active package card
3. Clicks "Mark Visit" → inline form: date + treatment notes
4. Confirms → `POST /api/admin/packages/:id/visits`
5. Visit number auto-increments, progress bar updates
6. On final session: package auto-completes, completion notification sent

### Auto-Visit on Appointment Completion

When an appointment is marked `completed` in the admin panel:
1. System finds the patient's active package
2. Creates a `PatientVisit` with `markedBy: "Auto (appointment completed)"`
3. Triggers milestone/completion events as normal
4. If no active package exists, appointment completes without visit side-effect

### Package Status Lifecycle

```
active → completed    (all sessions used, auto-triggered on final visit)
active → expired      (expiryDate passed, auto-checked on access)
completed → active    (if visit deleted, reverting visit count below total)
expired → active      (manual override via PATCH)
```

### Dashboard Integration

The admin dashboard shows:
- **Active Packages** stat card — count of `status: "active"`
- **Visits Today** stat card — visits where `visitDate = today`
- **Packages Needing Attention** table — packages with ≤2 sessions remaining

### Patients Table Integration

The admin patients table shows a **Pkg Status** column:
- Green badge: `Active (4/10)` — shows progress
- Blue badge: `Completed`
- Red badge: `Expired (3/10)` — expired with unused sessions
- Grey text: `No package`
- Multiple active: `2 active`

Clicking the badge opens the Packages & Visits modal.

## Business Rules

- A patient can have **multiple packages** (one completed, one active, etc.)
- A single payment creates **at most one** package (one-to-one via `paymentId @unique`)
- Visits cannot exceed `totalSessions` — auto-completes on final visit
- Visit numbers are sequential **per package** (not global)
- Only admin/staff can record or delete visits
- Package inherits patient and amount from its linked Payment — no duplicate data
- **Per-session cost**: ₹600 (constant `PER_SESSION_COST` in Patients.jsx)
- Package presets: 5-Session, 10-Session, 15-Session, Monthly Unlimited (30), Custom
- Expiry is checked on access — if `expiryDate < now` and `status = active`, auto-updates to `expired`

## Common Issues

**"Cannot record visit — package completed"** — All sessions have been used. Create a new package for continued treatment.

**Visit count mismatch after deletion** — Visit numbers are re-sequenced after deletion. This is expected behavior.

**Package not appearing after payment** — Ensure `isPackage: true` was sent in the payment request. Check the payment's `package` relation.

## Related Skills

- [Payment & Billing](../payment-billing/SKILL.md) — Package creation via `POST /api/payments`
- [Patient Management](../patient-management/SKILL.md) — Patient → Package relationship
- [Appointment Booking](../appointment-booking/SKILL.md) — Auto-visit on appointment completion
- [WhatsApp Notifications](../whatsapp-notifications/SKILL.md) — `visit:recorded` and `package:completed` events
- [Auth & Admin](../auth-and-admin/SKILL.md) — Dashboard stats (active packages, visits today)
