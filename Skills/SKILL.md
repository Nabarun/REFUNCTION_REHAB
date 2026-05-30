---
name: refunction-rehab-website
description: Index skill for ReFunction Rehab. Routes you to the correct domain-specific sub-skill. Use this skill whenever the user mentions ReFunction Rehab, Dr. Neha Trivedi's clinic, or any feature of this project.
---

# ReFunction Rehab — Skill Index

This is the root index. Each domain has its own self-contained skill file with models, endpoints, files, and business rules. **Read only the sub-skill you need.**

## Brand Identity (Quick Reference)

| Field | Value |
|---|---|
| **Clinic Name** | ReFunction Rehab |
| **Tagline** | Move Better. Feel Better. Live Better. |
| **Lead Doctor** | Dr. Neha Trivedi, PT, MPT (15+ Years) |
| **Phone / WhatsApp** | 99009 11795 |
| **Colors** | Navy `#1B2F5E` · Teal `#1A7F8E` · Orange `#E8630A` · Gold `#F5A623` · Green `#4CAF50` |
| **Fonts** | Playfair Display (headings) · DM Sans (body) · Oswald (accent numbers) |

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite, Tailwind CSS, React Router v6, Framer Motion |
| Backend | Node.js + Express |
| Database | PostgreSQL 16 (Docker) + Prisma ORM |
| Payments | Razorpay |
| Notifications | Twilio WhatsApp |
| Auth | JWT + bcrypt |
| Containers | Docker Compose |

## Site Routes

```
/                          → Home (Hero + Services + Testimonials + CTA)
/services                  → All services listing
/services/:slug            → Service detail (seniors, womens-health, pain-management, sports-rehab, post-surgery, kids)
/about                     → About Dr. Neha + Clinic
/enroll                    → Patient Enrollment Form
/book                      → Appointment Booking (+ inline quick-register)
/payment                   → Payment Collection
/contact                   → Contact + Location
/testimonials              → Patient Testimonials
/admin                     → Login → Dashboard
/admin/dashboard           → Stats, recent activity, packages needing attention
/admin/patients            → Patient list, search, filter, export, packages modal
/admin/patients/:id/edit   → Edit patient details
/admin/payments            → Payment records, revenue summary, export
/admin/testimonials        → Manage testimonials
/admin/availability        → Doctor weekly schedule + slot overrides
/admin/calendar            → Appointment calendar view (alias for /admin/appointments)
/admin/appointments        → Appointment management
/admin/analytics           → Website traffic analytics
/admin/notifications       → WhatsApp notification history
```

## Database Models (13)

Patient · Payment · ContactInquiry · Staff · Testimonial · TreatmentPackage · PatientVisit · DoctorAvailability · SlotOverride · Appointment · PageView · Notification · DailyStats

## Sub-Skills Index

| # | Skill | Path | Use When... |
|---|-------|------|-------------|
| 1 | [Brand & Design](brand-and-design/SKILL.md) | `Skills/brand-and-design/` | Changing colors, fonts, logos, images, UI component styling |
| 2 | [Patient Management](patient-management/SKILL.md) | `Skills/patient-management/` | Enrollment, patient search, profile editing, CSV export |
| 3 | [Payment & Billing](payment-billing/SKILL.md) | `Skills/payment-billing/` | Payments, receipts, GST, fee breakdown, payment modes |
| 4 | [Treatment Packages](treatment-packages/SKILL.md) | `Skills/treatment-packages/` | Package lifecycle, visit tracking, session counting |
| 5 | [Appointment Booking](appointment-booking/SKILL.md) | `Skills/appointment-booking/` | Booking flow, cancellation, admin schedule, quick-register |
| 6 | [Availability & Scheduling](availability-scheduling/SKILL.md) | `Skills/availability-scheduling/` | Doctor weekly schedule, slot overrides, capacity config |
| 7 | [Testimonials](testimonials/SKILL.md) | `Skills/testimonials/` | Testimonial CRUD, public display, carousel, privacy |
| 8 | [WhatsApp Notifications](whatsapp-notifications/SKILL.md) | `Skills/whatsapp-notifications/` | Twilio, message templates, event-driven workflows |
| 9 | [Analytics](analytics/SKILL.md) | `Skills/analytics/` | Page tracking, visitor stats, daily aggregation |
| 10 | [Auth & Admin](auth-and-admin/SKILL.md) | `Skills/auth-and-admin/` | JWT auth, login, dashboard stats, contact inquiries |
| 11 | [Database Migrations](database-migrations/SKILL.md) | `Skills/database-migrations/` | Prisma schema changes, migration creation |
| 12 | [Frontend Development](frontend-development/SKILL.md) | `Skills/frontend-development/` | React patterns, routing, Tailwind, components, forms |
| 13 | [Deployment](deployment/SKILL.md) | `Skills/deployment/` | Building, pushing, deploying to VPS |

## Data Persistence Rules

- Every form submission MUST save to PostgreSQL via Prisma — no `console.log` placeholders
- Enrollment and payment are independent operations (one-to-many)
- PostgreSQL data persists via Docker named volume `postgres_data`
- One-command startup: `docker compose up --build`

## Environment Variables

```
DATABASE_URL, JWT_SECRET, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET,
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM,
CLOUDINARY_URL, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
TWILIO_WHATSAPP_FROM, WHATSAPP_COUNTRY_CODE, WHATSAPP_ENABLED,
VITE_API_URL
```
