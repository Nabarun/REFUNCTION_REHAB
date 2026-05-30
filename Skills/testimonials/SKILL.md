# Testimonials

Use this skill whenever you need to work on patient testimonials — public display, admin CRUD, homepage carousel, service-filtered display, or the Testimonial data model.

## Architecture

| Page | Route | File |
|------|-------|------|
| Public Testimonials | `/testimonials` | `client/src/pages/Testimonials.jsx` |
| Admin Testimonials | `/admin/testimonials` | `client/src/pages/admin/Testimonials.jsx` |
| Homepage Carousel | `/` (section) | `client/src/components/testimonials/TestimonialCarousel.jsx` |

| API Route File | Endpoints |
|----------------|-----------|
| `server/src/routes/testimonials.js` | Public queries + admin CRUD |

## Prisma Model

```prisma
model Testimonial {
  id                String   @id @default(cuid())
  patientName       String                     // Display name (can be first name only)
  patientInitials   String?                    // e.g., "R.K." for anonymity
  age               Int?
  gender            String?
  condition         String                     // e.g., "Chronic Back Pain"
  service           String                     // seniors|womens-health|pain-management|sports-rehab|post-surgery|kids
  rating            Int      @default(5)       // 1-5 star rating
  reviewText        String                     // The testimonial content
  videoUrl          String?                    // YouTube/video link
  photoUrl          String?                    // Patient photo (with consent)
  treatmentDuration String?                    // e.g., "3 months"
  outcome           String?                    // e.g., "Pain-free in 8 weeks"
  isApproved        Boolean  @default(false)   // Only approved shown publicly
  isFeatured        Boolean  @default(false)   // Featured on homepage carousel
  consentGiven      Boolean  @default(true)    // Patient consent for public display
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@map("testimonials")
}
```

## API Endpoints

### Public (No Auth)

**GET `/api/testimonials`** — Get approved testimonials
```
Query:    service=<slug>, featured=true, limit=<N>
Response: [{ id, patientName, patientInitials, age, condition, service,
             rating, reviewText, videoUrl, photoUrl, treatmentDuration,
             outcome, isFeatured, createdAt }]
```
- Only returns `isApproved: true` testimonials
- Filterable by `service` slug and `featured` flag
- `limit` restricts result count (for homepage carousel)

**GET `/api/testimonials/:id`** — Get single testimonial
```
Response: { ...testimonial }
```
- Only returns approved testimonials

### Admin (Protected)

**GET `/api/testimonials/admin/all`** — List all testimonials
```
Query:    page=1, limit=20, status=<approved|pending>, service=<slug>
Response: {
  testimonials: [{ ...testimonial }],
  total, page, totalPages
}
```

**POST `/api/testimonials/admin`** — Create testimonial
```
Request: {
  patientName: string,       // required
  patientInitials?: string,
  age?: number,
  gender?: string,
  condition: string,         // required
  service: string,           // required (slug)
  rating?: number,           // default 5
  reviewText: string,        // required
  videoUrl?: string,
  photoUrl?: string,
  treatmentDuration?: string,
  outcome?: string,
  consentGiven: boolean      // required, must be true
}
Response: { ...testimonial, isApproved: false }
```
- Created with `isApproved: false` by default

**PATCH `/api/testimonials/admin/:id`** — Update testimonial
```
Request:  { ...fieldsToUpdate, isApproved?, isFeatured? }
Response: { ...updatedTestimonial }
```
- Used for editing content, approving/rejecting, and featuring/unfeaturing

**DELETE `/api/testimonials/admin/:id`** — Delete testimonial
```
Response: { message: "Deleted" }
```

## Key Files

| File | Purpose |
|------|---------|
| `server/src/routes/testimonials.js` | Public + admin testimonial endpoints |
| `client/src/pages/Testimonials.jsx` | Public testimonials page with service filters |
| `client/src/pages/admin/Testimonials.jsx` | Admin CRUD management |
| `client/src/components/testimonials/TestimonialCard.jsx` | Individual testimonial card |
| `client/src/components/testimonials/TestimonialCarousel.jsx` | Auto-scrolling homepage carousel |
| `client/src/lib/api.js` | `getTestimonials()`, `getTestimonial()`, `getAdminTestimonials()`, `createTestimonial()`, `updateTestimonial()`, `deleteTestimonial()` |

## Operations

### Adding a New Testimonial (Admin Workflow)

1. Dr. Neha gets verbal/written consent from patient
2. Staff navigates to `/admin/testimonials`
3. Clicks "Add Testimonial" → fills form:
   - Patient Name, Initials (for anonymity), Age, Gender
   - Condition Treated, Service Category (dropdown)
   - Rating (1-5 stars), Review Text
   - Treatment Duration, Outcome
   - Optional: Video URL, Photo URL
   - Consent checkbox (mandatory)
4. Submit → testimonial created with `isApproved: false`
5. Staff reviews → toggles `isApproved: true` to publish
6. Optionally marks `isFeatured: true` for homepage carousel

### Service Categories

| Slug | Display Name |
|------|-------------|
| `seniors` | Physiotherapy for Seniors |
| `womens-health` | Women's Health & Postnatal |
| `pain-management` | Back, Neck & Shoulder Pain |
| `sports-rehab` | Sports Injury Rehab |
| `post-surgery` | Post-Surgery Rehab |
| `kids` | Kids Exercise Program |

### Homepage Carousel

- Placed between Feature Blocks and CTA Banner
- Shows 3-4 featured testimonials (auto-scroll, pause on hover)
- Data: `GET /api/testimonials?featured=true`
- Each card: teal quote icon, star rating, quote excerpt, patient name/initials, condition badge, outcome badge
- "View All Testimonials" link to `/testimonials`
- Also includes a Google Reviews link

### Service Detail Page Integration

Each service detail page shows 1-2 relevant testimonials at the bottom:
```
GET /api/testimonials?service={slug}&limit=2&featured=true
```

### Public Testimonials Page Layout

- Hero: gradient banner "Patient Success Stories"
- Filter tabs: All | Seniors | Women's Health | Pain Management | Sports Injury | Post-Surgery | Kids
- Grid: 2 columns desktop, 1 column mobile
- Each card: full review, stars, patient info, condition, service, duration, outcome
- Video testimonials: embedded player if `videoUrl` present

## Business Rules

- **Consent is mandatory** — `consentGiven` must be `true` before a testimonial can be approved
- **Approved = public** — only `isApproved: true` testimonials appear on public pages
- **Featured = homepage** — only `isFeatured: true` testimonials appear in the homepage carousel
- **Privacy options** — patients can use full name, first name only, or initials (`patientInitials`)
- **Age is displayed as range** — e.g., "60s" not exact age
- **No fabrication** — all testimonials must come from real patients
- **No medical records** — only share what the patient consents to
- **Photo requires explicit consent** — only used when patient agrees

## Common Issues

**Testimonial not showing on homepage** — Check both `isApproved: true` AND `isFeatured: true` are set.

**Wrong service filter** — Ensure the `service` field uses the exact slug (e.g., `womens-health` not `Women's Health`).

**Video not playing** — Check `videoUrl` format. Must be a valid YouTube/Vimeo URL.

## Related Skills

- [Brand & Design](../brand-and-design/SKILL.md) — TestimonialCard and carousel styling
- [Frontend Development](../frontend-development/SKILL.md) — Component patterns and page layout
