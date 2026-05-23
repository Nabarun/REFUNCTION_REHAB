---
name: refunction-rehab-website
description: Build the full React + backend website/app for ReFunction Rehab physiotherapy center run by Dr. Neha Trivedi. Use this skill whenever the user wants to create, update, or extend any part of the ReFunction Rehab website — including the homepage, services pages, patient enrollment form, payment collection, contact features, doctor dashboard, database persistence, or any React component or backend route for this clinic. Triggers on any mention of ReFunction Rehab, Dr. Neha Trivedi's clinic website, physiotherapy center app, patient portal, doctor dashboard, or any feature described in this skill.
---

# ReFunction Rehab — Website & App Build Skill

A complete spec for building the full-stack website and patient management app for **ReFunction Rehab**, a physiotherapy and health exercise center led by Dr. Neha Trivedi.

---

## 1. Brand Identity

| Field | Value |
|---|---|
| **Clinic Name** | ReFunction Rehab |
| **Tagline** | Move Better. Feel Better. Live Better. |
| **Sub-taglines** | "Better Movement. Better Health. Better Life." / "Heal. Strengthen. Feel confident in your body again." |
| **Lead Doctor** | Dr. Neha Trivedi, PT, MPT |
| **Specialization** | Musculoskeletal & Sports Injury Specialist; trained in Prenatal & Postnatal Pilates |
| **Experience** | 15+ Years |
| **Phone** | 99009 11795 |
| **WhatsApp** | 99009 11795 |
| **Patient Enrollment** | Direct in-app multi-step form (Google Form removed) |

### Color Palette
```css
:root {
  --brand-navy:    #1B2F5E;   /* primary dark navy */
  --brand-teal:    #1A7F8E;   /* teal/cyan accent */
  --brand-orange:  #E8630A;   /* warm orange CTA */
  --brand-gold:    #F5A623;   /* gold highlight */
  --brand-green:   #4CAF50;   /* success / check marks */
  --brand-light:   #F0F6FA;   /* off-white background */
  --brand-white:   #FFFFFF;
  --brand-text:    #1A1A2E;   /* dark text */
  --brand-muted:   #6B7280;   /* secondary text */
}
```

### Typography
- **Display / Headings**: `Playfair Display` (Google Fonts) — authoritative, medical-professional feel
- **Body / UI**: `DM Sans` (Google Fonts) — clean, modern legibility
- **Accent numbers / stats**: `Oswald` — bold impact for "15+ Years", phone numbers

### Logo Usage
- Text logo: **Re**Function Rehab (with "Re" in teal `#1A7F8E`, "Function Rehab" in navy `#1B2F5E`)
- Icon: Stylized running/movement figure (SVG inline, matches brand images)

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| **Frontend** | React 18 + Vite |
| **Styling** | Tailwind CSS + custom CSS variables |
| **Routing** | React Router v6 |
| **Forms** | React Hook Form + Zod validation |
| **Animations** | Framer Motion |
| **Icons** | Lucide React |
| **Backend** | Node.js + Express |
| **Database** | PostgreSQL 16 — pulled from Docker Hub (`postgres:16-alpine`), no local install needed |
| **ORM** | Prisma ORM — schema-first, type-safe DB access |
| **Container Orchestration** | Docker Compose (local dev) — single `docker-compose up` starts everything |
| **Payments** | Razorpay (UPI, cards, net banking, EMI) |
| **Email** | Nodemailer (SMTP / SendGrid) |
| **File Storage** | Cloudinary (for patient documents) |
| **Auth** | JWT + bcrypt (staff/admin login) |

### Database via Docker (No Local Installation Required)

**CRITICAL RULE**: PostgreSQL must NEVER require a manual local installation. It is always run via Docker using the official image from Docker Hub. This makes the project work identically on any developer machine or cloud VM.

**`docker-compose.yml`** (at project root):
```yaml
version: '3.9'

services:
  db:
    image: postgres:16-alpine
    container_name: refunction_db
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER:-refunction}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-rehab_secret}
      POSTGRES_DB: ${DB_NAME:-refunction_rehab}
    ports:
      - "${DB_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-refunction}"]
      interval: 10s
      timeout: 5s
      retries: 5

  server:
    build: ./server
    container_name: refunction_server
    restart: always
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://${DB_USER:-refunction}:${DB_PASSWORD:-rehab_secret}@db:5432/${DB_NAME:-refunction_rehab}
      JWT_SECRET: ${JWT_SECRET}
      RAZORPAY_KEY_ID: ${RAZORPAY_KEY_ID}
      RAZORPAY_KEY_SECRET: ${RAZORPAY_KEY_SECRET}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      CLOUDINARY_URL: ${CLOUDINARY_URL}
      PORT: 4000
    ports:
      - "4000:4000"

  client:
    build: ./client
    container_name: refunction_client
    restart: always
    depends_on:
      - server
    ports:
      - "80:80"

volumes:
  postgres_data:
```

**`server/Dockerfile`**:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node index.js"]
```

**`client/Dockerfile`** (production):
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**`client/nginx.conf`**:
```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://server:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

**`.env.example`** (at project root — copy to `.env` and fill in secrets):
```env
# Database (used by Docker Compose)
DB_USER=refunction
DB_PASSWORD=rehab_secret
DB_NAME=refunction_rehab
DB_PORT=5432

# Set automatically by Docker Compose for the server container
DATABASE_URL=postgresql://refunction:rehab_secret@db:5432/refunction_rehab

# Auth
JWT_SECRET=change_this_to_a_long_random_secret

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Email
SMTP_HOST=
SMTP_USER=
SMTP_PASS=

# Cloudinary
CLOUDINARY_URL=
```

**One-command startup (local dev)**:
```bash
cp .env.example .env        # fill in secrets
docker compose up --build   # pulls postgres:16-alpine, builds server + client, runs migrations
```

**Prisma workflow inside Docker**:
- `npx prisma migrate deploy` runs automatically on server container start (via CMD in Dockerfile)
- To run migrations manually during dev: `docker compose exec server npx prisma migrate dev`
- To open Prisma Studio: `docker compose exec server npx prisma studio`

### Cloud Deployment

The same `docker-compose.yml` works on any cloud VM (AWS EC2, GCP Compute Engine, DigitalOcean Droplet, etc.) without modification:

```bash
# On any cloud VM with Docker installed:
git clone <repo>
cd refunction-rehab
cp .env.example .env   # set production secrets
docker compose up -d   # runs in background, postgres data persists in named volume
```

**Managed cloud DB option** (recommended for production):
For platforms like Railway, Render, AWS RDS, Supabase, or Neon — simply override `DATABASE_URL` in the environment and remove the `db` service from `docker-compose.yml`. The server and client containers remain identical.

```env
# Example: Using Supabase / Neon / Railway Postgres
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
```

Prisma handles both local Docker Postgres and managed cloud Postgres identically — no code changes required.

### Data Persistence Rules (CRITICAL)
- Every patient enrollment form submission MUST be saved to the `Patient` table via `POST /api/patients/enroll`.
- Every payment recorded MUST be saved to the `Payment` table via `POST /api/payments`.
- Every contact form submission MUST be saved to the `ContactInquiry` table via `POST /api/contact`.
- PostgreSQL data persists across container restarts via the `postgres_data` named Docker volume.
- The frontend must call real API endpoints — **no `console.log` placeholders** in production code.
- On enrollment success, return the generated Patient ID to the frontend and display it to the user.
- **Enrollment and payment are independent operations.** Enrollment creates a `Patient` record without requiring any payment. Payments are linked to patients via `patientId` but are created as separate records at any time after enrollment. A patient may have zero, one, or many associated payments.
- **Pending payment tracking must include enrolled-but-unpaid patients.** A patient who has enrolled but has zero `Payment` records is considered to have a pending payment. The dashboard's "Pending Payments" count and the admin patients table must account for these patients — not only patients with a `Payment` record in `partial` or `pending` status.

---

## 3. Site Architecture

```
/                          → Home (Hero + Services overview)
/services                  → All services listing
/services/seniors          → Physiotherapy for Seniors
/services/womens-health    → Women's Health (postnatal, pelvic floor)
/services/pain-management  → Neck, Back & Shoulder Pain
/services/sports-rehab     → Sports Injury Rehab
/services/post-surgery     → Post-Surgery Rehab
/services/kids             → Kids Exercise & Development
/about                     → About Dr. Neha + Clinic
/enroll                    → Patient Enrollment Form (saves to DB)
/book                      → Book an Appointment (patient-facing: select service → date → time slot → confirm)
/payment                   → Payment Collection Page (saves to DB)
/contact                   → Contact + Location (saves to DB)
/testimonials              → All patient testimonials (public)
/admin                     → Doctor/Admin Dashboard (protected, JWT auth)
/admin/patients            → Full paginated patient list with search & filters
/admin/payments            → Full paginated payment records with revenue summary
/admin/dashboard           → Overview: total enrolled, today's sessions, revenue stats
/admin/testimonials        → Manage testimonials (add, edit, approve, delete)
/admin/availability        → Doctor Availability Management (weekly schedule, slot overrides)
/admin/calendar            → Appointment Calendar View (weekly timeline, manage daily appointments)
```

---

## 4. Page-by-Page Specifications

### 4.1 Homepage (`/`)

**Hero Section**
- Full-width, navy-to-teal gradient background
- Headline: "Specialized Physiotherapy Care in [City]"
- Sub-headline: "Better Movement. Better Health. Better Life."
- Two CTAs: `[Book Appointment]` (orange) and `[Learn More]` (outlined white)
- Animated entrance (Framer Motion: staggered fade-up)

**Services Strip** — 6 cards in a horizontal scroll / grid:
1. 🧓 Physiotherapy for Seniors
2. 👩 Women's Health & Postnatal
3. 💪 Back, Neck & Shoulder Pain
4. ⚽ Sports Injury Rehab
5. 🧒 Kids Exercise Program
6. 🦴 Post-Surgery Rehab

**Why Choose Us** — 4 icon stats in a teal band:
- 15+ Years Experience
- Safe • Supervised • Personalized • Effective
- Dedicated Space & Advanced Equipment
- Patient Privacy • Billing Available

**Conditions We Treat** (from Image 4):
Back Pain & Neck Pain, Postural Correction, SI Joint Pain, Fracture Rehabilitation, Sports Injuries, Orthopedic Conditions, Neurological Conditions, Arthritis, Osteoporosis

**Feature Blocks Layout** — Two-column grid (`lg:grid-cols-2`) with `items-start`. The text column uses `lg:sticky lg:top-24` so it stays visible as users scroll past the tall portrait images. Info cards (Exercise Journey, Treats, Results) are placed in the text column alongside the heading and description to fill the space.

**Senior Care Feature Block** (from Image 1):
- Headline: "Physiotherapy for Seniors"
- Sub: "Specialized Care for Pain Relief, Mobility & Better Independence"
- We Help Manage: Neck & Joint Pain, Shoulder Pain, Arthritis, Osteoporosis & Low Bone Density
- Exercise Journey card (navy bg): Neck Stretch → Shoulder Mobility → Knee Strengthening → Balance Training
- Image on left, text + journey card on right (sticky)

**Women's Health Feature Block** (from Image 2 & 5):
- Headline: "Post-Pregnancy Belly Not Reducing?"
- Wrong vs Right approach (crunches vs breathing + core activation)
- Treats card (gradient bg): Diastasis Recti, Back Pain, Pelvic Floor Weakness, Postnatal Recovery, Prenatal Fitness
- 7PM–8PM Batch — Few Spots Available
- Text + treats card on left (sticky), image on right

**Pain Management Feature Block** (from Image 3):
- Headline: "Still Struggling with Back Pain, Neck Pain, or Shoulder Pain?"
- Specialized Assessment & Supervised Exercise
- Results We Deliver card: Chronic Neck Pain, Chronic Back Pain, Knee Replacements (TKR), Improved Flexibility, Better Quality of Life
- Image on left, text + results card on right (sticky)

**Patient Testimonials Section** (between Feature Blocks and CTA Banner):
- Heading: "What Our Patients Say"
- Auto-scrolling carousel of 3–4 featured testimonials
- Each card: star rating, quote, patient name/initials, condition, outcome
- "View All Testimonials →" link to `/testimonials`
- Data: `GET /api/testimonials?featured=true`

**CTA Banner**:
> "Take the First Step Towards a Pain-Free & Active Life!"
> Our experts are here to guide you at every step of your recovery and fitness journey.
> `[Call Us Today: 99009 11795]` `[Book Appointment →]`

**Footer**:
- Logo + tagline
- Quick links (all pages)
- Contact: phone, WhatsApp button
- Social media icons (Instagram, Facebook, YouTube — placeholders)
- © 2025 ReFunction Rehab. All rights reserved.

---

### 4.2 Patient Enrollment Form (`/enroll`)

Custom multi-step React form (Google Form removed). Goes directly to the registration form — no mode selection screen.

**Section 1 — Personal Information**
- Full Name*, Age*, Gender*
- Date of Birth (optional), Nationality (optional), Occupation (optional)
- Blood Group (A+/A-/B+/B-/AB+/AB-/O+/O-)
- Enrollment Date (optional, defaults to today — allows backdating for paper registrations)

**Section 2 — Contact Information**
- Mobile Number*, Alternate Mobile
- Email Address, Pin Code
- Home Address (optional), City (optional), State (optional)

**Section 3 — Emergency Contact** (all optional)
- Emergency Contact Name, Number, Relationship

**Section 4 — Program Selection**
- Type of Program* (checkboxes: Physiotherapy, General Health & Fitness, Kids Exercise, Post-Surgery Rehab, Sports Injury, Elderly Care, Other)
- Session Type*: In-Person / Online / Home Visit
- Preferred Days* (Mon–Sun checkboxes)
- Preferred Time*: Morning 6–9AM / Mid-Morning 9–12 / Afternoon 12–3 / Evening 3–6 / Late Evening 6–9PM

**Section 5 — Medical History**
- Existing conditions? (Yes/No + specify)
- Past surgeries? (Yes/No + details)
- Current medications? (Yes/No + list)
- Known allergies? (Yes/No + specify)
- Conditions checklist: Diabetes, Hypertension, Heart Disease, Arthritis, Osteoporosis, Asthma, Neurological Disorder, None

**Section 6 — Physiotherapy Details**
- Area of pain: Neck, Shoulder, Back, Hip, Knee, Ankle, Wrist, Elbow, Other
- Duration: <1 week / 1–4 weeks / 1–3 months / 3–6 months / >6 months
- Pain Severity: Slider 1–10
- Previous physiotherapy? (Yes/No + describe)
- Doctor's referral? (Yes/No)

**Section 7 — Kids Program** (shown conditionally)
- Child's Name, Age, Grade
- Parent/Guardian Name*, Contact*
- Special needs, dietary restrictions, prior sports activity

**Section 8 — Goals & Discovery**
- Health goals: Pain Relief, Improved Mobility, Weight Management, Strength Building, Post-Surgery Recovery, Stress Relief, General Fitness, Kids Physical Development, Other
- Fitness Level: Beginner / Intermediate / Advanced
- How did you hear about us: Social Media / Friend/Family / Doctor Referral / Online Search / Advertisement / Other

**Section 9 — Insurance & Payment**
- Health insurance? (Yes/No + provider + policy number)
- Preferred payment: Cash / Credit/Debit Card / UPI / Net Banking / Insurance Claim

**Section 10 — Consent**
- 4 checkboxes with declaration text (all mandatory to submit)
- Patient/Guardian Signature (canvas-based e-signature component)
- Submit button → POST to `/api/patients/enroll`

On success: show confirmation card with two CTAs:
- **"Book Your First Appointment"** (primary, orange) — links to `/book?patientId={id}`, auto-fills patient lookup and skips to service selection
- **"Back to Home"** (outlined) — returns to homepage

> **Enroll → Book Flow**: After enrollment, the primary CTA guides the patient directly into the booking flow. The `/book` page reads the `patientId` query parameter, auto-looks up the patient record, and skips the lookup step — taking the patient straight to service selection. This creates a seamless enrollment-to-booking experience without requiring the patient to re-enter their ID.

> **Enroll Now, Pay Later**: Payment is **not** mandatory at enrollment time. Patients receive their Patient ID immediately upon successful enrollment. Payment can be made at any later time via the `/payment` page by searching with Patient ID or mobile number. Staff can also record payments later from the admin dashboard (`/admin/payments`).

---

### 4.3 Payment Collection Page (`/payment`)

> **Per-session billing only**: This page handles individual session payments. It does **not** have a package creation toggle — package creation is done exclusively via the Packages & Visits modal on the Patients page (see Section 16.3).

> **Independent of Enrollment**: The payment page operates independently and is accessible at any time — not only immediately after enrollment. Staff can open `/payment` directly, look up any existing patient by Patient ID or mobile number, and record a payment. This makes deferred "pay later" workflows seamless. Multiple payments over time for the same patient are fully supported (session-wise billing), since the `Patient → Payment` relationship is one-to-many.

Based on the Patient Payment Collection Form PDF:

**Section 1 — Patient Lookup**
- Search by Patient ID or Mobile Number
- Auto-fill: Patient Name, Doctor/Therapist Name, Session Number, Department

**Section 2 — Service Details**
- Session Visit Number, Session Date, Duration
- Service type checkboxes: Initial Consultation, Follow-up, Physiotherapy Session, Exercise Training, Kids Exercise, Post-Surgery Rehab, Sports Injury, Elderly Care, Home Visit, Group Session, Online Session, Other
- Fee Breakdown table: Service Description | Qty | Unit Rate (₹) | Discount (₹) | Amount (₹)
- Default rate: ₹600 per session
- Sub Total, GST (if applicable), Package Discount (if applicable, shown in green), **TOTAL AMOUNT PAYABLE** (large, bold)

**Section 3 — Payment Mode**
Dynamic form sections (show/hide based on selection):

- **Cash**: Amount Received, Change, Received By
- **UPI** (Razorpay QR or manual): Transaction ID, App (GPay/PhonePe/Paytm/Other), UPI ID, Date & Time
- **Net Banking**: Bank Name, Transaction/Reference ID, Account Holder, Date & Time
- **Credit/Debit Card** (Razorpay): Card Type, Last 4 Digits, Bank, Approval Code
- **Cheque**: Cheque Number, Bank Name, Date, Drawn in Favour Of
- **Insurance/EMI**: Provider, Policy/Claim Number, Pre-Auth Code, EMI Plan/Tenure

**Section 4 — Payment Summary**
- Total Charged, Amount Paid, Balance Due, Advance Paid
- Status: Paid in Full / Partial / Pending / Advance / Refund / Waived Off
- Remarks / Notes

**Section 5 — Authorization**
- Collected By (Staff Name), Staff Signature (e-sign), Staff ID
- Patient/Guardian Signature (e-sign)
- Authorised By (Doctor/Manager)

**Actions**:
- `[Generate Receipt]` → PDF receipt download (matching the payment receipt format from PDF)
- `[Send to Patient]` → Email/WhatsApp the receipt
- `[Save Record]` → POST to `/api/payments`

**Receipt Format** (auto-generated PDF):
```
REFUNCTION REHAB — PAYMENT RECEIPT
Receipt No. | Date | Patient Name | Patient ID
Doctor/Therapist | Session No. | Amount Paid ₹___
Payment Mode | Transaction ID
Services Rendered table
Patient Signature | Staff Signature | Stamp
"Thank you for your payment! Wishing you a speedy recovery."
```

---

### 4.4 Contact Page (`/contact`)

- Clinic address (to be filled — placeholder: Bengaluru, Karnataka)
- Phone: 99009 11795 (click-to-call)
- WhatsApp: 99009 11795 (wa.me link)
- Embedded Google Map iframe
- Quick contact form: Name, Phone, Message → POST to `/api/contact`
- Business hours (placeholder: Mon–Sat 6AM–9PM)
- Batch timing prominently: **7PM–8PM Batch** — Few Spots Available

---

## 5. Backend API Routes

All routes that write data MUST persist to PostgreSQL via Prisma. No in-memory or mock storage.

```
# Patient Enrollment
POST   /api/patients/enroll         → Save to Patient table, return { patientId, message }, send confirmation email
GET    /api/patients/:id            → Get patient by ID (with payment history)
GET    /api/patients/search?q=      → Search by name / phone / patient ID
PATCH  /api/patients/:id            → Update patient details (implemented, requires auth)

# Payments
POST   /api/payments                → Save to Payment table, return { paymentId, receiptNo }
                                      Optional package fields: isPackage, packageName, totalSessions, expiryDate, packageNotes
                                      When isPackage=true, atomically creates Payment + TreatmentPackage via $transaction()
GET    /api/payments/:id            → Get payment record by ID
GET    /api/payments/receipt/:id    → Generate and return PDF receipt
GET    /api/payments/patient/:id    → All payments for a specific patient

# Packages & Visits (all protected — require valid JWT)
GET    /api/admin/packages?patientId={id} → List all packages for a patient (with visit counts & visits)
GET    /api/admin/packages/:id            → Get package details with all visits, patient, and payment info
PATCH  /api/admin/packages/:id            → Update package (status, notes, expiryDate, packageName)
POST   /api/admin/packages/:id/visits     → Record a visit (auto-increments visitNumber, auto-completes on last session)
DELETE /api/admin/packages/:id/visits/:visitId → Remove a visit (re-numbers remaining, reverts completed→active)

# Contact Inquiries
POST   /api/contact                 → Save to ContactInquiry table, notify admin via email

# Auth
POST   /api/auth/login              → Validate staff credentials → return JWT token
POST   /api/auth/logout             → Invalidate session

# Doctor / Admin Dashboard (all protected — require valid JWT)
GET    /api/admin/dashboard         → Query params: ?month=0-11&year=YYYY (optional, defaults to current month)
                                      Response: {
                                        totalPatients,
                                        newPatientsToday,
                                        newPatientsThisMonth,
                                        totalRevenue,
                                        revenueToday,
                                        revenueThisMonth,
                                        selectedMonth, selectedYear,
                                        pendingPayments,
                                        recentEnrollments[],
                                        recentPayments[],
                                        paymentModeBreakdown{},
                                        activePackages,
                                        visitsToday,
                                        attentionPackages[]
                                      }
GET    /api/admin/patients          → Paginated patient list (page, limit, search, program filter, date range)
GET    /api/admin/payments          → Paginated payment records (page, limit, status filter, date range)
GET    /api/admin/patients/export   → CSV export of all patients
GET    /api/admin/payments/export   → CSV export of all payments

# Testimonials
GET    /api/testimonials            → Get all approved testimonials (public, no auth)
GET    /api/testimonials/:id        → Get single testimonial by ID (public)
POST   /api/admin/testimonials      → Create new testimonial (protected)
PATCH  /api/admin/testimonials/:id  → Update testimonial (edit, approve/reject) (protected)
DELETE /api/admin/testimonials/:id  → Delete testimonial (protected)

# Available Slots (public — patients see doctor availability)
GET    /api/slots?date=YYYY-MM-DD           → Get available time slots for a specific date
GET    /api/slots/calendar?from=&to=        → Date-level availability summary for calendar widget

# Appointments (patient-facing)
POST   /api/appointments                    → Book an appointment (validates slot availability + capacity)
GET    /api/appointments?patientId={id}     → List patient's appointments (upcoming + past)
GET    /api/appointments/:id                → Get appointment details
PATCH  /api/appointments/:id/cancel         → Cancel appointment (≥4 hours before)
PATCH  /api/appointments/:id/reschedule     → Reschedule to a new slot

# Appointments (admin, protected)
GET    /api/admin/appointments              → List all appointments (paginated, filterable)
GET    /api/admin/appointments/today        → Today's schedule
PATCH  /api/admin/appointments/:id          → Update status (confirm, complete, no-show)
GET    /api/admin/appointments/stats        → Appointment statistics

# Doctor Availability (admin, protected)
GET    /api/admin/availability              → List all availability blocks
POST   /api/admin/availability              → Create availability block
PATCH  /api/admin/availability/:id          → Update availability block
DELETE /api/admin/availability/:id          → Delete availability block

# Slot Overrides (admin, protected)
GET    /api/admin/slot-overrides            → List overrides (next 30 days)
POST   /api/admin/slot-overrides            → Create override (block day/slot, adjust capacity)
DELETE /api/admin/slot-overrides/:id        → Remove override
```

---

## 6. Database Schema (Prisma)

```prisma
model Patient {
  id                String    @id              // Sequential RF-XXXX format (e.g. RF-0001, RF-0002) generated via patient_serial_seq
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
  program           String[]
  sessionType       String
  preferredDays     String[]
  preferredTime     String
  medicalConditions String?
  pastSurgeries     String?
  medications       String?
  allergies         String?
  conditions        String[]
  painAreas         String[]
  painDuration      String?
  painSeverity      Int?
  fitnessGoals      String[]
  fitnessLevel      String?
  referralSource    String?
  insuranceProvider String?
  insurancePolicy   String?
  paymentPreference String?
  consentGiven      Boolean   @default(false)
  signature         String?   // base64 or URL
  enrolledAt        DateTime  @default(now())
  payments          Payment[]
  packages          TreatmentPackage[]
  appointments      Appointment[]
}

model Payment {
  id               String   @id @default(cuid())
  receiptNo        String   @unique @default(cuid())
  patientId        String
  patient          Patient  @relation(fields: [patientId], references: [id])
  sessionNo        Int?
  sessionDate      DateTime
  sessionDuration  String?
  services         Json     // array of {description, qty, unitRate, discount, amount}
  subTotal         Float
  gst              Float    @default(0)
  totalAmount      Float
  amountPaid       Float
  balanceDue       Float    @default(0)
  advancePaid      Float    @default(0)
  paymentMode      String   // cash/upi/netbanking/card/cheque/insurance/emi
  transactionId    String?
  paymentDetails   Json?    // mode-specific details
  status           String   // paid/partial/pending/advance/refund/waived
  remarks          String?
  collectedBy      String
  staffSignature   String?
  patientSignature String?
  authorisedBy     String?
  createdAt        DateTime @default(now())
  package          TreatmentPackage?   // optional one-to-one: a payment may create a package
}

model ContactInquiry {
  id        String   @id @default(cuid())
  name      String
  phone     String
  message   String
  createdAt DateTime @default(now())
  resolved  Boolean  @default(false)
}

model Testimonial {
  id            String   @id @default(cuid())
  patientName   String                          // Display name (can be first name only for privacy)
  patientInitials String?                       // e.g. "R.K." — used if patient prefers anonymity
  age           Int?
  gender        String?
  condition     String                          // e.g. "Chronic Back Pain", "Post-Knee Replacement"
  service       String                          // Which service: seniors, womens-health, pain-management, sports-rehab, post-surgery, kids
  rating        Int      @default(5)            // 1–5 star rating
  reviewText    String                          // The testimonial content
  videoUrl      String?                         // Optional YouTube/video link
  photoUrl      String?                         // Optional patient photo (with consent)
  treatmentDuration String?                     // e.g. "3 months", "6 weeks"
  outcome       String?                         // Brief result: "Pain-free in 8 weeks", "Walking independently"
  isApproved    Boolean  @default(false)        // Only approved testimonials shown publicly
  isFeatured    Boolean  @default(false)        // Featured testimonials shown on homepage
  consentGiven  Boolean  @default(true)         // Patient consent for public display
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

---

## 7. UI Component Library (Key Custom Components)

| Component | Purpose |
|---|---|
| `<ServiceCard />` | Icon + title + short desc + CTA |
| `<ConditionBadge />` | Pill badge for conditions treated |
| `<StatStrip />` | "15+ Years • Supervised • Personalized" teal banner |
| `<ExerciseJourney />` | Step-by-step exercise flow (Neck→Shoulder→Knee→Balance) |
| `<WrongRight />` | Side-by-side Wrong ❌ vs Right ✅ comparison |
| `<PaymentModeForm />` | Dynamic form switching by payment mode |
| `<ESignaturePad />` | Canvas-based e-signature (react-signature-canvas) |
| `<FeeTable />` | Editable fee breakdown table |
| `<ReceiptPDF />` | react-pdf based receipt generator |
| `<CTABanner />` | Full-width navy CTA with phone number |
| `<BatchBadge />` | "7PM–8PM Batch • Few Spots Available" urgency badge |
| `<WhatsAppButton />` | Floating WhatsApp CTA (bottom-right, always visible) |
| `<TestimonialCard />` | Patient testimonial card with rating stars, quote, condition, and outcome |
| `<TestimonialCarousel />` | Auto-scrolling carousel of featured testimonials for homepage |

---

## 8. Design Rules

1. **Navy + Teal + Orange** are the three core colors — every page must use all three meaningfully.
2. All CTA buttons: orange `#E8630A` with white text, rounded-full, hover scale-105.
3. Section alternation: white bg → light blue `#F0F6FA` → navy → repeat.
4. Cards: white, rounded-2xl, subtle shadow, hover lift (translateY -4px).
5. All icons from **Lucide React** — never use emoji as UI icons.
6. Mobile-first responsive — clinic patients may be elderly; font-size minimum 16px body, 14px labels.
7. Floating WhatsApp button always visible on mobile and desktop.
8. Form validation errors: red border + inline message below field.
9. Page transitions: Framer Motion `AnimatePresence` fade.
10. Loading states: skeleton loaders (not spinners) for data-fetching sections.

---

## 9. Services Content

### Physiotherapy for Seniors (`/services/seniors`)
- **Tagline**: Better Movement. Better Health. Better Life.
- **Image**: `images.seniors` (pic-1.jpeg)
- **Manages**: Neck & Joint Pain, Shoulder Pain, Arthritis, Osteoporosis & Low Bone Density
- **Journey**: Initial Assessment → Neck Stretches → Shoulder Mobility → Knee Strengthening → Balance Training
- **Highlights**: Gentle age-tailored exercises, continuous vitals monitoring, fall prevention programs, home exercise plans
- **Session Info**: 45–60 min, 3–5 sessions/week, In-clinic & Home visits

### Women's Health & Postnatal (`/services/womens-health`)
- **Tagline**: Heal. Strengthen. Feel confident in your body again.
- **Image**: `images.womensHealth` (pic-4.jpeg)
- **Target**: Diastasis Recti, Pelvic Floor Weakness, Back Pain During Pregnancy, Postnatal Recovery, Incontinence
- **Journey**: Core & Pelvic Assessment → Breathing Techniques → Core Activation → Progressive Loading → Full Functional Training
- **Highlights**: Certified prenatal & postnatal Pilates, safe trimester-specific exercises, pelvic floor recovery, small group batches
- **Session Info**: 60 min, 3 sessions/week, In-clinic (7PM–8PM batch)
- **Batch**: 7PM–8PM | Limited spots

### Back, Neck & Shoulder Pain (`/services/pain-management`)
- **Tagline**: Stop Just Relieving the Pain — Treat the Cause.
- **Image**: `images.painManagement` (pic-2.jpeg)
- **Conditions**: Chronic Back Pain, Cervical Spondylosis, Shoulder Impingement, SI Joint Pain, Disc Herniation, Postural Dysfunction
- **Journey**: Specialized Assessment → Pain Education → Manual Therapy → Exercise Prescription → Functional Return
- **Highlights**: Root-cause analysis, hands-on manual therapy + exercise, posture correction and ergonomic guidance, long-term prevention strategies
- **Session Info**: 45–60 min, 3–5 sessions/week, In-clinic

### Sports Injury Rehab (`/services/sports-rehab`)
- **Tagline**: Back to the Game, Stronger Than Before.
- **Image**: `images.clinic` (pic-3.jpeg)
- **Conditions**: ACL Reconstruction, Knee Replacement (TKR), Fracture Rehabilitation, Shoulder Surgery Recovery, Ankle Sprains, Muscle Tears
- **Approach**: Evidence-based progressive rehab, sport-specific return-to-play protocols
- **Journey**: Injury Assessment → Acute Phase → Strength & Stability → Functional Training → Return to Play/Activity
- **Highlights**: Surgeon-coordinated rehab protocols, sport-specific return-to-play programs, progressive loading with objective benchmarks, pre-surgery prehab
- **Session Info**: 45–60 min, 4–6 sessions/week, In-clinic

### Post-Surgery Rehab (`/services/post-surgery`)
- **Tagline**: Structured Recovery, Optimal Outcomes.
- **Image**: `images.postSurgery` (pic-8.jpeg)
- **Conditions**: Knee Replacement, Hip Replacement, Spinal Surgery, Rotator Cuff Repair, Fracture Fixation, Joint Replacements
- **Approach**: Comprehensive post-operative rehabilitation, surgeon-coordinated protocols
- **Journey**: Post-Op Assessment → Early Mobilization → Strengthening Phase → Functional Restoration → Full Recovery
- **Highlights**: Surgeon-coordinated protocols, phase-wise progression based on healing timelines, pain management and scar tissue mobilization, home exercise programs
- **Session Info**: 45–60 min, 4–6 sessions/week, In-clinic

### Kids Exercise Program (`/services/kids`)
- **Tagline**: Fun, Safe & Developmentally Appropriate.
- **Image**: `images.kids` (pic-7.jpeg)
- **Conditions**: Posture Correction, Flat Feet, Core Strengthening, Coordination & Balance, Sports Conditioning, Weight Management
- **Journey**: Child Assessment → Fun Movement Games → Core & Postural Work → Sport Skills → Progress Review
- **Highlights**: Fun game-based exercises, small groups (max 8–10 kids), supervised by qualified physiotherapists, regular progress reports for parents
- **Session Info**: 60 min, 3 sessions/week, In-clinic (SDA location)

---

## 10. Key Implementation Notes

- **Enrollment**: The `/enroll` page uses a custom multi-step React form (4 steps: Personal, Contact, Program, Goals). All data is stored directly in the PostgreSQL database. Google Form integration has been removed.

- **Payment**: Integrate Razorpay for online payments. For cash/cheque, staff records manually via admin dashboard.

- **Receipt PDF**: Use `@react-pdf/renderer` to generate receipts server-side matching the official format from the PDF.

- **WhatsApp CTA**: All "Contact" buttons should open `https://wa.me/919900911795` with a pre-filled message: "Hi Dr. Neha, I'd like to book a physiotherapy session."

- **Admin / Doctor Dashboard** (protected, `/admin`): Accessible only after staff/doctor login with JWT. Must show real data fetched from the database:
  - **Overview cards**: Total patients enrolled, new today, new this month, total revenue, revenue today, pending payments count.
  - **Patient table** (`/admin/patients`): Full list with name, phone, program, enrollment date, status. Searchable, filterable by program and date. Exportable to CSV.
  - **Payment table** (`/admin/payments`): All payment records with patient name, amount, mode, status, date. Filterable by status and date range. Revenue totals shown. Exportable to CSV.
  - **Recent activity feed**: Last 10 enrollments and last 10 payments on the dashboard home.
  - **Payment mode breakdown**: Pie/bar chart showing Cash vs UPI vs Card vs Cheque split.

- **Environment variables needed**:
  ```
  DATABASE_URL=
  RAZORPAY_KEY_ID=
  RAZORPAY_KEY_SECRET=
  JWT_SECRET=
  SMTP_HOST=
  SMTP_USER=
  SMTP_PASS=
  CLOUDINARY_URL=
  ```

---

## 11. Folder Structure

```
refunction-rehab/
├── docker-compose.yml       # Starts postgres (Docker Hub) + server + client
├── .env.example             # Template — copy to .env and fill secrets
├── .env                     # Actual secrets — never commit to git
├── .gitignore               # Must include .env and node_modules
│
├── client/                  # React + Vite frontend
│   ├── Dockerfile           # Multi-stage: build → nginx:alpine
│   ├── nginx.conf           # SPA routing + /api proxy to server
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/      # Navbar, Footer, FloatingWhatsApp
│   │   │   ├── home/        # Hero, ServiceCards, FeatureBlocks, TestimonialCarousel, CTABanner
│   │   │   ├── testimonials/ # TestimonialCard, TestimonialCarousel
│   │   │   ├── forms/       # EnrollmentForm, PaymentForm, ContactForm
│   │   │   ├── ui/          # Buttons, Cards, Badges, Modals
│   │   │   └── receipt/     # ReceiptPDF, ESignaturePad
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Services.jsx
│   │   │   ├── ServiceDetail.jsx
│   │   │   ├── Enroll.jsx
│   │   │   ├── Payment.jsx
│   │   │   ├── Contact.jsx
│   │   │   ├── About.jsx
│   │   │   ├── Testimonials.jsx  # Public testimonials page
│   │   │   ├── Book.jsx          # Appointment booking (service → date → time slot → confirm)
│   │   │   └── admin/
│   │   │       ├── Login.jsx
│   │   │       ├── Dashboard.jsx
│   │   │       ├── Patients.jsx
│   │   │       ├── Payments.jsx
│   │   │       ├── Testimonials.jsx  # Admin testimonial management
│   │   │       ├── Availability.jsx  # Doctor availability schedule management
│   │   │       └── Calendar.jsx      # Appointment calendar view
│   │   ├── hooks/           # usePatient, usePayment, useAuth
│   │   └── lib/             # api.js (axios instance + package/visit API functions), validators.js
│
├── server/                  # Node + Express backend
│   ├── Dockerfile           # node:20-alpine, runs prisma migrate deploy on start
│   ├── index.js             # Express app entry point
│   ├── routes/
│   │   ├── patients.js
│   │   ├── payments.js
│   │   ├── packages.js       # Treatment package CRUD + visit recording
│   │   ├── appointments.js   # Patient booking + admin appointment management
│   │   ├── availability.js   # Doctor availability + slot overrides + public slot queries
│   │   ├── contact.js
│   │   ├── auth.js
│   │   └── admin.js
│   ├── controllers/
│   ├── middleware/
│   │   └── auth.js          # JWT verification middleware
│   ├── prisma/
│   │   ├── schema.prisma    # Single source of truth for DB schema
│   │   └── migrations/      # Auto-generated by prisma migrate dev
│   └── utils/
│       ├── email.js
│       ├── pdf.js
│       └── receipt.js
│
└── README.md                # Must include: docker compose up --build as the single run command
```

---

## 12. Quick-Start Build Order

When building this app from scratch, follow this order:

1. **Docker setup**: Write `docker-compose.yml`, `server/Dockerfile`, `client/Dockerfile`, `nginx.conf`, `.env.example`
2. **Verify DB**: `docker compose up db` — confirm postgres:16-alpine pulls and starts cleanly
3. **Backend scaffold**: Express server + Prisma schema + `prisma migrate dev` inside container
4. **All API routes**: patients, payments, contact, auth, admin — all wired to Prisma/PostgreSQL
5. **Frontend setup**: Vite + React + Tailwind + Framer Motion + React Router
6. **Layout**: Navbar (with logo) + Footer + FloatingWhatsApp
7. **Homepage**: Hero → Services strip → Feature blocks → CTA banner
8. **Services pages**: One template, render per service
9. **Enrollment form**: Multi-step form → POST to `/api/patients/enroll` → save to DB
10. **Payment page**: Dynamic payment mode forms + fee table → POST to `/api/payments` → save to DB
11. **Wire all forms to API**: No `console.log` — every submission hits the real endpoint
12. **Admin/Doctor Dashboard**: Login → JWT auth → patient table, payment table, revenue stats from DB
13. **Razorpay**: Online payment integration
14. **PDF receipt**: react-pdf receipt generator
15. **Export**: CSV download for patients and payments
16. **Full Docker test**: `docker compose up --build` — entire stack runs from one command, no local DB needed
17. **Polish**: Animations, mobile responsiveness, loading states, skeleton loaders

## 13. Doctor Dashboard — Page Specifications (`/admin`)

### 13.1 Login (`/admin/login`)
- Email + Password form → POST `/api/auth/login` → store JWT in localStorage
- Redirect to `/admin/dashboard` on success
- All `/admin/*` routes are protected — redirect to `/admin/login` if no valid JWT

### 13.2 Dashboard Home (`/admin/dashboard`)

**Month Picker** (top-right corner):
- Left/right arrows to navigate between months (← January 2026 →)
- Defaults to the current month on load
- Cannot navigate beyond the current month (next button disabled)
- When month changes, the dashboard re-fetches data with `?month=X&year=YYYY` query params
- Monthly stat card labels update dynamically: "Patients — This Month" or "Patients — March 2026"

**Stat Cards Row** (4-column grid):
- Total Patients Enrolled (all time)
- New Patients Today
- Patients — {selected month} (enrolled in selected month)
- Total Revenue (all time, ₹)
- Revenue Today (₹)
- Revenue — {selected month} (₹) — revenue for the selected month
- Pending Payments (count + ₹ value) — **must include** patients who enrolled but have zero payment records (not just payments with `partial`/`pending` status). Count = patients with no payments + payment records in `partial`/`pending` status.
- Active Packages (count of packages with `status: "active"`)
- Visits Today (count of visits recorded today)

**Packages Needing Attention** (shown only when packages have ≤2 sessions remaining):
- Table: Patient Name | Package | Sessions Used | Remaining | Action (View link to patient profile)

**Recent Enrollments Table** (last 10):
- Patient Name | Program | Session Type | Enrolled At | Actions (View)

**Recent Payments Table** (last 10):
- Patient Name | Amount (₹) | Mode | Status | Date | Actions (Receipt)

**Payment Mode Breakdown Chart:**
- Bar or donut chart — Cash / UPI / Card / Net Banking / Cheque counts and totals

### 13.3 Patients Page (`/admin/patients`)
- Search bar (name / phone / patient ID)
- Filter: Program type, Enrollment date range
- Paginated table: ID | Name | Age | Gender | Mobile | Program | Session Type | Enrolled At | Payment Status | Pkg Status | Actions
- **Payment Status column**: Show a badge per patient — green "X paid" if they have payment records, amber "No payment" if they have zero payment records. This gives staff immediate visibility into who has enrolled but not yet paid.
- **Pkg Status column**: Shows the patient's active package progress — green "Active (4/10)" badge for active packages, or grey "No package" if none. **Clicking the badge opens the Packages & Visits modal** (see Section 16.7). Data comes from the `packages` field returned by the admin patients query (active packages only, with visit counts).
- Actions: **Edit** (links to `/admin/patients/:id/edit` — implemented), **Visits** (opens Packages & Visits modal — same as clicking the Pkg Status badge), **Payment** (links to `/payment?patientId={id}` for quick deferred payment recording)
- **Export to CSV** button (calls `GET /api/admin/patients/export`)
- Total count shown: "Showing X of Y patients"

### 13.4 Payments Page (`/admin/payments`)
- Filter: Payment status (Paid / Partial / Pending / Refund), Date range, Payment mode
- Paginated table: Receipt No. | Patient | Services | Amount (₹) | Mode | Status | Date | Actions
- Actions: View receipt, Download PDF receipt
- **Revenue Summary bar** at top: Total Collected | Pending | Refunded
- **Export to CSV** button (calls `GET /api/admin/payments/export`)

---

## 14. Visual Content & Imagery

The portal includes relevant photographs and images to make it more appealing, relatable, and trustworthy for patients.

### Current Image Mapping (`client/src/lib/images.js`)

| Key | File | Used For |
|---|---|---|
| `hero` | `/images/pic-6.png` | Homepage hero — Dr. Neha's photo |
| `seniors` | `/images/pic-1.jpeg` | Senior Care — home page & service detail |
| `painManagement` | `/images/pic-2.jpeg` | Pain Management — home page & service detail |
| `clinic` | `/images/pic-3.jpeg` | Sports Injury Rehab — service card & detail |
| `womensHealth` | `/images/pic-4.jpeg` | Women's Health — home page & service detail |
| `womensHealth2` | `/images/pic-5.jpeg` | Women's Health (alternate) |
| `kids` | `/images/pic-7.jpeg` | Kids Exercise — service card & detail |
| `postSurgery` | `/images/pic-8.jpeg` | Post-Surgery Rehab — service card & detail |

### Image Display Rules

All images are **portrait-oriented** (1024×1536px, 2:3 ratio). Display rules:

- **Home page feature blocks**: Rendered as plain `<motion.img>` at full width with natural height — no `object-cover` or forced aspect ratio. No cropping, no gaps.
- **Service cards** (Services.jsx): Fixed height `h-48` with `object-cover` — slight crop is acceptable for uniform grid thumbnails.
- **Service detail pages**: Rendered as plain `<motion.img>` at full width with natural height — same as home page.
- **Hero backgrounds**: Used at 20% opacity as a background overlay behind the gradient.

### Image Guidelines
- **Prefer real clinic photos** over stock images whenever possible — authenticity builds trust
- All images should be **optimized for web** (compressed, lazy-loaded)
- Use **alt text** for accessibility (e.g., "Senior patient performing guided knee strengthening exercise")
- Images are portrait (2:3) — never force them into landscape containers with `object-cover` as this crops important text overlays
- Store images in `/client/public/images/`
- Additional raw images available in `/client/img/` (pic-1 through pic-8)

### Service Detail Page Layout

Each service detail page has a **two-column layout** (`lg:grid-cols-2`, `items-start`):

**Left column**: Tagline, full-width image (natural height), description text, "What We Treat" checklist, CTA buttons.

**Right column** (3 stacked cards):
1. **Your Treatment Journey** — 5-step numbered journey with service-colored step badges
2. **Why Choose Us** — 4 service-specific highlights on a gradient background (navy → service color)
3. **Session Details** — Duration, frequency, mode + "Book via WhatsApp" button

---

## 15. Patient Testimonials Feature

Patient testimonials build trust and provide social proof. Since healthcare decisions are deeply personal, hearing from real patients who recovered from similar conditions significantly boosts enrollment confidence.

### 15.1 Homepage Testimonials Section

Placed between the Feature Blocks and CTA Banner on the homepage.

**Layout:**
- Section heading: "What Our Patients Say" with subtitle "Real stories from real patients"
- **Carousel/slider** of 3–4 featured testimonials (auto-scroll with pause on hover)
- Each card shows: star rating, quote excerpt (2–3 lines), patient name or initials, condition treated, outcome
- "View All Testimonials →" link to `/testimonials`
- Background: light (`bg-light`) to contrast with white feature blocks above

**Design:**
- Cards: white, rounded-2xl, shadow, with a large teal quote icon (`"`) at top-left
- Star rating: gold stars using Lucide `Star` icon
- Patient identity: Name or initials + age range + condition badge
- Outcome badge: green pill showing result (e.g., "Pain-free in 6 weeks")

### 15.2 Testimonials Page (`/testimonials`)

Dedicated page showing all approved testimonials.

**Layout:**
- Hero: gradient banner with heading "Patient Success Stories"
- Filter tabs: All | Seniors | Women's Health | Pain Management | Sports Injury | Post-Surgery | Kids
- Grid of testimonial cards (2 columns on desktop, 1 on mobile)
- Each card shows full review text, star rating, patient name/initials, condition, service, treatment duration, outcome
- Video testimonials: embedded YouTube player or play button overlay if `videoUrl` is present
- Pagination or "Load More" for large lists

**Data:** Fetched from `GET /api/testimonials` (only approved testimonials returned)

### 15.3 Admin Testimonials Management (`/admin/testimonials`)

Protected page for Dr. Neha / staff to manage testimonials.

**Features:**
- **Add Testimonial** button → modal/form with fields:
  - Patient Name*, Patient Initials (optional), Age, Gender
  - Condition Treated*, Service Category* (dropdown: seniors, womens-health, pain-management, sports-rehab, post-surgery, kids)
  - Rating* (1–5 star selector)
  - Review Text* (textarea)
  - Treatment Duration (e.g., "3 months")
  - Outcome (e.g., "Pain-free", "Walking independently")
  - Video URL (optional YouTube/Vimeo link)
  - Patient Photo URL (optional)
  - Consent checkbox (mandatory)
- **Table view** of all testimonials: Patient Name | Condition | Rating | Status (Approved/Pending) | Featured | Date | Actions
- **Actions per testimonial**: Edit, Approve/Reject toggle, Feature/Unfeature toggle, Delete
- **Bulk actions**: Approve selected, Delete selected
- Status badge: Green "Approved", Amber "Pending", Red "Rejected"

**Workflow:**
1. Dr. Neha or staff adds a testimonial after getting verbal/written consent from patient
2. Testimonial is created with `isApproved: false` by default
3. Staff reviews and toggles `isApproved: true` to make it public
4. Optionally marks as `isFeatured: true` to show on homepage carousel

### 15.4 Privacy & Consent Rules

- **Patient consent is mandatory** — the `consentGiven` field must be `true` before a testimonial can be approved
- Patients can choose to display their **full name, first name only, or just initials** — the `patientInitials` field provides anonymity
- **No medical records or identifiable health data** beyond what the patient consents to share
- Age is optional and displayed as a range (e.g., "60s") not exact age
- Photo is optional and only used with explicit consent
- Staff should **never fabricate testimonials** — all must come from real patients

### 15.5 Service Detail Page Integration

Each service detail page should show 1–2 relevant testimonials at the bottom (above the CTA banner), filtered by the service slug. This gives contextual social proof — a patient viewing "Physiotherapy for Seniors" sees testimonials from other seniors.

**Implementation:** Filter from `GET /api/testimonials?service={slug}&limit=2&featured=true`

---

## 16. Patient Visit Tracking & Package Management

Track the number of visits a patient has completed against their purchased treatment package. This helps Dr. Neha know exactly where each patient stands — how many sessions are done, how many remain, and when a renewal is due.

**Integration philosophy:** This feature is NOT a standalone system. It plugs into the existing Patient, Payment, and Dashboard modules — a package is born from a Payment, visits are tracked inside the existing patient profile page, and stats appear on the existing dashboard.

### 16.1 Why This Matters

- **For the doctor/clinic:** Quick visibility into each patient's attendance, avoids over- or under-servicing, and enables timely package renewal conversations.
- **For the patient:** Transparency on sessions used vs. remaining — no confusion or disputes.

### 16.2 Package & Visit Data Model

Add to the Prisma schema (Section 6). The `TreatmentPackage` links to both `Patient` and `Payment` — no duplicate amount/patient fields.

```prisma
model TreatmentPackage {
  id            String   @id @default(cuid())
  patientId     String
  patient       Patient  @relation(fields: [patientId], references: [id])
  paymentId     String
  payment       Payment  @relation(fields: [paymentId], references: [id])
  packageName   String            // e.g., "10-Day Physiotherapy Package"
  totalSessions Int               // e.g., 10
  startDate     DateTime @default(now())
  expiryDate    DateTime?         // optional — package validity window
  status        String   @default("active") // active | completed | expired
  notes         String?
  visits        PatientVisit[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("treatment_packages")
}

model PatientVisit {
  id             String   @id @default(cuid())
  packageId      String
  package        TreatmentPackage @relation(fields: [packageId], references: [id])
  visitDate      DateTime @default(now())
  visitNumber    Int               // 1, 2, 3, ... auto-incremented per package
  treatmentNotes String?           // what was done in this session
  markedBy       String?           // staff who recorded the visit
  createdAt      DateTime @default(now())

  @@map("patient_visits")
}
```

**Required relation updates to existing models (Section 6):**

```prisma
// Add to existing Patient model:
model Patient {
  // ... existing fields ...
  payments          Payment[]
  packages          TreatmentPackage[]   // ← NEW
}

// Add to existing Payment model:
model Payment {
  // ... existing fields ...
  package           TreatmentPackage?    // ← NEW (one-to-one: a payment may or may not create a package)
}
```

### 16.3 Package Creation (via Patients Page Modal)

Package creation happens **exclusively** through an inline form inside the Packages & Visits modal on the Patients page (`/admin/patients`). The Payment Collection page (`/payment`) does **not** handle package creation — it is for per-session billing only.

#### Package Creation Form Fields

The form appears at the top of the modal body when "New Package" is clicked:

**Service Details:**
- **Service / Treatment** — dropdown (Physiotherapy Session, Initial Consultation, Follow-up Session, Exercise Training, Kids Exercise, Post-Surgery Rehab, Sports Injury Session, Elderly Care Session, Home Visit, Group Session, Online Session, Other). Tells the doctor what the package is for. Also saved in the payment's `services` array for billing records.

**Package Details:**
- **Package Type** — dropdown of presets: 5-Session, 10-Session, 15-Session, Monthly Unlimited (30), Custom
- **Total Sessions** — number input (auto-filled from preset, editable)
- **Enrollment Date** — date picker (defaults to today)
- **Expiry Date** — optional date picker
- **Package Notes** — optional text

**Payment Details (auto-calculated):**
- Per-session cost: **₹600** (defined as `PER_SESSION_COST` constant in `client/src/pages/admin/Patients.jsx`)
- A **price breakdown card** shows the calculation in real-time:
  ```
  10 sessions × ₹600             ₹6,000
  Discount                       − ₹500    ← green, only shown when > 0
  ─────────────────────────────────────────
  Total                           ₹5,500
  ```
- **Discount (₹)** — optional flat amount deducted from subtotal. Cannot exceed subtotal. Discount info is automatically appended to payment remarks for audit trail.
- **Payment Mode** — Cash, UPI, Card, Bank Transfer, Cheque
- **Remarks** — optional text

On submit, calls `POST /api/payments` with `isPackage: true`. The backend creates both the Payment and TreatmentPackage atomically via `prisma.$transaction()`.

#### Package Detail View (Expanded)

When a package card is expanded in the modal:
- **Service badge** — teal pill showing the treatment type (e.g. "Physiotherapy Session") at the top of the detail section, read from `pkg.payment.services[0].description`
- Start Date, Expiry, Remaining sessions, Receipt number
- Mark Visit button (active packages only)
- Visit log table

The `services` JSON field is included in the packages API response from `server/src/routes/packages.js` (added to the payment select clause).

#### Flow Example

1. Patient RF-0012 comes in, wants a 10-session physiotherapy package
2. Staff opens Patients → clicks Pkg Status badge → clicks "New Package"
3. Selects service "Physiotherapy Session", preset "10-Session Package"
4. Breakdown shows: 10 × ₹600 = ₹6,000. Enters discount ₹500 → total ₹5,500
5. Selects payment mode "Cash", clicks "Save Package"
6. Package appears in the modal list with "active" status and receipt number
7. Doctor marks daily visits directly from the same modal

### 16.4 API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET    | `/api/admin/packages?patientId={id}` | List all packages for a patient (with visit counts) |
| GET    | `/api/admin/packages/:id` | Get package details with all visits |
| PATCH  | `/api/admin/packages/:id` | Update package (status, notes, expiry) |
| POST   | `/api/admin/packages/:id/visits` | Record a new visit (auto-increments visitNumber) |
| DELETE | `/api/admin/packages/:id/visits/:visitId` | Remove a wrongly recorded visit |

**Note:** There is no `POST /api/admin/packages` — packages are created automatically via the Payment route when the package toggle is ON. The existing `POST /api/payments` accepts optional package fields (`isPackage`, `packageName`, `totalSessions`, `expiryDate`, `packageNotes`) and handles both payment creation and package creation in a single atomic `prisma.$transaction()`.

### 16.5 Patient Edit Page (`/admin/patients/:id/edit`)

The patient edit page is focused purely on **editing patient enrollment details** (personal info, contact, program selection, goals). It does **not** include Packages & Visits — that functionality lives in the **Packages & Visits modal** on the Patients list page (Section 16.7), which provides a faster workflow for the doctor.

### 16.6 Integration with Admin Dashboard (`/admin/dashboard`)

Add to the existing stat cards row (Section 13.2):

- **Active Packages** — count of packages with `status: "active"` across all patients
- **Visits Today** — count of visits recorded today (`visitDate = today`)

Add a new section below the existing tables:

- **Packages Needing Attention** — table of packages with ≤ 2 sessions remaining:
  - Columns: Patient Name | Package | Sessions Used | Remaining | Last Visit Date
  - Links to the patient profile page for quick action

### 16.7 Integration with Patients List Page (`/admin/patients`)

Add a new column to the existing patients table (Section 13.3):

- **Package Status** column (after Payment Status):
  - Green badge: "Active (4/10)" — shows active package with progress
  - Blue badge: "Completed" — most recent package was completed
  - Red badge: "Expired (3/10)" — package expired with unused sessions
  - Grey text: "No package" — patient has no packages
  - If multiple active packages, show count: "2 active"

#### Packages & Visits Modal (Quick Visit Entry)

**Clicking the Pkg Status badge** or the **"Visits" action button** opens a full-featured modal overlay directly on the Patients list page. This is the **primary workflow for recording daily visits** — Dr. Neha never needs to navigate away from the patient list.

**Modal layout:**
- **Header:** Package icon + "Packages & Visits" title + patient name & ID + "New Package" button + close (X) button
- **Body (scrollable):** All packages for the patient, sorted by status (active first, then completed, then expired)
- Each package shown as a collapsible card (identical to the EditPatient packages section):
  - Package name + status badge (green/blue/red) + session progress text + receipt number
  - Progress bar showing `visitsDone / totalSessions`
  - Amber alert when ≤2 sessions remaining
  - Expanded detail: **service/treatment badge** (teal pill, e.g. "Physiotherapy Session"), start date, expiry, remaining sessions, receipt number
  - **"Mark Visit" button** (active packages only) → inline form with date + treatment notes + Confirm/Cancel
  - Visit log table: Visit # | Date | Notes | Marked By | Delete action
- **"New Package" button** opens an inline creation form at the top of the modal body (see Section 16.3 for full field details)
- **Empty state:** "No treatment packages yet" with "+ Create a new package" button (opens the same inline form)

**UX benefits over the EditPatient page approach:**
- **Zero navigation** — doctor stays on the patient list, clicks badge, records visit, closes modal
- **Instant context switch** — can immediately move to the next patient without page loads
- **Badge updates in real-time** — after recording a visit, both the modal progress bar and the patient list badge refresh automatically
- **Consistent with clinical workflow** — doctor marks attendance at the start of each session while reviewing the patient list

### 16.8 Quick Visit Entry (Dashboard Shortcut)

Dr. Neha's most common action is recording that a patient showed up today. This should be fast and accessible from the dashboard:

1. **"Mark Visit" quick-action button** on the dashboard (next to existing action buttons)
2. Opens a modal:
   - Patient search (by name, ID, or mobile) — same search as existing patient lookup
   - Once selected, shows the patient's active package(s) with current progress
   - Click **"Mark Visit"** on the relevant package — one click records today's visit
   - Optional: add treatment notes before confirming
3. Modal closes, dashboard "Visits Today" stat updates

### 16.9 Business Rules

- A patient can have **multiple packages** (e.g., one completed, one active)
- A single payment creates **at most one** package (one-to-one relationship)
- Visits cannot exceed `totalSessions` — once all sessions are used, status auto-updates to `completed`
- If `expiryDate` is set and passes before all sessions are used, status auto-updates to `expired` (checked via a daily cron job or on-access check)
- Only admin/staff can record or delete visits
- Visit numbers are sequential per package (not global)
- Package inherits patient and amount info from its linked Payment — no duplicate data entry
- The `program` and `sessionType` from the Patient enrollment are used as defaults when displaying package context (e.g., "Physiotherapy — In-Person")

### 16.10 Patient-Facing View (Optional Future Enhancement)

On the patient's profile or a patient portal (if built), show a read-only view:

- Package name and total sessions
- Sessions completed and remaining
- Dates of all past visits
- Linked payment receipt for reference

---

## 17. Appointment Booking & Doctor Availability

Patients can view Dr. Neha's available time slots and book appointments online. This replaces the manual WhatsApp-based booking workflow with a transparent, self-service scheduling system. Multiple patients may need appointments at the same time — the system enforces slot capacity limits so patients only see genuinely available slots.

### 17.1 Why This Matters

- **For patients:** Transparency — see exactly when the doctor is available, no back-and-forth on WhatsApp. Book instantly, get confirmation.
- **For the doctor:** No manual scheduling overhead — patients self-serve, the calendar fills up automatically. Reduces no-shows via reminders. Prevents overbooking.
- **For the clinic:** Professional image, fewer missed appointments, better utilization of the doctor's time.

### 17.2 Data Model

Add to the Prisma schema (Section 6):

```prisma
model DoctorAvailability {
  id            String   @id @default(cuid())
  dayOfWeek     Int                // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime     String             // "09:00" (24-hour format)
  endTime       String             // "18:00"
  slotDuration  Int      @default(30)  // minutes per slot (recommended: 45 for rehab sessions)
  maxPatients   Int      @default(1)   // max concurrent patients per slot (1 = single, >1 = group/batch)
  sessionType   String   @default("In-Person")  // In-Person / Online / Home Visit
  label         String?            // optional label, e.g., "Women's Health Batch", "General OPD"
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("doctor_availability")
}

model SlotOverride {
  id            String   @id @default(cuid())
  date          DateTime             // specific date this override applies to
  startTime     String?              // if null + isBlocked=true → entire day blocked
  endTime       String?
  maxPatients   Int?                 // override capacity for this specific slot
  isBlocked     Boolean  @default(false)  // true = doctor unavailable (holiday, leave, etc.)
  reason        String?              // "Public Holiday", "Doctor on leave", etc.
  createdAt     DateTime @default(now())

  @@map("slot_overrides")
}

model Appointment {
  id            String   @id @default(cuid())
  patientId     String
  patient       Patient  @relation(fields: [patientId], references: [id])
  packageId     String?              // optional link to active treatment package
  package       TreatmentPackage? @relation(fields: [packageId], references: [id])
  appointmentDate DateTime           // the date of the appointment
  startTime     String               // "09:00" (24-hour format)
  endTime       String               // "10:00"
  serviceType   String               // Physiotherapy, Consultation, Exercise Training, etc.
  sessionType   String   @default("In-Person")  // In-Person / Online / Home Visit
  status        String   @default("scheduled")   // scheduled | confirmed | completed | cancelled | no-show
  notes         String?              // patient notes when booking
  cancellationReason String?
  cancelledAt   DateTime?
  reminderSent  Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([appointmentDate, startTime, patientId])  // prevent same patient booking same slot twice
  @@map("appointments")
}
```

**Required relation updates to existing models:**

```prisma
// Add to existing Patient model:
model Patient {
  // ... existing fields ...
  appointments    Appointment[]      // ← NEW
}

// Add to existing TreatmentPackage model:
model TreatmentPackage {
  // ... existing fields ...
  appointments    Appointment[]      // ← NEW (appointments linked to this package)
}
```

### 17.3 Doctor Availability Management (Admin)

Dr. Neha / staff configures weekly availability from the admin panel.

#### Admin Page: `/admin/availability`

**Weekly Schedule View:**
- 7-day grid (Mon–Sun) showing configured time blocks
- Each block shows: time range, slot duration, max patients, session type, label
- Color-coded: green = active, grey = inactive
- Add / Edit / Delete availability blocks per day

**Add/Edit Availability Form:**
- Day of Week — dropdown (Monday–Sunday)
- Start Time — time picker (e.g., 09:00)
- End Time — time picker (e.g., 13:00)
- Slot Duration — dropdown (30 min / 45 min / 60 min)
- Max Patients Per Slot — number input (default 1; use >1 for group batches like the 7PM Women's Health batch)
- Session Type — In-Person / Online / Home Visit
- Label — optional (e.g., "Morning OPD", "Women's Health Batch")
- Active toggle — enable/disable without deleting

**Slot Overrides Section:**
- Calendar view of upcoming 30 days
- Click a date to add an override:
  - **Block entire day** — e.g., "Doctor on leave" (sets `isBlocked: true`, `startTime: null`)
  - **Block specific slot** — e.g., "Unavailable 2PM–4PM on March 15"
  - **Increase capacity** — e.g., "Allow 3 patients in 10AM slot on Saturday" (special camp day)
- Visual indicators: red = blocked day, amber = modified slot

**Example Configuration:**
```
Monday:     9:00–13:00 (60min slots, 1 patient each) + 16:00–19:00 (60min slots)
Tuesday:    9:00–13:00 + 16:00–19:00
Wednesday:  9:00–13:00 (morning only)
Thursday:   9:00–13:00 + 16:00–19:00
Friday:     9:00–13:00 + 16:00–19:00
Saturday:   9:00–13:00 + 19:00–20:00 (Women's Health Batch, 8 max patients)
Sunday:     CLOSED
```

### 17.4 Patient-Facing Booking Page (`/book`)

The `/book` page (currently just a redirect to enrollment) becomes a full appointment booking interface.

**Auto-Lookup from Enrollment:**
- If URL has `?patientId=XXX` (from enrollment success), the patient is auto-looked up and the flow skips to Step 2 (Service selection). No manual entry needed.

**Step 1 — Patient Identification:**
- Search by Patient ID or Mobile Number (must be enrolled first)
- Link to `/enroll` if not yet enrolled: "Not enrolled yet? Register here"
- On successful lookup, patient's program and session type are pre-filled as defaults

**Step 2 — Select Service:**
- Radio cards for each service type: Physiotherapy, General Health & Fitness, Kids Exercise, Post-Surgery Rehab, Sports Injury, Elderly Care
- Session type selection: In-Person / Online / Home Visit
- Pre-fills from patient's enrollment data

**Step 3 — Pick Date & Time (combined single step):**
- **Calendar widget** (month view, navigable forward/backward)
- Past dates are greyed out and not selectable
- Clicking a date immediately fetches and displays available time slots below the calendar
- **Time slot grid** appears inline below the calendar:
  - Each slot shows: time range (e.g., "09:00 - 09:30"), availability count, batch label
  - Color-coded: green = available, amber = 1 spot left, grey = full (disabled)
  - Full slots shown but disabled for transparency
- Blocked dates show the reason (e.g., "This date is unavailable")
- Both date AND time must be selected before proceeding

**Step 4 — Confirm Booking:**
- Summary card showing: Patient Name, Patient ID, Service, Date, Time, Session Type
- Optional notes field (e.g., "Knee pain has increased since last visit")
- `[Confirm Appointment]` button → POST `/api/appointments`

**Success Screen:**
- Booking ID, appointment details summary
- "Back to Home" and "Book Another" buttons

### 17.5 API Routes

```
# Doctor Availability (admin, protected)
GET    /api/admin/availability              → List all availability blocks
POST   /api/admin/availability              → Create availability block
PATCH  /api/admin/availability/:id          → Update availability block
DELETE /api/admin/availability/:id          → Delete availability block

# Slot Overrides (admin, protected)
GET    /api/admin/slot-overrides            → List overrides (next 30 days)
POST   /api/admin/slot-overrides            → Create override (block day/slot, adjust capacity)
DELETE /api/admin/slot-overrides/:id        → Remove override

# Available Slots (public, no auth — patients need to see this)
GET    /api/slots?date=YYYY-MM-DD           → Get available slots for a specific date
                                              Response: { date, slots: [{ startTime, endTime, capacity, booked, available, label, sessionType }] }
GET    /api/slots/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
                                            → Get date-level availability summary for calendar view
                                              Response: { dates: [{ date, totalSlots, availableSlots, status: "available"|"few"|"full"|"blocked", blockReason? }] }

# Appointments (patient-facing, requires patient identification)
POST   /api/appointments                    → Book an appointment
                                              Body: { patientId, appointmentDate, startTime, endTime, serviceType, sessionType, notes? }
                                              Validates: slot exists, not at capacity, patient doesn't already have this slot, date is in the future
                                              Response: { appointmentId, bookingRef, message }
GET    /api/appointments?patientId={id}     → List appointments for a patient (upcoming + past)
GET    /api/appointments/:id                → Get appointment details
PATCH  /api/appointments/:id/cancel         → Cancel appointment (must be ≥4 hours before)
                                              Body: { reason? }
PATCH  /api/appointments/:id/reschedule     → Reschedule to a new slot
                                              Body: { newDate, newStartTime, newEndTime }

# Appointments (admin, protected)
GET    /api/admin/appointments              → List all appointments (paginated, filterable by date, status, patient)
GET    /api/admin/appointments/today        → Today's appointment list (the daily schedule view)
PATCH  /api/admin/appointments/:id          → Update status (confirm, complete, mark no-show)
                                              Body: { status, notes? }
GET    /api/admin/appointments/stats        → Appointment stats (total today, upcoming, no-show rate, cancellation rate)
```

### 17.6 Slot Generation Logic

Available slots are computed at request time (not pre-generated):

```
1. Get DoctorAvailability for the requested date's dayOfWeek (where isActive = true)
2. Check SlotOverrides for the specific date:
   - If entire day is blocked → return empty (with blockReason)
   - If specific slots are blocked → exclude those time ranges
   - If capacity overrides exist → apply them
3. Generate time slots from availability windows using slotDuration
   Example: startTime=09:00, endTime=13:00, duration=60min → [09:00, 10:00, 11:00, 12:00]
4. For each generated slot, count existing Appointments with status != 'cancelled'
5. available = maxPatients − booked
6. Return slots with capacity info
```

**Concurrency handling:** Use a database-level unique constraint + transaction when creating appointments. If two patients try to book the last slot simultaneously, the second insert fails gracefully with a "slot no longer available" message.

### 17.7 Appointment Calendar View (Admin Dashboard)

Add to the admin dashboard (`/admin/dashboard`):

**New Stat Cards:**
- **Appointments Today** — count of today's appointments (status: scheduled + confirmed)
- **Upcoming This Week** — total appointments in the next 7 days

**Today's Schedule Section** (prominent, shown near top):
- Timeline view of today's appointments:
  ```
  09:00 AM  Rajesh Kumar (RF-0012) — Physiotherapy     [Confirmed ✓]
  10:00 AM  Priya Sharma (RF-0045) — Post-Surgery Rehab [Scheduled]
  11:00 AM  — Available —
  12:00 PM  Amit Patel (RF-0023) — Sports Injury        [Scheduled]
  ...
  ```
- Each row: Time | Patient Name + ID | Service | Status badge | Actions (Confirm, Complete, No-show, Cancel)
- Empty slots shown as "— Available —" in grey
- Quick "Mark Visit" action on confirmed appointments → records visit in the patient's active package AND updates appointment status to `completed`

**Weekly Calendar View** (optional, linked from dashboard):
- Full-page calendar at `/admin/calendar`
- Week view with time slots on Y-axis, days on X-axis
- Appointments shown as colored blocks (green=confirmed, blue=scheduled, red=cancelled, grey=completed)
- Click any empty slot to create an appointment for a walk-in patient
- Click any appointment to view details or update status

### 17.8 Integration with Existing Systems

**With Visit Tracking (Section 16):**
- When an appointment is marked `completed`, optionally auto-record a visit in the patient's active treatment package
- The "Mark Visit" button in the appointment view calls both `PATCH /api/admin/appointments/:id` (status→completed) and `POST /api/admin/packages/:id/visits` in sequence
- If the patient has no active package, prompt: "Patient has no active package. Record visit anyway?" → creates an unlinked visit note

**With Patient Enrollment (Section 4.2):**
- The enrollment form's `preferredDays` and `preferredTime` fields are used as **suggested defaults** when the patient first visits `/book` — pre-selecting their preferred day and time range
- After enrollment, the confirmation screen adds: "Book your first appointment →" linking to `/book?patientId={id}`

**With Dashboard (Section 13.2):**
- Add `appointmentsToday` and `upcomingAppointments` to the dashboard stats API response
- Add "Today's Schedule" section to the dashboard (see 17.7)

**With Patients List (Section 13.3):**
- Add **"Next Appt"** column to the patients table showing the patient's next upcoming appointment date/time, or "—" if none
- Clicking the date opens the appointment details

### 17.9 Automated WhatsApp Notification System

The notification system sends automated WhatsApp messages to patients at key lifecycle moments via **Twilio WhatsApp Business API**. It uses an event-driven architecture with an EventBus for real-time triggers and node-cron for scheduled tasks.

**Provider:** Twilio (sandbox for dev, production requires WhatsApp Self Sign-up + Meta Business Verification)

**Key Files:**
- `server/src/lib/events.js` — EventBus (global EventEmitter with `safeEmit`)
- `server/src/services/notifications/whatsapp.js` — `sendWhatsApp()` function (sends via Twilio or dry-run)
- `server/src/services/notifications/templates.js` — message templates with `{{variable}}` substitution
- `server/src/services/workflows/engine.js` — registers all workflow listeners + cron jobs
- `server/src/services/workflows/` — individual workflow files (one per notification type)
- `server/src/routes/notifications.js` — admin API for viewing/retrying notifications

#### 17.9.1 Notification Types

| Type | Trigger | Category | Template Variables |
|---|---|---|---|
| **Welcome** | `patient:enrolled` event (enroll form or quick-register) | Marketing | `{{name}}` |
| **Appointment Reminder** | Cron (hourly) — appointments within next 24h | Utility | `{{name}}`, `{{serviceType}}`, `{{date}}`, `{{time}}` |
| **No-Show Follow-up** | `appointment:no-show` event (admin marks no-show) | Utility | `{{name}}`, `{{serviceType}}`, `{{date}}`, `{{time}}` |
| **Package Milestone** | `visit:recorded` event — every 5th visit | Marketing | `{{name}}`, `{{visitNumber}}`, `{{totalSessions}}`, `{{packageName}}` |
| **Package Completion** | `package:completed` event — final visit | Marketing | `{{name}}`, `{{packageName}}`, `{{totalSessions}}` |
| **Re-engagement** | Cron (daily 10 AM) — active package, no visit in 30+ days | Marketing | `{{name}}` |

#### 17.9.2 Deduplication Rules

- **Welcome:** Only one welcome notification per patient (checks existing records)
- **Reminder:** Uses `appointment.reminderSent` flag to prevent duplicates
- **Re-engagement:** Max one per patient per 30-day window

#### 17.9.3 Message Flow

1. Workflow checks patient's `whatsappConsent` field (default: true)
2. `renderTemplate()` picks a random variant from the template pool and substitutes variables
3. `sendWhatsApp()` creates a `pending` Notification record in DB
4. Sends via Twilio API (or logs in dry-run mode if `WHATSAPP_ENABLED=false`)
5. Updates Notification record with `sent`/`failed` status, Twilio SID, and timestamp

#### 17.9.4 Admin Notifications Page (`/admin/notifications`)

- Paginated table with filters: type, status, date range
- Shows: patient name, type, status badge, message preview, sent time
- **Retry** button for failed notifications
- Summary stats: total sent, failed, pending

#### 17.9.5 Environment Variables

```env
TWILIO_ACCOUNT_SID=         # Twilio account identifier
TWILIO_AUTH_TOKEN=          # Twilio auth token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886  # Twilio sender (sandbox or production number)
WHATSAPP_COUNTRY_CODE=+91  # Country code for mobile formatting
WHATSAPP_ENABLED=false      # true = send via Twilio, false = dry-run (log only)
```

#### 17.9.6 Twilio Production Upgrade (from Sandbox)

The sandbox only delivers to numbers that opted in. For production:
1. Buy a Twilio virtual number ($1-2/month) at Console → Phone Numbers → Buy
2. Register as WhatsApp sender at Console → Messaging → WhatsApp Senders → Self Sign-up
3. Complete Meta Business Verification (PAN/GSTIN, 2-7 days)
4. Create message templates in Content Template Builder (approved in 24-48h)
5. Update `TWILIO_WHATSAPP_FROM` in production `.env` to the new number

#### 17.9.7 Database Model

```prisma
model Notification {
  id              String    @id @default(cuid())
  patientId       String
  patient         Patient   @relation(...)
  type            String    // welcome, milestone, completion, reminder, no-show, re-engagement
  channel         String    @default("whatsapp")
  toNumber        String
  messageContent  String
  templateName    String?
  status          String    @default("pending") // pending, sent, delivered, failed
  twilioSid       String?
  errorMessage    String?
  metadata        Json?
  sentAt          DateTime?
  deliveredAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

### 17.9.8 Auto-Visit on Appointment Completion

When Dr. Neha marks an appointment as **"completed"** in the admin panel, the system automatically records a visit on the patient's active treatment package. This eliminates the need for a separate manual "Add Visit" step.

**How it works:**
1. Admin PATCH `/api/appointments/:id` with `status: 'completed'`
2. System checks: was the previous status NOT already `completed`? (prevents double-counting)
3. Finds the patient's active package (prefers `appointment.packageId` if linked, otherwise most recent active package)
4. Creates a `PatientVisit` record with `markedBy: 'Auto (appointment completed)'`
5. Emits `visit:recorded` event → triggers milestone notification (every 5th visit)
6. If this was the final session, auto-completes the package → triggers completion notification
7. If no active package exists, appointment is simply marked completed with no visit side-effect

**Safeguards:**
- Only triggers on status **transition** to `completed` (not if already completed)
- Only if active package has remaining sessions
- If auto-visit fails, the appointment update still succeeds (non-blocking)
- `markedBy` field shows "Auto (appointment completed)" for audit trail

### 17.10 Business Rules

- **Enrolled patients only** — a patient must be enrolled (have a Patient ID) before booking an appointment. The booking page links to `/enroll` for new patients.
- **Booking window** — patients can book appointments up to 30 days in advance, minimum 2 hours before the slot start time.
- **Cancellation policy** — patients can cancel up to 4 hours before the appointment. After that, cancellation requires calling the clinic.
- **No-show tracking** — if a patient doesn't show up, staff marks the appointment as `no-show`. Repeated no-shows (≥3) trigger a flag on the patient profile.
- **One active appointment per slot per patient** — a patient cannot book the same date+time twice.
- **Slot capacity enforcement** — bookings are rejected once `booked >= maxPatients` for a slot. For group sessions (like the 7PM Women's Health batch), `maxPatients` can be set higher (e.g., 8–10).
- **Walk-ins** — staff can create appointments for walk-in patients directly from the admin calendar, even for the current time slot.
- **Rescheduling** — treated as cancel + re-book in a single transaction. The old slot opens up, the new slot gets booked.
- **Completed appointments** — when staff marks an appointment as `completed`, the system **automatically records a visit** in the patient's active treatment package (see 17.9.8). This also triggers milestone/completion WhatsApp notifications.

### 17.11 Site Architecture Update

Add to the site architecture (Section 3):

```
/book                      → Appointment Booking (patient-facing: select service → date → time → confirm)
/admin/availability        → Doctor Availability Management (configure weekly schedule, overrides)
/admin/calendar            → Appointment Calendar View (weekly timeline, manage appointments)
```

### 17.12 UI Components

| Component | Purpose |
|---|---|
| `<SlotPicker />` | Date + time slot selection grid for patients |
| `<AvailabilityCalendar />` | Monthly calendar showing available/full/blocked days |
| `<DailySchedule />` | Timeline view of today's appointments for admin dashboard |
| `<WeeklyCalendar />` | Full week view with appointment blocks for admin |
| `<AvailabilityEditor />` | Weekly schedule configuration form for admin |
| `<SlotOverrideForm />` | Block/modify specific dates or slots |
| `<AppointmentCard />` | Patient name, time, service, status badge, action buttons |
| `<BookingConfirmation />` | Summary card after successful booking |

## 18. Website Traffic & Visitor Analytics

Track how many users visit the public-facing website hosted on the VPS. This is a lightweight, self-hosted, privacy-friendly analytics system — no third-party scripts (no Google Analytics, no cookies, no GDPR consent banner needed).

### 18.1 Goals

- Track **unique visitors** and **total page views** per day/week/month
- Show which **pages** are most visited (Home, Services, Enroll, Contact, Book, etc.)
- Show **referrer sources** (direct, Google, social media, WhatsApp links)
- Show **device type** breakdown (mobile vs desktop)
- Display analytics in a new **admin dashboard card** and a dedicated **admin analytics page**
- Zero impact on page load speed — tracking is server-side via API middleware, not a client-side script

### 18.2 Approach — Server-Side Middleware + Lightweight Client Beacon

Use a hybrid approach:
1. **Server-side middleware** on the Express API to log every request with metadata (IP hash, user-agent, referrer, path, timestamp)
2. **Lightweight client beacon** — a single `POST /api/track` call on each page navigation (captured via React Router) to log SPA page views that don't hit the server

This avoids the limitations of pure nginx log parsing (no SPA route visibility) and pure client-side tracking (blocked by ad-blockers).

### 18.3 Database Schema — New Models

```prisma
model PageView {
  id          String   @id @default(cuid())
  visitorId   String               // hashed IP + user-agent (anonymous, no PII)
  path        String               // e.g. "/services/physiotherapy"
  referrer    String?              // e.g. "https://google.com", "direct"
  userAgent   String?              // raw user-agent string
  deviceType  String?              // "mobile", "desktop", "tablet"
  browser     String?              // "Chrome", "Safari", "Firefox", etc.
  country     String?              // optional, from IP geolocation (free API)
  sessionId   String?              // groups page views into sessions (30-min window)
  createdAt   DateTime @default(now())

  @@index([createdAt])
  @@index([visitorId])
  @@index([path])
}

model DailyStats {
  id             String   @id @default(cuid())
  date           DateTime @unique @db.Date  // one row per day
  uniqueVisitors Int      @default(0)
  totalPageViews Int      @default(0)
  topPages       Json?    // [{ path: "/", views: 120 }, ...]
  topReferrers   Json?    // [{ source: "google.com", count: 45 }, ...]
  deviceBreakdown Json?   // { mobile: 60, desktop: 35, tablet: 5 }
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

### 18.4 API Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/api/track` | None | Client beacon — logs a page view (rate-limited to 1 req/sec per IP) |
| `GET` | `/api/admin/analytics/summary` | Admin JWT | Dashboard summary: today's visitors, page views, top pages, 7-day trend |
| `GET` | `/api/admin/analytics/daily` | Admin JWT | Daily stats for a date range (`?from=&to=`), returns `DailyStats[]` |
| `GET` | `/api/admin/analytics/pages` | Admin JWT | Top pages for a date range, sorted by views |
| `GET` | `/api/admin/analytics/referrers` | Admin JWT | Top referrer sources for a date range |

### 18.5 POST /api/track — Client Beacon

**Request body:**
```json
{
  "path": "/services/physiotherapy",
  "referrer": "https://google.com"
}
```

**Server extracts from request headers:**
- `req.ip` or `X-Real-IP` (from nginx proxy) → hashed with a daily-rotating salt for anonymity
- `User-Agent` → parsed for device type and browser name
- Referrer fallback from `Referer` header if not in body

**Rate limiting:** Max 60 requests per minute per IP (express-rate-limit). Reject with 429 if exceeded.

**Response:** `204 No Content` (fire-and-forget from client)

### 18.6 Client-Side Integration

In the React app, add a `usePageTracking` hook that fires on every route change:

```jsx
// client/src/hooks/usePageTracking.js
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'

export default function usePageTracking() {
  const location = useLocation()

  useEffect(() => {
    // Don't track admin pages
    if (location.pathname.startsWith('/admin')) return

    axios.post('/api/track', {
      path: location.pathname,
      referrer: document.referrer || 'direct',
    }).catch(() => {}) // fire-and-forget, never block UI
  }, [location.pathname])
}
```

Place the hook in `App.jsx` inside the `<BrowserRouter>`:
```jsx
function AppRoutes() {
  usePageTracking()
  return <Routes>...</Routes>
}
```

### 18.7 Server Middleware — Visitor Hashing

```js
// server/src/middleware/analytics.js
const crypto = require('crypto')

// Rotate salt daily so visitor IDs can't be tracked across days
let currentSalt = crypto.randomBytes(16).toString('hex')
let saltDate = new Date().toDateString()

function getVisitorId(ip, userAgent) {
  const today = new Date().toDateString()
  if (today !== saltDate) {
    currentSalt = crypto.randomBytes(16).toString('hex')
    saltDate = today
  }
  return crypto.createHash('sha256')
    .update(`${ip}:${userAgent}:${currentSalt}`)
    .digest('hex')
    .substring(0, 16)
}

function parseDeviceType(ua) {
  if (!ua) return 'unknown'
  if (/mobile|android|iphone|ipad/i.test(ua)) return /ipad|tablet/i.test(ua) ? 'tablet' : 'mobile'
  return 'desktop'
}

function parseBrowser(ua) {
  if (!ua) return 'unknown'
  if (/edg/i.test(ua)) return 'Edge'
  if (/chrome|crios/i.test(ua)) return 'Chrome'
  if (/firefox|fxios/i.test(ua)) return 'Firefox'
  if (/safari/i.test(ua)) return 'Safari'
  if (/opera|opr/i.test(ua)) return 'Opera'
  return 'Other'
}
```

### 18.8 Daily Stats Aggregation

Run a scheduled aggregation (cron job or on-demand) that rolls up `PageView` rows into `DailyStats`:

```js
// server/src/jobs/aggregateStats.js
// Runs once daily (e.g., via setInterval or node-cron at midnight)
// 1. Count distinct visitorId for the day → uniqueVisitors
// 2. Count total PageView rows for the day → totalPageViews
// 3. Group by path, order by count desc, take top 10 → topPages
// 4. Group by referrer domain, order by count desc, take top 10 → topReferrers
// 5. Group by deviceType → deviceBreakdown
// 6. Upsert into DailyStats for that date
```

Also **purge raw `PageView` rows** older than 90 days to keep the database lean. `DailyStats` rows are kept indefinitely since they're small.

### 18.9 Admin Dashboard Integration

Add a new stat card on the Dashboard (`Dashboard.jsx`):

```
<StatCard icon={BarChart3} color="#6366F1" label="Visitors Today" value={fmt(data.visitorsToday)} to="/admin/analytics" />
```

The `/api/admin/dashboard` endpoint should include two new fields:
```json
{
  "visitorsToday": 42,
  "pageViewsToday": 187
}
```

### 18.10 Admin Analytics Page — `/admin/analytics`

A dedicated page with:

| Section | Content |
|---------|---------|
| **Summary cards** | Visitors today, page views today, avg. session duration, bounce rate |
| **Visitors chart** | Line chart (7-day or 30-day) of unique visitors per day |
| **Top pages** | Bar chart or table of top 10 visited pages |
| **Referrer sources** | Pie chart: Direct, Google, WhatsApp, Social, Other |
| **Device breakdown** | Donut chart: Mobile vs Desktop vs Tablet |
| **Date range picker** | Filter all data by custom from/to dates |

Use a lightweight chart library — **recharts** (already React-friendly, ~45KB gzipped) or plain SVG/CSS bars to avoid heavy dependencies.

### 18.11 Nginx Config Update

Forward the real client IP to Express so visitor hashing works behind the nginx reverse proxy:

```nginx
# Add to the /api/ location block in nginx.conf
proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
```

Note: `X-Real-IP` is already set in the current config. Express should use `app.set('trust proxy', 1)` to read `X-Forwarded-For` correctly.

### 18.12 Privacy & Performance

- **No cookies** — visitor identity is a hashed IP+UA with a daily-rotating salt; cannot be traced back
- **No PII stored** — raw IPs are never saved, only the truncated hash
- **Minimal payload** — the `/api/track` beacon is ~100 bytes, returns `204 No Content`
- **Non-blocking** — the client beacon is fire-and-forget (`catch(() => {})`)
- **Rate-limited** — 60 req/min per IP on the track endpoint to prevent abuse
- **Auto-cleanup** — raw `PageView` rows purged after 90 days; `DailyStats` kept permanently
- **Admin-only access** — all analytics read endpoints require JWT auth

### 18.13 Dependencies to Add

| Package | Where | Purpose |
|---------|-------|---------|
| `express-rate-limit` | server | Rate-limit the `/api/track` endpoint |
| `node-cron` | server | Schedule daily stats aggregation at midnight |
| `recharts` | client | Charts on the admin analytics page (optional — can use CSS bars instead) |

### 18.14 Site Architecture Update

Add to the site architecture (Section 3):

```
/admin/analytics           → Website Traffic Analytics (visitor stats, page views, referrers, device breakdown)
```

### 18.15 Files to Create / Modify

| File | Action | Purpose |
|------|--------|---------|
| `server/prisma/schema.prisma` | Modify | Add `PageView` and `DailyStats` models |
| `server/src/middleware/analytics.js` | Create | Visitor hashing, device/browser parsing |
| `server/src/routes/track.js` | Create | `POST /api/track` beacon endpoint |
| `server/src/routes/admin.js` | Modify | Add `/analytics/summary`, `/analytics/daily`, `/analytics/pages`, `/analytics/referrers` |
| `server/src/jobs/aggregateStats.js` | Create | Daily stats rollup + old PageView cleanup |
| `server/src/index.js` | Modify | Mount `/api/track` route, register cron job, set `trust proxy` |
| `client/src/hooks/usePageTracking.js` | Create | React hook to beacon page views on route change |
| `client/src/App.jsx` | Modify | Add `usePageTracking()` hook call |
| `client/src/pages/admin/Analytics.jsx` | Create | Admin analytics dashboard page |
| `client/src/pages/admin/Dashboard.jsx` | Modify | Add "Visitors Today" stat card |
| `client/nginx.conf` | Modify | Add `X-Forwarded-For` header |

### 18.16 Implementation Order

1. Add Prisma models (`PageView`, `DailyStats`) and run migration
2. Create analytics middleware (visitor hashing, device parsing)
3. Create `POST /api/track` route with rate limiting
4. Update `server/src/index.js` (mount route, trust proxy, cron job)
5. Create daily stats aggregation job
6. Add admin analytics API endpoints
7. Create client-side `usePageTracking` hook and wire into `App.jsx`
8. Build admin analytics page with charts
9. Add "Visitors Today" stat card to Dashboard
10. Update nginx config with `X-Forwarded-For`
11. Deploy (schema change → full pipeline: Steps 1–7 from deployment SKILL)

---

## 19. Guest Appointment Booking (Quick Book Without Enrollment)

### 19.1 Problem Statement

The current booking flow (`/book`) requires patients to be enrolled before they can book an appointment. The enrollment form (`/enroll`) is a 4-step process collecting extensive medical history, insurance, fitness goals, and contact details. This creates a significant barrier:

- **Drop-off friction:** Users arriving from Google, social media, or word-of-mouth want to book quickly. Being forced to complete a lengthy intake form first causes abandonment.
- **Hidden requirement:** The `/book` page gives no upfront indication that enrollment is required. Users only discover this after entering a mobile number and hitting "Patient not found."
- **Redirect breaks momentum:** Being sent away from `/book` to `/enroll` (a separate multi-step form) disrupts intent. Many users won't return.
- **Analytics evidence:** Website analytics may show users landing on `/book` and leaving without completing any action — a clear sign of booking funnel abandonment.

### 19.2 Current Flow (Problematic)

```
User visits /book
  → Enter mobile/Patient ID
  → "Patient not found" error
  → Link to /enroll (4-step form: Personal → Contact → Program → Goals)
  → Complete enrollment → Get Patient ID
  → Return to /book → Search again → Select service → Pick slot → Confirm
```

**Total steps before first appointment: 8+**

### 19.3 Proposed Solution — Inline Quick Registration on `/book`

Allow new visitors to book an appointment with **minimal information**, collecting only what's needed for the appointment. Full enrollment details can be completed later (at the clinic or via follow-up).

**New Flow:**
```
User visits /book
  → Sees "Find Your Record" search + always-visible "New patient? Register here to book instantly" link
  → PATH A (returning patient): Enter Patient ID or mobile → found → continue to service selection
  → PATH B (new patient, direct): Click "Register here" link → inline Quick Register form appears immediately
      → Collect: Full Name, Mobile, Gender, Age (4 fields only)
      → Auto-create patient record with status "quick-registered"
      → Continue to service selection → Pick slot → Confirm
  → PATH C (new patient, searched first): Enter mobile → not found (404) → Quick Register form auto-appears
      → Mobile pre-filled from search → fill remaining 3 fields → same flow as PATH B
```

**Total steps before first appointment: 4–5**

**UX Note:** The "New patient?" link is always visible below the search field — a first-time visitor never needs to perform a failed search to discover registration. The search-triggered flow (PATH C) is a fallback for users who try their number first.

### 19.4 Data Model Changes

Add a `registrationStatus` field to the `Patient` model to distinguish quick-registered patients from fully enrolled ones:

```prisma
model Patient {
  // ... existing fields ...
  registrationStatus String @default("full")  // "full" | "quick"
  // ...
}
```

- `"full"` — completed the full `/enroll` form (existing patients, default)
- `"quick"` — registered inline during booking with minimal info

**No schema-breaking changes.** Existing patients are unaffected (default is `"full"`). Quick-registered patients have nullable fields for medical history, insurance, etc. — which the schema already supports (most fields are optional).

### 19.5 API Changes

**New endpoint: `POST /api/appointments/quick-register`** (public, rate-limited)

```
Request:  { fullName, mobile, gender, age }
Response: { id: "RF-0123", fullName, mobile, registrationStatus: "quick" }
```

- Validates: name (required, 2+ chars), mobile (required, 10 digits, unique), gender (required), age (required, 1–120)
- If mobile already exists → returns existing patient (idempotent — handles accidental re-registration)
- Creates patient with `registrationStatus: "quick"`, empty arrays for `program`, `preferredDays`, etc.
- Rate limited: 5 req/min/IP to prevent abuse

**Modify: `POST /api/appointments/lookup`**
- No changes needed — lookup by mobile already works. Quick-registered patients will be found normally.

### 19.6 Client-Side Changes (`/book` Page)

**Step 0 — Patient Identification (updated):**

Current behavior when patient not found:
```
❌ "Patient not found. Not enrolled yet? Register here →" (link to /enroll)
```

New behavior — two entry points to Quick Registration:

**1. Always-visible link (primary path for new patients):**
```
┌─────────────────────────────────────────────┐
│  Find Your Record                           │
│  Enter your Patient ID or registered mobile │
│                                             │
│  [__________________________]  [Search]     │
│                                             │
│  New patient? Register here to book instantly│  ← always visible
└─────────────────────────────────────────────┘
```
Clicking the link opens the Quick Registration form immediately — no search required.

**2. Search-triggered fallback (for users who try their number first):**
When a lookup returns 404, the Quick Registration form auto-appears with mobile pre-filled.

**Quick Registration form (same for both paths):**
```
┌─────────────────────────────────────────────┐
│  Quick Registration                         │
│  No record found. Fill in the basics to     │
│  register and book instantly.               │
│                                             │
│  Full Name:  [___________________________]  │
│  Mobile:     [__________]  Age: [____]      │
│  Gender:     (●) Male  (○) Female  (○) Other│
│                                             │
│  [Register & Continue →]   Cancel           │
│                                             │
│  Need the complete form? Full enrollment →  │
└─────────────────────────────────────────────┘
```

- Mobile field is pre-filled from the search input when triggered by 404
- On submit → `POST /api/appointments/quick-register`
- On success → auto-set patient data and proceed to Step 1 (Service selection)
- Seamless — user stays on the same page, no redirect
- "Cancel" dismisses the form; "Full enrollment form" links to `/enroll` for users who prefer the complete intake

### 19.7 Admin-Side Visibility

**Dashboard & Patients list:**
- Quick-registered patients show a badge: `Quick` (amber) vs regular patients (no badge)
- Admin can filter patients by registration status
- A banner or counter on the dashboard: "X patients need full enrollment" linking to a filtered patients view

**Patient detail/edit page:**
- If `registrationStatus === "quick"`, show a notice: "This patient was quick-registered during booking. Medical history and program details are incomplete."
- Staff can complete the remaining fields during the first visit and update status to `"full"`

### 19.8 Business Rules

- **Quick-registered patients can book appointments** — same rules as fully enrolled patients (slot capacity, cancellation policy, etc.)
- **No duplicate mobiles** — if a user tries to quick-register with a mobile that already exists, return the existing patient record instead of erroring
- **Program defaults** — quick-registered patients get empty `program[]` and `sessionType: "In-Person"` as defaults. The service they select during booking serves as their initial program indication.
- **Follow-up nudge** — when a quick-registered patient arrives for their appointment, staff should complete the full intake. The admin UI should surface this clearly.
- **Full enrollment still available** — the `/enroll` page remains unchanged for users who prefer to complete everything upfront. The "Book Your First Appointment" CTA on enrollment success still works.

### 19.9 Site Architecture Update

No new routes. The `/book` page gains an inline registration capability. The existing `/enroll` page remains for full registration.

```
/book    → Appointment Booking (now supports inline quick-registration for new patients)
/enroll  → Full Patient Enrollment (unchanged, for detailed intake)
```

### 19.10 Implementation Order

1. Add `registrationStatus` field to Patient model in Prisma schema, run migration
2. Create `POST /api/appointments/quick-register` endpoint with validation and rate limiting
3. Update `/book` page Step 0: replace "not found" error with inline quick-register form
4. Add `registrationStatus` badge to admin Patients list and patient detail page
5. Add "incomplete registrations" counter to admin Dashboard
6. Test: new user can go from `/book` → quick-register → select service → pick slot → confirm in one seamless flow
7. Deploy

## 20. Appointment Slot Duration — 45-Minute Recommended Configuration

### 20.1 Rationale

The default slot duration should be **45 minutes** for physiotherapy and rehab sessions. This is the industry-standard sweet spot:

- **Adequate treatment time**: 45 minutes covers initial assessment, hands-on treatment, exercise guidance, and patient education without rushing
- **Increased daily capacity**: 33% more patients compared to 60-minute slots
- **Natural transition buffer**: When scheduled on the hour, a 45-minute slot leaves a 15-minute gap for clinical notes, sanitization, and preparation for the next patient
- **Common in physiotherapy**: Most physio clinics globally operate on 30–45 minute sessions; 60 minutes is typically reserved for initial evaluations or complex cases

### 20.2 Capacity Comparison

| Working Hours | 60-min slots | 45-min slots | 30-min slots |
|---|---|---|---|
| 9 AM – 1 PM (4 hrs) | 4 patients | 5 patients | 8 patients |
| 2 PM – 6 PM (4 hrs) | 4 patients | 5 patients | 8 patients |
| 9 AM – 6 PM (9 hrs) | 9 patients | 12 patients | 18 patients |

**Recommended**: 45-minute slots for standard sessions, 30-minute slots for follow-ups or quick reviews.

### 20.3 How It Works (No Code Changes Required)

Slot duration is **fully configurable per availability block** via the admin panel. The system already supports any duration from 10 to 120 minutes.

**Configuration path**: Admin Dashboard → Availability → Edit/Create block → "Slot Duration (min)" field

**Architecture**:
- `DoctorAvailability.slotDuration` stores the duration in minutes (schema default: `30`)
- The `generateSlots()` function in `appointments.js` reads this value dynamically per availability block and generates slots accordingly
- Different blocks can have different durations (e.g., 45-min for therapy, 30-min for follow-ups)
- The `/book` page automatically reflects the correct slot times — no frontend changes needed

### 20.4 Recommended Setup

| Block | Days | Hours | Slot Duration | Session Type | Label |
|---|---|---|---|---|---|
| Morning OPD | Mon–Sat | 09:00–13:00 | 45 min | In-Person | Morning Session |
| Afternoon OPD | Mon–Sat | 14:00–18:00 | 45 min | In-Person | Afternoon Session |
| Follow-up slots | Mon, Wed, Fri | 18:00–19:00 | 30 min | In-Person | Quick Follow-up |
| Online consult | Tue, Thu | 18:00–19:30 | 30 min | Online | Online Consultation |

### 20.5 Admin Action

To switch from 60-minute to 45-minute slots:
1. Go to **Admin > Availability**
2. Edit each availability block
3. Change "Slot Duration" from `60` to `45`
4. Save — new slots are generated immediately for future bookings
5. Existing appointments are unaffected (they store absolute start/end times)

## 21. Admin-Side Appointment Booking (Book on Behalf of Patient)

### 21.1 Problem Statement

Currently, appointments can only be booked via the public `/book` page. There is no way for staff or doctors to book an appointment for a patient from the admin panel. This creates friction in several common clinic scenarios:

- **Phone bookings**: Patient calls the clinic to schedule — staff must use the patient-facing `/book` page, which is awkward and slow
- **Follow-up scheduling**: After a session, the doctor wants to book the patient's next visit immediately while discussing the treatment plan
- **Elderly/non-tech patients**: Many rehab patients (post-surgery, elderly) can't navigate the online booking system themselves
- **Walk-in scheduling**: Staff books the next appointment before the patient leaves the clinic
- **Clinical decisions**: Doctor reviews records and decides the patient needs to come in — wants to book right from the patient's admin page

### 21.2 Solution

Add a **"Book" action button** to the admin Patients table (alongside existing Edit, Visits, Payment actions) that opens an inline booking modal. The patient is already identified, so the flow skips the lookup step and goes straight to slot selection.

### 21.3 User Flow

```
Admin > Patients > Click "Book" on a patient row
  → Modal opens with patient name pre-filled (read-only)
  → Select service type (dropdown: Physiotherapy, Consultation, etc.)
  → Select session type (In-Person / Online / Home Visit — defaults to patient's preference)
  → Pick a date (calendar, same as public /book page)
  → Pick an available time slot (fetched from /api/appointments/slots)
  → Optional: Add notes
  → Click "Book Appointment"
  → Success → toast/confirmation → modal closes
```

### 21.4 Architecture — No New API Endpoints

The existing public `POST /api/appointments` endpoint accepts `{ patientId, appointmentDate, startTime, endTime, serviceType, sessionType, notes }` — all the fields the admin modal will provide. The slot availability check (`GET /api/appointments/slots?date=`) is also public. **No new server routes are needed.**

The only change is client-side: adding the "Book" button and a booking modal to the admin Patients page.

### 21.5 UI Design

**Patients table — Actions column (line 324–344 of Patients.jsx):**
Add a "Book" link after the existing "Payment" link:
```jsx
<Link to={`/book?patientId=${p.id}&admin=1`}
  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium whitespace-nowrap">
  <CalendarPlus size={13} /> Book
</Link>
```

**Two approaches (choose one):**

**Option A — Link to `/book` with pre-filled patient (simpler):**
- Add `patientId` query param support to the existing `/book` page
- When `patientId` is present, auto-lookup the patient and skip to Step 1 (service selection)
- Add an `admin=1` param to show a "Back to Patients" link instead of the public nav
- Reuses 100% of existing booking UI — no code duplication

**Option B — Inline modal on Patients page (richer UX):**
- A modal/drawer that embeds a compact booking form directly in the admin patients view
- Staff never leaves the patients page
- More code to write, but better workflow for rapid sequential bookings

**Recommended: Option A** — it reuses the battle-tested `/book` page flow with minimal changes. The admin just gets a direct shortcut that skips the patient lookup step.

### 21.6 `/book` Page Changes for Admin Pre-Fill

When the URL contains `?patientId=RF-XXXX`:
1. On mount, auto-call `getPatient(patientId)` or `lookupPatient(patientId)`
2. If found, set patient data and advance directly to Step 1 (service selection)
3. If `admin=1` is in the URL, show a "← Back to Patients" link at the top instead of the regular patient search header
4. The rest of the booking flow (service → date → slot → confirm) works identically

### 21.7 Files to Modify

| # | File | Change |
|---|------|--------|
| 1 | `client/src/pages/admin/Patients.jsx` | Add "Book" action link with `CalendarPlus` icon |
| 2 | `client/src/pages/Book.jsx` | Accept `patientId` and `admin` query params, auto-lookup and skip Step 0 |

**No server changes required.** Existing endpoints handle everything.

### 21.8 Implementation Details

**`client/src/pages/admin/Patients.jsx`:**
- Add `CalendarPlus` to lucide imports
- Add a "Book" link in the actions column (after Payment): `<Link to={/book?patientId=${p.id}&admin=1}>`

**`client/src/pages/Book.jsx`:**
- Read `patientId` and `admin` from `useSearchParams()`
- In `useEffect`, if `patientId` is present, call `lookupPatient(patientId)` and on success set patient + advance to Step 1
- If `admin=1`, render a "← Back to Patients" link at the top of the card
- The public flow (manual search / quick-register) remains unchanged when no params are present

### 21.9 Business Rules

- **Same slot validation**: Admin bookings go through the same availability and capacity checks as patient bookings — no overbooking
- **Same API endpoint**: `POST /api/appointments` — no special admin booking route needed
- **Audit trail**: The appointment record is identical regardless of who booked it (patient or admin)
- **Quick-reg patients**: Staff can book for quick-registered patients too — the "Book" button appears for all patients regardless of `registrationStatus`

### 21.10 Implementation Order

1. Add "Book" action link to admin Patients table (Patients.jsx)
2. Update `/book` page to accept `patientId` query param and auto-skip Step 0
3. Add `admin=1` param handling for "Back to Patients" navigation
4. Test: Admin clicks "Book" on a patient → lands on `/book` with patient pre-filled → selects service → picks slot → confirms
5. Deploy

