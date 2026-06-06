const router = require('express').Router()
const prisma = require('../lib/prisma')
const { requireAuth } = require('../middleware/auth')
const { retryNotification } = require('../services/notifications/whatsapp')
const { retrySMSNotification } = require('../services/notifications/sms')

router.use(requireAuth)

// ─── GET /api/admin/notifications ────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1
    const limit  = parseInt(req.query.limit) || 20
    const type   = req.query.type || ''
    const status = req.query.status || ''
    const patientId = req.query.patientId || ''
    const channel = req.query.channel || ''
    const from   = req.query.from ? new Date(req.query.from) : undefined
    const to     = req.query.to   ? new Date(req.query.to)   : undefined

    const where = {
      ...(type && { type }),
      ...(status && { status }),
      ...(patientId && { patientId }),
      ...(channel && { channel }),
      ...(from || to ? {
        createdAt: {
          ...(from && { gte: from }),
          ...(to   && { lte: to }),
        },
      } : {}),
    }

    const [notifications, total, stats] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          patient: { select: { fullName: true, mobile: true } },
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.groupBy({
        by: ['status'],
        _count: true,
      }),
    ])

    const summary = { total: 0, sent: 0, delivered: 0, failed: 0, pending: 0 }
    for (const s of stats) {
      summary[s.status] = s._count
      summary.total += s._count
    }

    res.json({
      notifications,
      total,
      page,
      pages: Math.ceil(total / limit),
      summary,
    })
  } catch (err) {
    console.error('[notifications GET]', err)
    res.status(500).json({ error: 'Failed to fetch notifications' })
  }
})

// ─── POST /api/admin/notifications/:id/retry ─────────────────────────────────
router.post('/:id/retry', async (req, res) => {
  try {
    const existing = await prisma.notification.findUnique({
      where: { id: req.params.id },
      select: { channel: true },
    })
    if (!existing) return res.status(404).json({ error: 'Notification not found' })

    const notification = existing.channel === 'sms'
      ? await retrySMSNotification(req.params.id)
      : await retryNotification(req.params.id)
    res.json({ message: 'Notification retry initiated', notification })
  } catch (err) {
    console.error('[notifications retry]', err)
    res.status(400).json({ error: err.message || 'Retry failed' })
  }
})

module.exports = router
