# Analytics

Use this skill whenever you need to work on website traffic tracking, visitor statistics, page view counting, daily aggregation, the analytics dashboard, or the PageView/DailyStats data models.

## Architecture

| Component | Detail |
|-----------|--------|
| Tracking | Hybrid: server-side middleware + client beacon |
| Beacon endpoint | `POST /api/track` (rate-limited, fire-and-forget) |
| Aggregation | `node-cron` — daily at 00:05 |
| Data retention | Raw PageView: 90 days, DailyStats: permanent |
| Privacy | No cookies, no PII — hashed IP+UA with daily-rotating salt |

| Page | Route | File |
|------|-------|------|
| Admin Analytics | `/admin/analytics` | `client/src/pages/admin/Analytics.jsx` |
| Dashboard Card | `/admin/dashboard` | `client/src/pages/admin/Dashboard.jsx` (visitors stat) |

## Prisma Models

```prisma
model PageView {
  id        String   @id @default(cuid())
  visitorId String                      // hashed IP + user-agent (16-char hex)
  path      String                      // e.g., "/services/physiotherapy"
  referrer  String?                     // e.g., "https://google.com" or "direct"
  device    String   @default("desktop")  // mobile|desktop|tablet
  userAgent String?                     // raw user-agent string
  timestamp DateTime @default(now())

  @@index([timestamp])
  @@index([visitorId, timestamp])
  @@map("page_views")
}

model DailyStats {
  id              String   @id @default(cuid())
  date            DateTime @unique
  uniqueVisitors  Int      @default(0)
  totalPageViews  Int      @default(0)
  topPages        Json     @default("[]")      // [{ path, views }]
  topReferrers    Json     @default("[]")      // [{ source, count }]
  deviceBreakdown Json     @default("{}")       // { mobile: N, desktop: N, tablet: N }
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("daily_stats")
}
```

## API Endpoints

### Public Beacon

**POST `/api/track`** — Log a page view (fire-and-forget)
```
Request:  { path: string, referrer?: string }
Response: 204 No Content
```
- Rate limited: 30 req/min per IP
- Server extracts from request headers:
  - `req.ip` or `X-Real-IP` → hashed with daily-rotating salt
  - `User-Agent` → parsed for device type (mobile/desktop/tablet)
  - `Referer` header as fallback referrer
- Admin pages (`/admin/*`) are not tracked (filtered client-side)

### Admin (Protected)

**GET `/api/admin/analytics/summary`** — Dashboard summary
```
Response: {
  today: { visitors, pageViews },
  yesterday: { visitors, pageViews },
  last7Days: { visitors, pageViews },
  topPages: [{ path, views }],
  trend: [{ date, visitors, pageViews }]    // 7-day
}
```

**GET `/api/admin/analytics/daily`** — Daily stats for date range
```
Query:    from=YYYY-MM-DD, to=YYYY-MM-DD
Response: [{ date, uniqueVisitors, totalPageViews, topPages, topReferrers, deviceBreakdown }]
```

**GET `/api/admin/analytics/pages`** — Top pages
```
Query:    from=YYYY-MM-DD, to=YYYY-MM-DD
Response: [{ path, views }]
```

**GET `/api/admin/analytics/referrers`** — Top referrer sources
```
Query:    from=YYYY-MM-DD, to=YYYY-MM-DD
Response: [{ source, count }]
```

**GET `/api/admin/analytics/visitors`** — Visitor sessions
```
Query:    date=YYYY-MM-DD
Response: [{ visitorId, pages: [{ path, timestamp }], device }]
```

## Key Files

| File | Purpose |
|------|---------|
| `server/src/routes/track.js` | `POST /api/track` beacon endpoint |
| `server/src/routes/admin.js` | Analytics admin endpoints (summary, daily, pages, referrers, visitors) |
| `server/src/lib/analyticsAggregator.js` | Daily aggregation cron + old data purge |
| `client/src/hooks/usePageTracking.js` | React hook — beacons on route change |
| `client/src/pages/admin/Analytics.jsx` | Admin analytics dashboard page |
| `client/src/pages/admin/Dashboard.jsx` | "Visitors Today" stat card |
| `client/src/lib/api.js` | `trackPageView()`, `getAnalyticsSummary()`, `getAnalyticsDaily()`, `getAnalyticsPages()`, `getAnalyticsReferrers()`, `getAnalyticsVisitors()` |

## Operations

### Client-Side Page Tracking

The `usePageTracking` hook fires on every React Router navigation:

```jsx
// client/src/hooks/usePageTracking.js
export default function usePageTracking() {
  const location = useLocation();
  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return;  // skip admin pages
    axios.post('/api/track', {
      path: location.pathname,
      referrer: document.referrer || 'direct',
    }).catch(() => {});  // fire-and-forget
  }, [location.pathname]);
}
```

Called in `App.jsx` inside `<BrowserRouter>`.

### Visitor ID Hashing

```js
// Daily-rotating salt ensures visitors can't be tracked across days
let currentSalt = crypto.randomBytes(16).toString('hex');
let saltDate = new Date().toDateString();

function getVisitorId(ip, userAgent) {
  const today = new Date().toDateString();
  if (today !== saltDate) {
    currentSalt = crypto.randomBytes(16).toString('hex');
    saltDate = today;
  }
  return crypto.createHash('sha256')
    .update(`${ip}:${userAgent}:${currentSalt}`)
    .digest('hex').substring(0, 16);
}
```

### Daily Aggregation

**File:** `server/src/lib/analyticsAggregator.js`

Two cron jobs:
1. **`aggregateYesterday()`** — Runs at 00:05 daily
   - Counts distinct `visitorId` → `uniqueVisitors`
   - Counts total PageView rows → `totalPageViews`
   - Groups by `path` (top 10) → `topPages`
   - Groups by referrer domain (top 10) → `topReferrers`
   - Groups by `device` → `deviceBreakdown`
   - Upserts into `DailyStats`

2. **`purgeOldPageViews()`** — Runs at 02:00 daily
   - Deletes `PageView` rows older than 90 days
   - `DailyStats` rows kept permanently (small footprint)

### Nginx Configuration

Forward real client IP for accurate visitor hashing:
```nginx
# In /api/ location block of client/nginx.conf
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```
Express must use `app.set('trust proxy', 1)` to read `X-Forwarded-For`.

### Admin Analytics Page Layout

| Section | Content |
|---------|---------|
| Summary cards | Visitors today, page views today, 7-day trend |
| Visitors chart | Line chart (7/30 day) of unique visitors |
| Top pages | Bar chart / table of top 10 visited pages |
| Referrer sources | Pie chart: Direct, Google, WhatsApp, Social |
| Device breakdown | Donut chart: Mobile vs Desktop vs Tablet |
| Date range picker | Filter all data by custom dates |

## Business Rules

- **No cookies** — privacy-friendly, no GDPR consent banner needed
- **No PII stored** — raw IPs are never saved, only truncated SHA-256 hash
- **Daily salt rotation** — visitor IDs change daily, preventing cross-day tracking
- **Admin pages excluded** — `/admin/*` paths are not tracked
- **Fire-and-forget** — tracking never blocks the UI
- **Rate limited** — 30 req/min per IP on `/api/track`
- **Auto-cleanup** — raw PageView data purged after 90 days
- **DailyStats permanent** — aggregated stats kept indefinitely (small data)

## Common Issues

**Visitor counts seem low** — Check that `usePageTracking` hook is called in `App.jsx`. Also check that nginx is forwarding real IPs (not all showing as 127.0.0.1).

**Analytics page showing no data** — The aggregation cron runs at midnight. For today's data, the summary endpoint reads directly from PageView. Yesterday and older data comes from DailyStats.

**"Too many requests" on /api/track** — Rate limit is 30/min per IP. This shouldn't trigger for normal browsing. May indicate a bot or misconfigured client.

## Related Skills

- [Auth & Admin](../auth-and-admin/SKILL.md) — Dashboard "Visitors Today" stat card
- [Frontend Development](../frontend-development/SKILL.md) — `usePageTracking` hook integration
- [Deployment](../deployment/SKILL.md) — Nginx config for `X-Forwarded-For`
