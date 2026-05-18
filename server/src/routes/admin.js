const router      = require('express').Router()
const prisma      = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')

// All admin routes require valid JWT
router.use(requireAuth)

// ─── GET /api/admin/dashboard ─────────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const now        = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Support optional month/year query params for monthly stats
    const qMonth = req.query.month != null ? parseInt(req.query.month) : now.getMonth()  // 0-indexed
    const qYear  = req.query.year  != null ? parseInt(req.query.year)  : now.getFullYear()
    const monthStart = new Date(qYear, qMonth, 1)
    const monthEnd   = new Date(qYear, qMonth + 1, 1) // first day of next month

    const [
      totalPatients,
      newPatientsToday,
      newPatientsMonth,
      allPayments,
      paymentsToday,
      paymentsMonth,
      pendingPaymentRecords,
      patientsWithNoPayments,
      recentEnrollments,
      recentPayments,
      activePackages,
      visitsToday,
      appointmentsToday,
      todaysSchedule,
      visitorsToday,
      incompleteRegistrations,
    ] = await Promise.all([
      prisma.patient.count(),
      prisma.patient.count({ where: { enrolledAt: { gte: todayStart } } }),
      prisma.patient.count({ where: { enrolledAt: { gte: monthStart, lt: monthEnd } } }),
      prisma.payment.aggregate({ _sum: { amountPaid: true } }),
      prisma.payment.aggregate({
        where: { createdAt: { gte: todayStart } },
        _sum: { amountPaid: true },
      }),
      prisma.payment.aggregate({
        where: { createdAt: { gte: monthStart, lt: monthEnd } },
        _sum: { amountPaid: true },
      }),
      // Payment records with partial/pending status
      prisma.payment.aggregate({
        where: { status: { in: ['partial', 'pending'] } },
        _sum: { balanceDue: true },
        _count: true,
      }),
      // Patients who enrolled but have zero payment records
      prisma.patient.count({
        where: { payments: { none: {} } },
      }),
      prisma.patient.findMany({
        orderBy: { enrolledAt: 'desc' },
        take: 10,
        select: {
          id: true, fullName: true, mobile: true, program: true,
          sessionType: true, enrolledAt: true,
        },
      }),
      prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { patient: { select: { fullName: true } } },
      }),
      prisma.treatmentPackage.count({ where: { status: 'active' } }),
      prisma.patientVisit.count({ where: { visitDate: { gte: todayStart } } }),
      prisma.appointment.count({
        where: {
          appointmentDate: { gte: todayStart },
          status: { notIn: ['cancelled'] },
        },
      }),
      prisma.appointment.findMany({
        where: {
          appointmentDate: { gte: todayStart },
          status: { notIn: ['cancelled'] },
        },
        orderBy: { startTime: 'asc' },
        include: { patient: { select: { fullName: true, mobile: true } } },
      }),
      // Unique visitors today (analytics)
      prisma.pageView.findMany({
        where: { timestamp: { gte: todayStart } },
        distinct: ['visitorId'],
        select: { visitorId: true },
      }).then(rows => rows.length).catch(() => 0),
      // Incomplete (quick) registrations
      prisma.patient.count({ where: { registrationStatus: 'quick' } }),
    ])

    // Packages needing attention: active with <=2 sessions remaining
    const activePackagesWithCounts = await prisma.treatmentPackage.findMany({
      where: { status: 'active' },
      include: {
        patient: { select: { id: true, fullName: true } },
        _count:  { select: { visits: true } },
      },
    })
    const attentionPackages = activePackagesWithCounts
      .filter(p => (p.totalSessions - p._count.visits) <= 2)
      .map(p => ({
        id:             p.id,
        patientId:      p.patient.id,
        patientName:    p.patient.fullName,
        packageName:    p.packageName,
        totalSessions:  p.totalSessions,
        sessionsUsed:   p._count.visits,
        remaining:      p.totalSessions - p._count.visits,
      }))

    // Payment mode breakdown
    const modeBreakdown = await prisma.payment.groupBy({
      by: ['paymentMode'],
      _sum:   { amountPaid: true },
      _count: { id: true },
    })

    res.json({
      totalPatients,
      newPatientsToday,
      newPatientsThisMonth: newPatientsMonth,
      totalRevenue:         allPayments._sum.amountPaid || 0,
      revenueToday:         paymentsToday._sum.amountPaid || 0,
      revenueThisMonth:     paymentsMonth._sum.amountPaid || 0,
      selectedMonth:        qMonth,
      selectedYear:         qYear,
      // Pending = patients with no payments + payment records in partial/pending status
      pendingPaymentsCount: patientsWithNoPayments + (pendingPaymentRecords._count || 0),
      pendingPaymentsValue: pendingPaymentRecords._sum.balanceDue || 0,
      patientsWithNoPayments,
      recentEnrollments,
      recentPayments,
      paymentModeBreakdown: modeBreakdown,
      activePackages,
      visitsToday,
      attentionPackages,
      appointmentsToday,
      todaysSchedule,
      visitorsToday,
      incompleteRegistrations,
    })
  } catch (err) {
    console.error('[admin dashboard]', err)
    res.status(500).json({ error: 'Failed to load dashboard' })
  }
})

// ─── GET /api/admin/analytics/summary ────────────────────────────────────────
// Live today stats + recent 7-day aggregated history
router.get('/analytics/summary', async (req, res) => {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const sevenDaysAgo = new Date(todayStart)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const [todayViews, todayVisitors, recentStats] = await Promise.all([
      prisma.pageView.count({ where: { timestamp: { gte: todayStart } } }),
      prisma.pageView.findMany({
        where: { timestamp: { gte: todayStart } },
        distinct: ['visitorId'],
        select: { visitorId: true },
      }),
      prisma.dailyStats.findMany({
        where: { date: { gte: sevenDaysAgo, lt: todayStart } },
        orderBy: { date: 'asc' },
      }),
    ])

    res.json({
      today: {
        pageViews: todayViews,
        uniqueVisitors: todayVisitors.length,
      },
      history: recentStats,
    })
  } catch (err) {
    console.error('[analytics summary]', err)
    res.status(500).json({ error: 'Failed to load analytics summary' })
  }
})

// ─── GET /api/admin/analytics/daily ─────────────────────────────────────────
// Daily stats within a date range
router.get('/analytics/daily', async (req, res) => {
  try {
    const { from, to } = req.query
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const fromDate = from ? new Date(from) : new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000)
    const toDate = to ? new Date(to) : todayStart

    // Get aggregated stats for past days
    const stats = await prisma.dailyStats.findMany({
      where: { date: { gte: fromDate, lte: toDate } },
      orderBy: { date: 'asc' },
    })

    // Add live today stats if toDate is today or future
    if (toDate >= todayStart) {
      const [todayViews, todayVisitors] = await Promise.all([
        prisma.pageView.count({ where: { timestamp: { gte: todayStart } } }),
        prisma.pageView.findMany({
          where: { timestamp: { gte: todayStart } },
          distinct: ['visitorId'],
          select: { visitorId: true },
        }),
      ])

      stats.push({
        date: todayStart,
        uniqueVisitors: todayVisitors.length,
        totalPageViews: todayViews,
        topPages: [],
        topReferrers: [],
        deviceBreakdown: {},
      })
    }

    res.json(stats)
  } catch (err) {
    console.error('[analytics daily]', err)
    res.status(500).json({ error: 'Failed to load daily analytics' })
  }
})

// ─── GET /api/admin/analytics/pages ─────────────────────────────────────────
// Top pages in a date range (from raw PageView data)
router.get('/analytics/pages', async (req, res) => {
  try {
    const { from, to } = req.query
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const fromDate = from ? new Date(from) : new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000)
    const toDate = to ? new Date(new Date(to).getTime() + 24 * 60 * 60 * 1000) : new Date()

    const pages = await prisma.pageView.groupBy({
      by: ['path'],
      where: { timestamp: { gte: fromDate, lt: toDate } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    })

    res.json(pages.map(p => ({ path: p.path, count: p._count.id })))
  } catch (err) {
    console.error('[analytics pages]', err)
    res.status(500).json({ error: 'Failed to load page analytics' })
  }
})

// ─── GET /api/admin/analytics/referrers ─────────────────────────────────────
// Top referrers in a date range
router.get('/analytics/referrers', async (req, res) => {
  try {
    const { from, to } = req.query
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const fromDate = from ? new Date(from) : new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000)
    const toDate = to ? new Date(new Date(to).getTime() + 24 * 60 * 60 * 1000) : new Date()

    const views = await prisma.pageView.findMany({
      where: {
        timestamp: { gte: fromDate, lt: toDate },
        referrer: { not: null },
      },
      select: { referrer: true },
    })

    const refCounts = {}
    for (const v of views) {
      if (v.referrer) {
        try {
          const domain = new URL(v.referrer).hostname
          refCounts[domain] = (refCounts[domain] || 0) + 1
        } catch {
          refCounts[v.referrer] = (refCounts[v.referrer] || 0) + 1
        }
      }
    }

    const sorted = Object.entries(refCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([source, count]) => ({ source, count }))

    res.json(sorted)
  } catch (err) {
    console.error('[analytics referrers]', err)
    res.status(500).json({ error: 'Failed to load referrer analytics' })
  }
})

// ─── GET /api/admin/analytics/visitors ─────────────────────────────────────
// Individual visitor sessions for a given day (defaults to today)
router.get('/analytics/visitors', async (req, res) => {
  try {
    const now = new Date()
    const dateStr = req.query.date // optional YYYY-MM-DD
    const dayStart = dateStr ? new Date(dateStr) : new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

    const views = await prisma.pageView.findMany({
      where: { timestamp: { gte: dayStart, lt: dayEnd } },
      orderBy: { timestamp: 'desc' },
      select: {
        visitorId: true,
        path: true,
        referrer: true,
        device: true,
        timestamp: true,
      },
    })

    // Group by visitorId
    const visitorMap = new Map()
    for (const v of views) {
      if (!visitorMap.has(v.visitorId)) {
        visitorMap.set(v.visitorId, [])
      }
      visitorMap.get(v.visitorId).push(v)
    }

    const timeFmt = (d) =>
      new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

    const parseDomain = (ref) => {
      if (!ref) return null
      try { return new URL(ref).hostname } catch { return ref }
    }

    const visitors = []
    for (const [visitorId, pageViews] of visitorMap) {
      // pageViews already sorted desc; reverse for chronological
      const sorted = [...pageViews].reverse()
      const first = sorted[0]
      const last = sorted[sorted.length - 1]

      visitors.push({
        visitorId: visitorId.slice(0, 6),
        device: first.device || 'desktop',
        referrer: parseDomain(first.referrer),
        pages: sorted.map(pv => ({ path: pv.path, time: timeFmt(pv.timestamp) })),
        pageCount: sorted.length,
        firstSeen: timeFmt(first.timestamp),
        lastSeen: timeFmt(last.timestamp),
      })
    }

    // Sort by most-recent visitor first, limit to 100
    res.json(visitors.slice(0, 100))
  } catch (err) {
    console.error('[analytics visitors]', err)
    res.status(500).json({ error: 'Failed to load visitor analytics' })
  }
})

// ─── GET /api/admin/patients ──────────────────────────────────────────────────
router.get('/patients', async (req, res) => {
  try {
    const page    = parseInt(req.query.page)  || 1
    const limit   = parseInt(req.query.limit) || 20
    const search  = req.query.search || ''
    const program = req.query.program || ''
    const from    = req.query.from ? new Date(req.query.from) : undefined
    const to      = req.query.to   ? new Date(req.query.to)   : undefined

    const where = {
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { mobile:   { contains: search } },
          { id:       { contains: search } },
        ],
      }),
      ...(program && { program: { has: program } }),
      ...(from || to ? {
        enrolledAt: {
          ...(from && { gte: from }),
          ...(to   && { lte: to   }),
        },
      } : {}),
    }

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        orderBy: { enrolledAt: 'desc' },
        skip:  (page - 1) * limit,
        take:  limit,
        select: {
          id: true, fullName: true, mobile: true, age: true, gender: true,
          program: true, sessionType: true, city: true, enrolledAt: true, registrationStatus: true,
          _count: { select: { payments: true } },
          packages: {
            where: { status: 'active' },
            take: 3,
            select: {
              id: true, packageName: true, totalSessions: true, status: true,
              _count: { select: { visits: true } },
            },
          },
        },
      }),
      prisma.patient.count({ where }),
    ])

    res.json({ patients, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    console.error('[admin patients]', err)
    res.status(500).json({ error: 'Failed to fetch patients' })
  }
})

// ─── GET /api/admin/patients/export (CSV) ────────────────────────────────────
router.get('/patients/export', async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      orderBy: { enrolledAt: 'desc' },
      select: {
        id: true, fullName: true, mobile: true, email: true, age: true,
        gender: true, city: true, state: true, program: true,
        sessionType: true, preferredTime: true, enrolledAt: true,
      },
    })

    const header = 'ID,Full Name,Mobile,Email,Age,Gender,City,State,Program,Session Type,Preferred Time,Enrolled At\n'
    const rows   = patients.map(p =>
      [p.id, `"${p.fullName}"`, p.mobile, p.email || '', p.age, p.gender,
       p.city, p.state, `"${p.program.join(';')}"`, p.sessionType,
       p.preferredTime, p.enrolledAt.toISOString()].join(',')
    ).join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="patients.csv"')
    res.send(header + rows)
  } catch (err) {
    res.status(500).json({ error: 'Export failed' })
  }
})

// ─── GET /api/admin/payments ──────────────────────────────────────────────────
router.get('/payments', async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1
    const limit  = parseInt(req.query.limit) || 20
    const status = req.query.status || ''
    const mode   = req.query.mode   || ''
    const from   = req.query.from   ? new Date(req.query.from) : undefined
    const to     = req.query.to     ? new Date(req.query.to)   : undefined

    const where = {
      ...(status && { status }),
      ...(mode   && { paymentMode: mode }),
      ...(from || to ? {
        paymentDate: {
          ...(from && { gte: from }),
          ...(to   && { lte: to   }),
        },
      } : {}),
    }

    const [payments, total, summary] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { paymentDate: 'desc' },
        skip:  (page - 1) * limit,
        take:  limit,
        include: { patient: { select: { fullName: true, mobile: true } } },
      }),
      prisma.payment.count({ where }),
      prisma.payment.aggregate({
        where,
        _sum: { amountPaid: true, balanceDue: true, totalAmount: true },
      }),
    ])

    res.json({
      payments,
      total,
      page,
      pages:        Math.ceil(total / limit),
      totalCollected: summary._sum.amountPaid   || 0,
      totalPending:   summary._sum.balanceDue   || 0,
      totalCharged:   summary._sum.totalAmount  || 0,
    })
  } catch (err) {
    console.error('[admin payments]', err)
    res.status(500).json({ error: 'Failed to fetch payments' })
  }
})

// ─── GET /api/admin/payments/export (CSV) ────────────────────────────────────
router.get('/payments/export', async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { paymentDate: 'desc' },
      include: { patient: { select: { fullName: true, mobile: true } } },
    })

    const header = 'Receipt No,Patient,Mobile,Total Amount,Amount Paid,Balance Due,Payment Mode,Status,Payment Date\n'
    const rows   = payments.map(p =>
      [p.receiptNo, `"${p.patient.fullName}"`, p.patient.mobile,
       p.totalAmount, p.amountPaid, p.balanceDue, p.paymentMode,
       p.status, p.paymentDate.toISOString()].join(',')
    ).join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="payments.csv"')
    res.send(header + rows)
  } catch (err) {
    res.status(500).json({ error: 'Export failed' })
  }
})

module.exports = router
