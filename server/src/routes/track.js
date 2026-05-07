const router = require('express').Router()
const rateLimit = require('express-rate-limit')
const prisma = require('../lib/prisma')
const { generateVisitorId } = require('../utils/visitorId')
const { detectDevice } = require('../utils/deviceType')

// 30 requests per minute per IP
const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: false,
  legacyHeaders: false,
  message: '', // empty — client ignores response anyway
})

// POST /api/track — public beacon endpoint
router.post('/', trackLimiter, async (req, res) => {
  try {
    const { path, referrer } = req.body

    // path is required
    if (!path || typeof path !== 'string') {
      return res.status(400).json({ error: 'path is required' })
    }

    // Skip admin pages — don't track internal navigation
    if (path.startsWith('/admin')) {
      return res.sendStatus(204)
    }

    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || req.ip
    const ua = req.headers['user-agent'] || ''

    const visitorId = generateVisitorId(ip, ua)
    const device = detectDevice(ua)

    await prisma.pageView.create({
      data: {
        visitorId,
        path: path.slice(0, 500), // cap path length
        referrer: referrer ? String(referrer).slice(0, 1000) : null,
        device,
        userAgent: ua.slice(0, 500),
      },
    })

    return res.sendStatus(204)
  } catch (err) {
    console.error('[track]', err)
    // Still return 204 — don't let tracking errors affect UX
    return res.sendStatus(204)
  }
})

module.exports = router
