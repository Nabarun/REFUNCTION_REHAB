# Patient Management

Use this skill whenever you need to work on patient enrollment, patient search, profile editing, patient list/filters, CSV export, or the Patient data model.

## Architecture

| Page | Route | File |
|------|-------|------|
| Enrollment Form | `/enroll` | `client/src/pages/Enroll.jsx` |
| Admin Patient List | `/admin/patients` | `client/src/pages/admin/Patients.jsx` |
| Edit Patient | `/admin/patients/:id/edit` | `client/src/pages/admin/EditPatient.jsx` |

| API Route File | Endpoints |
|----------------|-----------|
| `server/src/routes/patients.js` | Enroll, search, get, update |
| `server/src/routes/admin.js` | Admin patient list, export |

## Prisma Model

```prisma
model Patient {
  id                String    @id              // RF-XXXX format (sequential via patient_serial_seq)
  fullName          String
  dob               DateTime?
  age               Int
  gender            String
  bloodGroup        String?
  mobile            String    @unique
  alternateMobile   String?
  email             String?
  address           String?
  city              String?
  state             String?
  pinCode           String?
  emergencyName     String?
  emergencyPhone    String?
  emergencyRelation String?
  program           String[]                   // ["Physiotherapy", "General Health & Fitness", ...]
  sessionType       String                     // "In-Person" | "Online" | "Home Visit"
  preferredDays     String[]                   // ["Monday", "Wednesday", ...]
  preferredTime     String                     // "Morning 6-9AM" | "Mid-Morning 9-12" | etc.
  medicalConditions String?
  pastSurgeries     String?
  medications       String?
  allergies         String?
  conditions        String[]                   // ["Diabetes", "Hypertension", ...]
  painAreas         String[]                   // ["Neck", "Shoulder", "Back", ...]
  painDuration      String?
  painSeverity      Int?                       // 1-10
  fitnessGoals      String[]
  fitnessLevel      String?                    // "Beginner" | "Intermediate" | "Advanced"
  referralSource    String?
  insuranceProvider String?
  insurancePolicy   String?
  paymentPreference String?
  consentGiven      Boolean   @default(false)
  signature         String?                    // base64 e-signature
  registrationStatus String  @default("full")  // "full" | "quick"
  enrolledAt        DateTime  @default(now())
  whatsappConsent   Boolean   @default(true)
  payments          Payment[]
  packages          TreatmentPackage[]
  appointments      Appointment[]
  notifications     Notification[]

  @@map("patients")
}
```

## API Endpoints

### Public

**POST `/api/patients/enroll`** — Full enrollment
```
Request:  { fullName, age, gender, mobile, sessionType, preferredTime,
            consentGiven, enrolledAt?, dob?, bloodGroup?, alternateMobile?,
            email?, address?, city?, state?, pinCode?, emergencyName?,
            emergencyPhone?, emergencyRelation?, program[], preferredDays[],
            medicalConditions?, pastSurgeries?, medications?, allergies?,
            conditions[], painAreas[], painDuration?, painSeverity?,
            fitnessGoals[], fitnessLevel?, referralSource?,
            insuranceProvider?, insurancePolicy?, paymentPreference?,
            signature? }
Response: { id: "RF-0042", fullName, message: "Patient enrolled successfully" }
```
- Generates sequential ID: RF-0001, RF-0002, ... via `patient_serial_seq` PostgreSQL sequence
- Emits `patient:enrolled` event (triggers WhatsApp welcome message)
- `enrolledAt` defaults to now but can be set for backdating paper registrations

**GET `/api/patients/search?q=`** — Search patients
```
Query:    q=<name|mobile|patientId> (min 1 char)
Response: [{ id, fullName, mobile, email, program, sessionType, enrolledAt }]
```
- Searches by name (case-insensitive contains), mobile (contains), or patient ID (contains)
- Returns max 20 results

**GET `/api/patients/:id`** — Get patient details
```
Response: { ...patient, payments[], packages[] }
```
- Includes related payments and packages

**PATCH `/api/patients/:id`** [Protected] — Update patient
```
Request:  { ...fieldsToUpdate }
Response: { ...updatedPatient }
```

### Admin

**GET `/api/admin/patients`** [Protected] — Paginated patient list
```
Query:    page=1, limit=20, search=, program=, from=, to=
Response: {
  patients: [{
    id, fullName, age, gender, mobile, program, sessionType,
    enrolledAt, registrationStatus,
    _count: { payments },
    packages: [{ id, status, totalSessions, _count: { visits } }]
  }],
  total, page, totalPages
}
```

**GET `/api/admin/patients/export`** [Protected] — CSV export
```
Response: CSV file download (all patients)
```

## Key Files

| File | Purpose |
|------|---------|
| `server/src/routes/patients.js` | Enrollment, search, get, update endpoints |
| `server/src/routes/admin.js` | Admin patient list + export |
| `client/src/pages/Enroll.jsx` | Multi-step enrollment form |
| `client/src/pages/admin/Patients.jsx` | Admin patient list with search, filters, package modal |
| `client/src/pages/admin/EditPatient.jsx` | Patient detail edit form |
| `client/src/lib/api.js` | `enrollPatient()`, `getPatient()`, `searchPatients()`, `updatePatient()`, `getAdminPatients()`, `exportPatients()` |

## Operations

### Adding a New Field to Patient

1. Add field to `Patient` model in `server/prisma/schema.prisma`
2. Create migration (see [Database Migrations](../database-migrations/SKILL.md))
3. Update `POST /api/patients/enroll` in `server/src/routes/patients.js` to accept/store the field
4. Update enrollment form in `client/src/pages/Enroll.jsx`
5. Update admin patient list if field should be displayed
6. Update `client/src/lib/api.js` → `enrollPatient()` params if needed

### Enrollment Form Sections

The form is a multi-step wizard with these sections:

1. **Personal Information** — Name*, Age*, Gender*, DOB, Blood Group, Enrollment Date
2. **Contact Information** — Mobile*, Alternate Mobile, Email, Pin Code, Address, City, State
3. **Emergency Contact** — Name, Number, Relationship (all optional)
4. **Program Selection** — Program type* (checkboxes), Session Type*, Preferred Days*, Preferred Time*
5. **Medical History** — Conditions, surgeries, medications, allergies
6. **Physiotherapy Details** — Pain areas, duration, severity, previous treatment
7. **Kids Program** — Shown conditionally when Kids Exercise is selected
8. **Goals & Discovery** — Fitness goals, fitness level, referral source
9. **Insurance & Payment** — Insurance details, payment preference
10. **Consent** — 4 checkboxes + e-signature canvas

### Patient ID Generation

Patient IDs follow the format `RF-XXXX` (e.g., RF-0001, RF-0042). Generated via PostgreSQL sequence:

```sql
-- Created by migration
CREATE SEQUENCE patient_serial_seq START 1;
```

```js
// In enrollment handler
const result = await prisma.$queryRaw`SELECT nextval('patient_serial_seq')`;
const seq = Number(result[0].nextval);
const patientId = `RF-${String(seq).padStart(4, '0')}`;
```

## Business Rules

- **Enrollment and payment are independent** — enrollment creates a Patient record without requiring payment
- **Mobile number is unique** — duplicate mobile numbers are rejected
- **Consent is required** — `consentGiven` must be `true` for enrollment to succeed
- **Quick-registered patients** (`registrationStatus: "quick"`) have minimal data — created via booking page inline form with only name, mobile, gender, age
- **Patient ID is permanent** — once assigned, RF-XXXX never changes
- **Enrolled-but-unpaid tracking** — patients with zero payments are considered "pending payment" on the dashboard
- **WhatsApp consent** — `whatsappConsent` defaults to `true`, controls whether notifications are sent
- **Enrollment date backdating** — `enrolledAt` can be set to a past date for paper registration digitization

## Common Issues

**"Mobile number already exists"** — A patient with this mobile is already enrolled. Search for them instead.

**Patient ID sequence gaps** — Expected behavior if enrollments fail after sequence increment. IDs don't need to be contiguous.

**Quick-registered patients showing incomplete data** — These patients only provided 4 fields. Staff should complete the profile during the first visit.

## Related Skills

- [Payment & Billing](../payment-billing/SKILL.md) — Patient → Payment relationship
- [Treatment Packages](../treatment-packages/SKILL.md) — Patient → Package relationship
- [Appointment Booking](../appointment-booking/SKILL.md) — Patient lookup for booking, quick-register
- [WhatsApp Notifications](../whatsapp-notifications/SKILL.md) — `patient:enrolled` event triggers welcome message
