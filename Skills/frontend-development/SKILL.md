# Frontend Development

Use this skill whenever you need to work on React components, page layouts, routing, API integration patterns, form handling, animations, or Tailwind styling conventions in the ReFunction Rehab frontend.

## Architecture

| Component | Detail |
|-----------|--------|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS + CSS custom properties |
| Routing | React Router v6 |
| Forms | React Hook Form + Zod validation |
| Animations | Framer Motion |
| Icons | Lucide React |
| HTTP client | Axios (configured instance in `lib/api.js`) |
| Charts | Recharts (admin analytics) |

## Project Structure

```
client/src/
├── App.jsx                          # Router + route definitions
├── index.css                        # CSS variables + Tailwind component classes
├── lib/
│   ├── api.js                       # Axios instance + all API functions (50+)
│   └── images.js                    # Image key-to-path mapping
├── hooks/
│   └── usePageTracking.js           # Analytics beacon on route change
├── components/
│   ├── layout/
│   │   ├── Navbar.jsx               # Main navigation
│   │   ├── Footer.jsx               # Footer with links
│   │   └── FloatingWhatsApp.jsx     # WhatsApp floating button
│   ├── home/
│   │   ├── Hero.jsx                 # Hero section
│   │   ├── ServicesStrip.jsx        # Service cards row
│   │   ├── WhyChooseUs.jsx          # Stats banner
│   │   ├── FeatureBlocks.jsx        # Feature sections
│   │   └── CTABanner.jsx            # Call-to-action banner
│   ├── testimonials/
│   │   ├── TestimonialCard.jsx      # Individual testimonial
│   │   └── TestimonialCarousel.jsx  # Auto-scrolling carousel
│   ├── admin/
│   │   └── AdminLayout.jsx          # Admin sidebar + content wrapper
│   └── ui/
│       ├── PageWrapper.jsx          # Page layout wrapper
│       └── OptimizedImage.jsx       # Lazy-loaded image
├── pages/
│   ├── Home.jsx                     # Landing page
│   ├── About.jsx                    # About page
│   ├── Services.jsx                 # Service listing
│   ├── ServiceDetail.jsx            # Individual service
│   ├── Testimonials.jsx             # Public testimonials
│   ├── Book.jsx                     # Appointment booking (5 steps)
│   ├── Contact.jsx                  # Contact form
│   ├── Enroll.jsx                   # Patient enrollment (10 sections)
│   ├── Payment.jsx                  # Payment collection
│   └── admin/
│       ├── Login.jsx                # Staff login
│       ├── Setup.jsx                # First-time admin setup
│       ├── Dashboard.jsx            # Admin dashboard
│       ├── Patients.jsx             # Patient list + packages modal
│       ├── EditPatient.jsx          # Patient edit form
│       ├── Appointments.jsx         # Appointment management
│       ├── Availability.jsx         # Schedule configuration
│       ├── Payments.jsx             # Payment records
│       ├── PackageReceipt.jsx       # Package receipt view
│       ├── Testimonials.jsx         # Testimonial management
│       ├── Analytics.jsx            # Traffic analytics
│       └── Notifications.jsx        # Notification history
```

## Routing

```jsx
// App.jsx — Route structure
<BrowserRouter>
  <Navbar />
  <Routes>
    {/* Public routes */}
    <Route path="/" element={<Home />} />
    <Route path="/services" element={<Services />} />
    <Route path="/services/:slug" element={<ServiceDetail />} />
    <Route path="/about" element={<About />} />
    <Route path="/enroll" element={<Enroll />} />
    <Route path="/book" element={<Book />} />
    <Route path="/payment" element={<Payment />} />
    <Route path="/contact" element={<Contact />} />
    <Route path="/testimonials" element={<Testimonials />} />

    {/* Admin routes — wrapped in AdminLayout */}
    <Route path="/admin" element={<Login />} />
    <Route path="/admin/login" element={<Login />} />
    <Route path="/admin/setup" element={<Setup />} />
    <Route path="/admin/dashboard" element={<AdminLayout><Dashboard /></AdminLayout>} />
    <Route path="/admin/patients" element={<AdminLayout><Patients /></AdminLayout>} />
    <Route path="/admin/patients/:id/edit" element={<AdminLayout><EditPatient /></AdminLayout>} />
    <Route path="/admin/payments" element={<AdminLayout><Payments /></AdminLayout>} />
    <Route path="/admin/appointments" element={<AdminLayout><Appointments /></AdminLayout>} />
    <Route path="/admin/availability" element={<AdminLayout><Availability /></AdminLayout>} />
    <Route path="/admin/testimonials" element={<AdminLayout><AdminTestimonials /></AdminLayout>} />
    <Route path="/admin/analytics" element={<AdminLayout><Analytics /></AdminLayout>} />
    <Route path="/admin/notifications" element={<AdminLayout><Notifications /></AdminLayout>} />
  </Routes>
  <Footer />
  <FloatingWhatsApp />
</BrowserRouter>
```

## API Integration Pattern

All API calls go through the configured Axios instance in `client/src/lib/api.js`:

```js
// Base instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Auth interceptor — attaches JWT from localStorage
api.interceptors.request.use(config => {
  const token = localStorage.getItem('rfr_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 interceptor — redirects to login on expired token
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && window.location.pathname.startsWith('/admin')) {
      localStorage.removeItem('rfr_token');
      window.location.href = '/admin/login';
    }
    return Promise.reject(err);
  }
);
```

### Adding a New API Function

1. Add to `client/src/lib/api.js`:
```js
export const myNewFunction = (params) => api.get('/endpoint', { params }).then(r => r.data);
// or
export const myNewFunction = (data) => api.post('/endpoint', data).then(r => r.data);
```

2. Use in component:
```jsx
import { myNewFunction } from '../lib/api';
const [data, setData] = useState(null);
useEffect(() => { myNewFunction(params).then(setData); }, []);
```

## Tailwind Conventions

### Color Usage
```jsx
// Use Tailwind theme colors (from tailwind.config.js), not raw hex
<div className="bg-navy text-white">       {/* Primary background */}
<button className="bg-orange text-white">  {/* CTA */}
<span className="text-teal">              {/* Accent */}
<div className="bg-light">                {/* Section background */}
<p className="text-muted">                {/* Secondary text */}
```

### Component Classes (from index.css)
```jsx
<button className="btn-primary">Book Now</button>
<button className="btn-secondary">Learn More</button>
<div className="card">...</div>
<input className="input-field" />
<label className="form-label">Name</label>
<h2 className="section-heading">Our Services</h2>
```

### Responsive Patterns
```jsx
// Mobile-first breakpoints
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
<div className="text-sm md:text-base lg:text-lg">
<div className="px-4 md:px-8 lg:px-16">
```

## Form Handling

Forms use React Hook Form with Zod validation:

```jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  fullName: z.string().min(2, 'Name is required'),
  mobile: z.string().regex(/^\d{10}$/, 'Must be 10 digits'),
});

function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    await apiCall(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('fullName')} className={`input-field ${errors.fullName ? 'input-error' : ''}`} />
      {errors.fullName && <p className="error-msg">{errors.fullName.message}</p>}
    </form>
  );
}
```

## Animation Patterns

Using Framer Motion:

```jsx
import { motion, AnimatePresence } from 'framer-motion';

// Page entrance
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>

// Staggered children
<motion.div variants={container} initial="hidden" animate="visible">
  {items.map(item => (
    <motion.div key={item.id} variants={child}>
      {item.content}
    </motion.div>
  ))}
</motion.div>

// Page transitions
<AnimatePresence mode="wait">
  <motion.div key={location.pathname}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
```

## Key Files

| File | Purpose |
|------|---------|
| `client/src/App.jsx` | Route definitions + layout |
| `client/src/lib/api.js` | All 50+ API functions |
| `client/src/lib/images.js` | Image mapping |
| `client/src/index.css` | CSS variables + component classes |
| `client/tailwind.config.js` | Theme extensions |
| `client/vite.config.js` | Vite configuration |
| `client/index.html` | HTML template + Google Fonts links |
| `client/nginx.conf` | Production SPA routing + API proxy |
| `client/Dockerfile` | Multi-stage build (Vite → nginx) |

## Operations

### Adding a New Public Page

1. Create `client/src/pages/NewPage.jsx`
2. Add route in `App.jsx`: `<Route path="/new-page" element={<NewPage />} />`
3. Add nav link in `Navbar.jsx` if needed
4. Wrap content in `<PageWrapper>` for consistent layout

### Adding a New Admin Page

1. Create `client/src/pages/admin/NewPage.jsx`
2. Add route in `App.jsx` wrapped in `<AdminLayout>`:
   ```jsx
   <Route path="/admin/new-page" element={<AdminLayout><NewPage /></AdminLayout>} />
   ```
3. Add sidebar link in `AdminLayout.jsx`
4. Add API functions in `lib/api.js`

### Page Template (Public)

```jsx
import { motion } from 'framer-motion';
import PageWrapper from '../components/ui/PageWrapper';

export default function NewPage() {
  return (
    <PageWrapper>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto px-4 py-16"
      >
        <h1 className="section-heading">Page Title</h1>
        {/* Content */}
      </motion.div>
    </PageWrapper>
  );
}
```

### Page Template (Admin)

```jsx
import { useState, useEffect } from 'react';
import { apiFunction } from '../../lib/api';

export default function AdminNewPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFunction().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-6">Page Title</h1>
      {/* Content */}
    </div>
  );
}
```

### Service Detail Page Layout

Two-column grid (`lg:grid-cols-2`, `items-start`):
- **Left column**: Tagline, full-width image, description, "What We Treat" checklist, CTAs
- **Right column** (3 stacked cards):
  1. Treatment Journey — 5-step progression
  2. Why Choose Us — 4 highlights on gradient
  3. Session Details — duration, frequency, mode

The text column uses `lg:sticky lg:top-24` for scroll persistence.

## Business Rules

- All frontend pages must call real API endpoints — **no `console.log` placeholders**
- Mobile-first responsive — minimum 16px body text (elderly patient consideration)
- Floating WhatsApp button always visible
- Loading states use skeleton loaders, not spinners
- Admin pages redirect to login if no valid JWT
- `VITE_API_URL` defaults to `/api` (proxied via nginx in production)

## Common Issues

**API calls returning 404 in dev** — Set `VITE_API_URL=http://localhost:4000/api` in `client/.env` for local development.

**Styles not applying** — Check Tailwind config includes the file path in `content` array. Restart Vite dev server after config changes.

**Admin page blank after login** — Check JWT is stored in `localStorage` as `rfr_token`. The axios interceptor attaches it automatically.

**Images not loading** — Images are served from `/images/` in the `public` directory. Check the path in `images.js`.

## Related Skills

- [Brand & Design](../brand-and-design/SKILL.md) — Colors, typography, design rules, image guidelines
- [Auth & Admin](../auth-and-admin/SKILL.md) — JWT auth flow, admin layout
- [Patient Management](../patient-management/SKILL.md) — Enrollment form, patient list page
- [Payment & Billing](../payment-billing/SKILL.md) — Payment form, receipt page
