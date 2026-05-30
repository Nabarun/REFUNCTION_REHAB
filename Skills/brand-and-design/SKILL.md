# Brand & Design

Use this skill whenever you need to change colors, typography, logos, images, UI component styling, or design tokens for ReFunction Rehab.

## Architecture

| Layer | Technology |
|-------|-----------|
| Styling | Tailwind CSS + CSS custom properties |
| Fonts | Google Fonts (Playfair Display, DM Sans, Oswald) |
| Icons | Lucide React |
| Animations | Framer Motion |
| Images | Static files in `/client/public/images/` |

## Color Palette

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

These are defined in `client/src/index.css` and mapped to Tailwind in `tailwind.config.js`:

```js
// tailwind.config.js — theme.extend.colors
navy: '#1B2F5E',
teal: '#1A7F8E',
orange: '#E8630A',
gold: '#F5A623',
green: '#4CAF50',
light: '#F0F6FA',
text: '#1A1A2E',
muted: '#6B7280',
```

## Typography

| Role | Font | Usage |
|------|------|-------|
| Display / Headings | `Playfair Display` (serif) | Section titles, hero headlines |
| Body / UI | `DM Sans` (sans-serif) | Paragraphs, labels, buttons |
| Accent numbers | `Oswald` (sans-serif) | Stats like "15+ Years", phone numbers |

Tailwind font families:
```js
fontFamily: {
  display: ['Playfair Display', 'serif'],
  body: ['DM Sans', 'sans-serif'],
  accent: ['Oswald', 'sans-serif'],
}
```

## Logo Usage

- Text logo: **Re**Function Rehab
  - "Re" in teal `#1A7F8E`
  - "Function Rehab" in navy `#1B2F5E`
- Icon: Stylized running/movement figure (SVG inline)

## Tailwind Component Classes

Defined as `@layer components` in `client/src/index.css`:

| Class | Purpose |
|-------|---------|
| `.btn-primary` | Orange CTA button — `bg-orange text-white rounded-full hover:scale-105` |
| `.btn-secondary` | Navy outlined button |
| `.btn-teal` | Teal filled button |
| `.btn-outline` | Outlined variant |
| `.card` | White card — `rounded-2xl shadow hover:translateY(-4px)` |
| `.section-heading` | Section title styling |
| `.input-field` | Form input styling |
| `.form-label` | Form label styling |
| `.input-error` | Red border error state |
| `.error-msg` | Inline error message text |

## Design Rules

1. **Navy + Teal + Orange** are the three core colors — every page must use all three meaningfully
2. All CTA buttons: orange `#E8630A` with white text, `rounded-full`, `hover:scale-105`
3. Section alternation: white bg → light blue `#F0F6FA` → navy → repeat
4. Cards: white, `rounded-2xl`, subtle shadow, hover lift (`translateY(-4px)`)
5. All icons from **Lucide React** — never use emoji as UI icons
6. Mobile-first responsive — minimum `16px` body text, `14px` labels (elderly patients)
7. Floating WhatsApp button always visible on mobile and desktop
8. Form validation errors: red border + inline message below field
9. Page transitions: Framer Motion `AnimatePresence` fade
10. Loading states: skeleton loaders (not spinners) for data-fetching sections

## Image Mapping

Source: `client/src/lib/images.js`

| Key | File | Used For |
|-----|------|----------|
| `hero` | `/images/pic-6.png` | Homepage hero — Dr. Neha's photo |
| `seniors` | `/images/pic-1.jpeg` | Senior Care — home page & service detail |
| `painManagement` | `/images/pic-2.jpeg` | Pain Management — home page & service detail |
| `clinic` | `/images/pic-3.jpeg` | Sports Injury Rehab — service card & detail |
| `womensHealth` | `/images/pic-4.jpeg` | Women's Health — home page & service detail |
| `womensHealth2` | `/images/pic-5.jpeg` | Women's Health (alternate) |
| `kids` | `/images/pic-7.jpeg` | Kids Exercise — service card & detail |
| `postSurgery` | `/images/pic-8.jpeg` | Post-Surgery Rehab — service card & detail |

### Image Display Rules

All images are **portrait-oriented** (1024x1536px, 2:3 ratio):

- **Home page feature blocks**: Plain `<motion.img>` at full width, natural height — no `object-cover`, no cropping
- **Service cards** (`Services.jsx`): Fixed `h-48` with `object-cover` — slight crop acceptable
- **Service detail pages**: Plain `<motion.img>` at full width, natural height
- **Hero backgrounds**: 20% opacity as background overlay behind gradient

### Image Guidelines

- Prefer real clinic photos over stock images
- All images optimized for web (compressed, lazy-loaded)
- Use descriptive `alt` text for accessibility
- Images are portrait (2:3) — never force into landscape containers
- Store in `/client/public/images/`
- Raw images available in `/client/img/` (pic-1 through pic-8)

## UI Components

| Component | File | Purpose |
|-----------|------|---------|
| `<ServiceCard />` | `client/src/pages/Services.jsx` | Icon + title + short desc + CTA |
| `<ConditionBadge />` | Various | Pill badge for conditions treated |
| `<StatStrip />` | `client/src/components/home/WhyChooseUs.jsx` | Teal banner with stats |
| `<ExerciseJourney />` | `client/src/pages/ServiceDetail.jsx` | Step-by-step exercise flow |
| `<CTABanner />` | `client/src/components/home/CTABanner.jsx` | Full-width navy CTA |
| `<WhatsAppButton />` | `client/src/components/layout/FloatingWhatsApp.jsx` | Floating WhatsApp CTA |
| `<TestimonialCard />` | `client/src/components/testimonials/TestimonialCard.jsx` | Testimonial with stars |
| `<TestimonialCarousel />` | `client/src/components/testimonials/TestimonialCarousel.jsx` | Auto-scrolling carousel |
| `<OptimizedImage />` | `client/src/components/ui/OptimizedImage.jsx` | Lazy-loaded image |
| `<PageWrapper />` | `client/src/components/ui/PageWrapper.jsx` | Page layout wrapper |

## Key Files

| File | Purpose |
|------|---------|
| `client/src/index.css` | CSS custom properties + Tailwind component classes |
| `client/tailwind.config.js` | Theme extensions (colors, fonts, component classes) |
| `client/src/lib/images.js` | Image key-to-path mapping |
| `client/src/components/layout/Navbar.jsx` | Navigation with logo |
| `client/src/components/layout/Footer.jsx` | Footer with links + socials |
| `client/src/components/layout/FloatingWhatsApp.jsx` | WhatsApp floating button |

## Operations

### Adding a New Color
1. Add CSS variable in `client/src/index.css` under `:root`
2. Add Tailwind mapping in `tailwind.config.js` → `theme.extend.colors`
3. Use as `text-{name}`, `bg-{name}`, `border-{name}` in JSX

### Adding a New Image
1. Place optimized file in `client/public/images/`
2. Add key-path mapping in `client/src/lib/images.js`
3. Import and use: `import { images } from '../lib/images'`

### Adding a New UI Component Class
1. Add `@apply` rule in `client/src/index.css` under `@layer components`
2. Document purpose in this skill file

## Common Issues

- **Images cropped**: Check if `object-cover` is being used on portrait images — use plain `<img>` for feature blocks
- **Font not loading**: Verify Google Fonts link in `client/index.html` includes the font
- **Color mismatch**: Always use CSS variables or Tailwind theme colors, never hardcode hex values

## Related Skills

- [Frontend Development](../frontend-development/SKILL.md) — React patterns and component architecture
- [Testimonials](../testimonials/SKILL.md) — TestimonialCard and carousel styling
