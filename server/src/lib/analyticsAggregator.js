const cron = require('node-cron')
const prisma = require('./prisma')

/**
 * Aggregate yesterday's PageView rows into a single DailyStats row.
 * Uses upsert for idempotency — safe to re-run.
 */
async function aggregateYesterday() {
  const now = new Date()
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  console.log(`[analytics] Aggregating stats for ${yesterday.toISOString().slice(0, 10)}`)

  const pageViews = await prisma.pageView.findMany({
    where: {
      timestamp: { gte: yesterday, lt: todayStart },
    },
    select: {
      visitorId: true,
      path: true,
      referrer: true,
      device: true,
    },
  })

  if (pageViews.length === 0) {
    console.log('[analytics] No page views to aggregate')
    return
  }

  // Unique visitors
  const uniqueVisitors = new Set(pageViews.map(v => v.visitorId)).size

  // Top pages — count visits per path
  const pageCounts = {}
  for (const v of pageViews) {
    pageCounts[v.path] = (pageCounts[v.path] || 0) + 1
  }
  const topPages = Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([path, count]) => ({ path, count }))

  // Top referrers — count by referrer domain
  const refCounts = {}
  for (const v of pageViews) {
    if (v.referrer) {
      try {
        const domain = new URL(v.referrer).hostname
        refCounts[domain] = (refCounts[domain] || 0) + 1
      } catch {
        refCounts[v.referrer] = (refCounts[v.referrer] || 0) + 1
      }
    }
  }
  const topReferrers = Object.entries(refCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([source, count]) => ({ source, count }))

  // Device breakdown
  const deviceBreakdown = {}
  for (const v of pageViews) {
    deviceBreakdown[v.device] = (deviceBreakdown[v.device] || 0) + 1
  }

  await prisma.dailyStats.upsert({
    where: { date: yesterday },
    update: {
      uniqueVisitors,
      totalPageViews: pageViews.length,
      topPages,
      topReferrers,
      deviceBreakdown,
    },
    create: {
      date: yesterday,
      uniqueVisitors,
      totalPageViews: pageViews.length,
      topPages,
      topReferrers,
      deviceBreakdown,
    },
  })

  console.log(`[analytics] Aggregated: ${uniqueVisitors} visitors, ${pageViews.length} views`)
}

/**
 * Purge raw PageView rows older than 90 days.
 */
async function purgeOldPageViews() {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)

  const result = await prisma.pageView.deleteMany({
    where: { timestamp: { lt: cutoff } },
  })

  console.log(`[analytics] Purged ${result.count} page views older than 90 days`)
}

/**
 * Start cron jobs for analytics aggregation.
 */
function startAnalyticsJobs() {
  // Every day at 00:05 — aggregate yesterday's stats
  cron.schedule('5 0 * * *', async () => {
    try {
      await aggregateYesterday()
    } catch (err) {
      console.error('[analytics cron] aggregation failed:', err)
    }
  })

  // Every day at 02:00 — purge old raw page views
  cron.schedule('0 2 * * *', async () => {
    try {
      await purgeOldPageViews()
    } catch (err) {
      console.error('[analytics cron] purge failed:', err)
    }
  })

  console.log('[analytics] Cron jobs scheduled (aggregate: 00:05, purge: 02:00)')
}

module.exports = { startAnalyticsJobs, aggregateYesterday, purgeOldPageViews }
