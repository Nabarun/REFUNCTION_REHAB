const express = require('express')
const cors    = require('cors')

const patientRoutes = require('./routes/patients')
const paymentRoutes = require('./routes/payments')
const contactRoutes = require('./routes/contact')
const authRoutes    = require('./routes/auth')
const adminRoutes        = require('./routes/admin')
const testimonialRoutes  = require('./routes/testimonials')
const packageRoutes      = require('./routes/packages')
const appointmentRoutes  = require('./routes/appointments')
const availabilityRoutes = require('./routes/availability')
const trackRoutes        = require('./routes/track')
const { startAnalyticsJobs } = require('./lib/analyticsAggregator')

const app  = express()
const PORT = process.env.PORT || 4000

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ReFunction Rehab API', time: new Date().toISOString() })
})

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/track',    trackRoutes)
app.use('/api/patients', patientRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/contact',  contactRoutes)
app.use('/api/auth',     authRoutes)
app.use('/api/admin',         adminRoutes)
app.use('/api/testimonials',  testimonialRoutes)
app.use('/api/admin/packages', packageRoutes)
app.use('/api/appointments',        appointmentRoutes)
app.use('/api/admin/availability',  availabilityRoutes)

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ ReFunction Rehab API running on port ${PORT}`)
  startAnalyticsJobs()
})
