# Payment & Billing

Use this skill whenever you need to work on payment recording, receipt generation, GST calculation, fee breakdown, payment modes, or the Payment data model.

## Architecture

| Page | Route | File |
|------|-------|------|
| Payment Collection | `/payment` | `client/src/pages/Payment.jsx` |
| Admin Payments | `/admin/payments` | `client/src/pages/admin/Payments.jsx` |
| Package Receipt | `/admin/packages/:id/receipt` | `client/src/pages/admin/PackageReceipt.jsx` |

| API Route File | Endpoints |
|----------------|-----------|
| `server/src/routes/payments.js` | Record payment, get payment, patient payments |
| `server/src/routes/admin.js` | Admin payment list, export |

## Prisma Model

```prisma
model Payment {
  id               String   @id @default(cuid())
  receiptNo        String   @unique              // Format: RFR-YYMM-XXXX (e.g., RFR-2601-0042)
  patientId        String
  patient          Patient  @relation(fields: [patientId], references: [id])
  sessionNo        Int?
  sessionDate      DateTime @default(now())
  sessionDuration  String?
  services         Json                          // [{description, qty, unitRate, discount, amount}]
  subTotal         Float
  gst              Float    @default(0)
  totalAmount      Float
  amountPaid       Float
  balanceDue       Float    @default(0)
  advancePaid      Float    @default(0)
  paymentMode      String                        // cash|upi|netbanking|card|cheque|insurance|emi
  paymentDate      DateTime @default(now())
  transactionId    String?
  paymentDetails   Json?                         // Mode-specific details
  status           String   @default("paid")     // paid|partial|pending|advance|refund|waived
  remarks          String?
  collectedBy      String   @default("Staff")
  staffSignature   String?
  patientSignature String?
  authorisedBy     String?
  createdAt        DateTime @default(now())
  package          TreatmentPackage?              // Optional 1:1 — payment may create a package

  @@map("payments")
}
```

## API Endpoints

**POST `/api/payments`** [Protected] — Record payment
```
Request: {
  patientId: string,           // required: RF-XXXX
  sessionNo?: number,
  sessionDate?: string,        // ISO date, defaults to now
  sessionDuration?: string,
  services: [{                 // required: array of line items
    description: string,
    qty: number,
    unitRate: number,
    discount: number,
    amount: number
  }],
  subTotal: number,
  gst?: number,                // defaults to 0
  totalAmount: number,
  amountPaid: number,
  balanceDue?: number,
  advancePaid?: number,
  paymentMode: string,         // required
  paymentDate?: string,
  transactionId?: string,
  paymentDetails?: object,     // mode-specific (UPI ID, card last 4, etc.)
  status?: string,             // defaults to "paid"
  remarks?: string,
  collectedBy?: string,        // defaults to "Staff"
  authorisedBy?: string,
  // Package fields (optional):
  isPackage?: boolean,         // true → creates TreatmentPackage atomically
  packageName?: string,
  totalSessions?: number,
  expiryDate?: string,
  packageNotes?: string
}
Response: { id, receiptNo, patientId, totalAmount, status, package? }
```
- When `isPackage: true`, creates both Payment and TreatmentPackage in a `prisma.$transaction()`
- Receipt number auto-generated: `RFR-YYMM-XXXX`

**GET `/api/payments/:id`** — Get payment by ID
```
Response: { ...payment, patient: { id, fullName, mobile } }
```

**GET `/api/payments/patient/:patientId`** — All payments for a patient
```
Response: [{ ...payment }] ordered by createdAt desc
```

### Admin Endpoints

**GET `/api/admin/payments`** [Protected] — Paginated payment list
```
Query:    page=1, limit=20, status=, mode=, from=, to=
Response: {
  payments: [{ ...payment, patient: { id, fullName } }],
  total, page, totalPages,
  summary: { totalCollected, totalPending, totalCharged }
}
```

**GET `/api/admin/payments/export`** [Protected] — CSV export
```
Response: CSV file download (all payments)
```

## Key Files

| File | Purpose |
|------|---------|
| `server/src/routes/payments.js` | Payment CRUD with package transaction |
| `server/src/routes/admin.js` | Admin payment list + summary + export |
| `client/src/pages/Payment.jsx` | Payment collection form |
| `client/src/pages/admin/Payments.jsx` | Admin payment records table |
| `client/src/pages/admin/PackageReceipt.jsx` | Package receipt / tax invoice |
| `client/src/lib/api.js` | `recordPayment()`, `getPayment()`, `getPatientPayments()`, `getAdminPayments()`, `exportPayments()` |

## Operations

### Recording a Per-Session Payment

1. Staff opens `/payment`
2. Searches patient by ID or mobile number
3. Fills service details: service type, qty, unit rate (default ₹600), discount
4. Selects payment mode → dynamic form section appears
5. Reviews fee breakdown (sub total, GST, total)
6. Clicks "Save Record" → `POST /api/payments`

### Recording a Package Payment

Package payments are created via the Packages & Visits modal on `/admin/patients` — **not** on the `/payment` page. The modal calls `POST /api/payments` with `isPackage: true`. See [Treatment Packages](../treatment-packages/SKILL.md).

### Receipt Number Format

```
RFR-YYMM-XXXX
 │    │    └── Sequential counter within month
 │    └─────── Year-Month (e.g., 2601 = Jan 2026)
 └──────────── ReFunction Rehab prefix
```

### Payment Modes

Each mode has a dynamic form section with mode-specific fields:

| Mode | Additional Fields |
|------|-------------------|
| **Cash** | Amount received, change, received by |
| **UPI** | Transaction ID, app (GPay/PhonePe/Paytm), UPI ID, date & time |
| **Net Banking** | Bank name, transaction/ref ID, account holder, date & time |
| **Credit/Debit Card** | Card type, last 4 digits, bank, approval code |
| **Cheque** | Cheque number, bank name, date, drawn in favour of |
| **Insurance/EMI** | Provider, policy/claim number, pre-auth code, EMI plan/tenure |

These details are stored in `paymentDetails` JSON field.

### Fee Breakdown

```
Service Description | Qty | Unit Rate (₹) | Discount (₹) | Amount (₹)
─────────────────────────────────────────────────────────────────────
Physiotherapy Session|  1  |     600       |      0       |    600
─────────────────────────────────────────────────────────────────────
                                              Sub Total:    ₹600
                                              GST (if any): ₹0
                                              Package Disc: -₹0
                                              ─────────────────────
                                              TOTAL:        ₹600
```

Default rate: **₹600 per session** (defined as `PER_SESSION_COST` constant).

### Receipt Format

```
REFUNCTION REHAB — PAYMENT RECEIPT
Receipt No. | Date | Patient Name | Patient ID
Doctor/Therapist | Session No. | Amount Paid ₹___
Payment Mode | Transaction ID
Services Rendered table
Patient Signature | Staff Signature | Stamp
"Thank you for your payment! Wishing you a speedy recovery."
```

## Business Rules

- **Payment is independent of enrollment** — patients pay separately, can have zero or many payments
- **Per-session billing only on `/payment`** — package creation happens via admin Patients modal
- **Atomic package creation** — when `isPackage: true`, Payment + TreatmentPackage are created in a single `prisma.$transaction()`
- **Receipt number is unique and immutable** — auto-generated, never editable
- **Status values**: `paid` (full), `partial` (some amount due), `pending` (not yet paid), `advance` (pre-payment), `refund`, `waived`
- **Pending payment tracking** — dashboard counts both patients with zero payments AND payments in `partial`/`pending` status
- **GST is optional** — defaults to 0, can be set per payment
- **Discount** — flat amount deducted from subtotal, auto-appended to remarks for audit

## Common Issues

**"Patient not found" when recording payment** — Patient must be enrolled first. Search by RF-XXXX ID or mobile number.

**Receipt number collision** — Should not happen with proper sequential generation. If it does, check the receipt counter logic.

**Package not created** — Ensure `isPackage: true` is sent in the request body along with `packageName` and `totalSessions`.

## Related Skills

- [Patient Management](../patient-management/SKILL.md) — Patient lookup for payment
- [Treatment Packages](../treatment-packages/SKILL.md) — Package creation via payment
- [Auth & Admin](../auth-and-admin/SKILL.md) — Dashboard revenue stats
- [Deployment](../deployment/SKILL.md) — Razorpay environment variables
