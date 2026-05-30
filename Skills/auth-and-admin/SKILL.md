# Auth & Admin

Use this skill whenever you need to work on JWT authentication, staff login, admin dashboard overview stats, contact inquiry management, or the admin layout/navigation.

## Architecture

| Component | Detail |
|-----------|--------|
| Auth method | JWT (jsonwebtoken) + bcrypt |
| Token storage | `localStorage` key `rfr_token` |
| Token expiry | 8 hours |
| Middleware | `server/src/middleware/auth.js` (`requireAuth`) |
| Protected routes | All `/api/admin/*` endpoints |

| Page | Route | File |
|------|-------|------|
| Login | `/admin` or `/admin/login` | `client/src/pages/admin/Login.jsx` |
| First-time Setup | `/admin/setup` | `client/src/pages/admin/Setup.jsx` |
| Dashboard | `/admin/dashboard` | `client/src/pages/admin/Dashboard.jsx` |
| Admin Layout | (wrapper) | `client/src/components/admin/AdminLayout.jsx` |

## Prisma Models

```prisma
model Staff {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  role         String   @default("staff")
  createdAt    DateTime @default(now())

  @@map("staff")
}

model ContactInquiry {
  id        String   @id @default(cuid())
  name      String
  phone     String
  message   String
  createdAt DateTime @default(now())
  resolved  Boolean  @default(false)

  @@map("contact_inquiries")
}
```

## API Endpoints

### Authentication

**POST `/api/auth/login`** — Staff login
```
Request:  { email: string, password: string }
Response: { token: string, staff: { id, name, email, role } }
```
- Validates email + password against bcrypt hash
- Returns JWT with 8-hour expiry
- JWT payload: `{ staffId, email, role }`

**POST `/api/auth/setup`** — One-time admin setup
```
Request:  { name: string, email: string, password: string }
Response: { message: string, staff: { id, name, email } }
```
- Only works when zero Staff records exist
- Creates the first admin account
- Subsequent calls return 403

### Dashboard

**GET `/api/admin/dashboard`** [Protected]
```
Query:    ?month=0-11&year=YYYY (optional, defaults to current month)
Response: {
  totalPatients, newPatientsToday, newPatientsThisMonth,
  totalRevenue, revenueToday, revenueThisMonth,
  selectedMonth, selectedYear,
  pendingPayments,          // count: enrolled-but-unpaid + partial/pending payments
  activePackages,           // count of active treatment packages
  visitsToday,              // visits recorded today
  visitorsToday,            // website visitors today (from analytics)
  pageViewsToday,           // page views today
  recentEnrollments[],      // last 10
  recentPayments[],         // last 10
  paymentModeBreakdown{},   // { cash: N, upi: N, card: N, ... }
  attentionPackages[],      // packages with <=2 sessions remaining
  todayInquiries[],         // today's contact inquiries
  unresolvedInquiries       // count of unresolved inquiries
}
```

### Contact Inquiries

**POST `/api/contact`** — Submit contact inquiry (public)
```
Request:  { name: string, phone: string, message: string }
Response: { message: "Thank you..." }
```

**PATCH `/api/admin/inquiries/:id`** [Protected] — Resolve inquiry
```
Request:  { resolved: boolean }
Response: { id, name, phone, message, resolved, createdAt }
```

## Key Files

| File | Purpose |
|------|---------|
| `server/src/routes/auth.js` | Login + setup routes |
| `server/src/routes/admin.js` | Dashboard + inquiry management + patient/payment admin endpoints |
| `server/src/routes/contact.js` | Public contact form submission |
| `server/src/middleware/auth.js` | `requireAuth` JWT verification middleware |
| `client/src/pages/admin/Login.jsx` | Login page |
| `client/src/pages/admin/Setup.jsx` | First-time admin setup |
| `client/src/pages/admin/Dashboard.jsx` | Dashboard with stats, charts, recent activity |
| `client/src/components/admin/AdminLayout.jsx` | Admin sidebar layout wrapper |
| `client/src/pages/Contact.jsx` | Public contact form page |
| `client/src/lib/api.js` | `login()`, `setupAdmin()`, `getDashboard()`, `updateInquiry()`, `sendContact()` |

## Operations

### Adding a New Protected Admin Endpoint

1. Add route handler in `server/src/routes/admin.js` (or relevant route file)
2. Apply `requireAuth` middleware: `router.get('/path', requireAuth, handler)`
3. Add client API function in `client/src/lib/api.js` using the `api` axios instance (auto-attaches JWT)
4. Add admin page in `client/src/pages/admin/`
5. Add route in `client/src/App.jsx` wrapped in admin layout

### Adding a New Admin Sidebar Link

1. Edit `client/src/components/admin/AdminLayout.jsx`
2. Add nav item to the sidebar links array with icon (Lucide), label, and route path

### JWT Middleware Usage

```js
// server/src/middleware/auth.js
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  // Verifies JWT_SECRET, attaches req.staff = { staffId, email, role }
};
```

All authenticated API calls from the client go through the `api` axios instance which auto-attaches the token:
```js
// client/src/lib/api.js
api.interceptors.request.use(config => {
  const token = localStorage.getItem('rfr_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

On 401 response, the interceptor redirects to `/admin/login`.

## Business Rules

- All `/admin/*` routes require valid JWT — redirect to login if missing/expired
- First staff account is created via `/api/auth/setup` (disabled after first use)
- Token is stored in `localStorage` as `rfr_token` — cleared on logout
- **Pending payments count** must include patients with zero payment records (enrolled but unpaid), not just payments with `partial`/`pending` status
- Dashboard month picker cannot navigate beyond the current month
- Contact inquiries are saved to database — no email-only submissions

## Common Issues

**"Unauthorized" on admin pages** — Token expired (8-hour limit) or missing. Re-login.

**Setup endpoint returns 403** — A staff account already exists. Use login instead.

**Dashboard stats stale** — Dashboard re-fetches when month picker changes. Check the `?month=X&year=YYYY` query params are being sent.

## Related Skills

- [Patient Management](../patient-management/SKILL.md) — Admin patient list endpoints
- [Payment & Billing](../payment-billing/SKILL.md) — Admin payment list endpoints
- [Analytics](../analytics/SKILL.md) — `visitorsToday` and `pageViewsToday` on dashboard
- [Deployment](../deployment/SKILL.md) — `JWT_SECRET` environment variable
