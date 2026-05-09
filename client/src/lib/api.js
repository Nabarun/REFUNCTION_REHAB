import axios from 'axios'

// In Docker: nginx proxies /api → server:4000
// In local dev: uses VITE_API_URL (http://localhost:4000)
const BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: BASE.endsWith('/api') ? BASE : `${BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rfr_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Redirect to /admin/login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const isAdminRoute = window.location.pathname.startsWith('/admin')
      if (isAdminRoute) {
        localStorage.removeItem('rfr_token')
        window.location.href = '/admin/login'
      }
    }
    return Promise.reject(err)
  }
)

// ─── Patient ──────────────────────────────────────────────────────────────────
export const enrollPatient   = (data)   => api.post('/patients/enroll', data)
export const getPatient      = (id)     => api.get(`/patients/${id}`)
export const searchPatients  = (q)      => api.get('/patients/search', { params: { q } })
export const updatePatient   = (id, data) => api.patch(`/patients/${id}`, data)

// ─── Payments ─────────────────────────────────────────────────────────────────
export const recordPayment   = (data)   => api.post('/payments', data)
export const getPayment      = (id)     => api.get(`/payments/${id}`)
export const getPatientPayments = (pid) => api.get(`/payments/patient/${pid}`)

// ─── Contact ──────────────────────────────────────────────────────────────────
export const sendContact     = (data)   => api.post('/contact', data)

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const login           = (data)   => api.post('/auth/login', data)
export const setupAdmin      = (data)   => api.post('/auth/setup', data)

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
export const getDashboard    = (params) => api.get('/admin/dashboard', { params })
export const getAdminPatients= (params) => api.get('/admin/patients', { params })
export const getAdminPayments= (params) => api.get('/admin/payments',  { params })
export const exportPatients  = ()       => api.get('/admin/patients/export', { responseType: 'blob' })
export const exportPayments  = ()       => api.get('/admin/payments/export',  { responseType: 'blob' })

// ─── Packages & Visits ──────────────────────────────────────────────────────
export const getPatientPackages = (patientId) => api.get('/admin/packages', { params: { patientId } })
export const getPackageDetails  = (id)        => api.get(`/admin/packages/${id}`)
export const updatePackage      = (id, data)  => api.patch(`/admin/packages/${id}`, data)
export const recordVisit        = (pkgId, data) => api.post(`/admin/packages/${pkgId}/visits`, data)
export const deleteVisit        = (pkgId, visitId) => api.delete(`/admin/packages/${pkgId}/visits/${visitId}`)

// ─── Testimonials (Public) ──────────────────────────────────────────────────
export const getTestimonials        = (params) => api.get('/testimonials', { params })
export const getTestimonial         = (id)     => api.get(`/testimonials/${id}`)

// ─── Testimonials (Admin) ───────────────────────────────────────────────────
export const getAdminTestimonials   = (params) => api.get('/testimonials/admin/all', { params })
export const createTestimonial      = (data)   => api.post('/testimonials/admin', data)
export const updateTestimonial      = (id, data) => api.patch(`/testimonials/admin/${id}`, data)
export const deleteTestimonial      = (id)     => api.delete(`/testimonials/admin/${id}`)

// ─── Appointments (Public) ─────────────────────────────────────────────────
export const getAvailableSlots  = (date)     => api.get('/appointments/slots', { params: { date } })
export const lookupPatient      = (q)        => api.post('/appointments/lookup', { q })
export const quickRegister      = (data)     => api.post('/appointments/quick-register', data)
export const createAppointment  = (data)     => api.post('/appointments', data)
export const cancelAppointment  = (id, data) => api.patch(`/appointments/${id}/cancel`, data)

// ─── Appointments (Admin) ──────────────────────────────────────────────────
export const getAdminAppointments = (params) => api.get('/appointments', { params })
export const updateAppointment    = (id, data) => api.patch(`/appointments/${id}`, data)
export const getTodaysSchedule    = ()       => api.get('/appointments/today')

// ─── Availability (Admin) ──────────────────────────────────────────────────
export const getAvailability    = ()         => api.get('/admin/availability')
export const createAvailability = (data)     => api.post('/admin/availability', data)
export const updateAvailability = (id, data) => api.patch(`/admin/availability/${id}`, data)
export const deleteAvailability = (id)       => api.delete(`/admin/availability/${id}`)
export const getSlotOverrides   = (params)   => api.get('/admin/availability/overrides', { params })
export const createSlotOverride = (data)     => api.post('/admin/availability/overrides', data)
export const deleteSlotOverride = (id)       => api.delete(`/admin/availability/overrides/${id}`)

// ─── Analytics (Public beacon) ───────────────────────────────────────────────
export const trackPageView = (data) =>
  api.post('/track', data).catch(() => {}) // fire-and-forget

// ─── Analytics (Admin) ──────────────────────────────────────────────────────
export const getAnalyticsSummary   = ()       => api.get('/admin/analytics/summary')
export const getAnalyticsDaily     = (params) => api.get('/admin/analytics/daily', { params })
export const getAnalyticsPages     = (params) => api.get('/admin/analytics/pages', { params })
export const getAnalyticsReferrers = (params) => api.get('/admin/analytics/referrers', { params })
export const getAnalyticsVisitors  = (params) => api.get('/admin/analytics/visitors', { params })

export default api
