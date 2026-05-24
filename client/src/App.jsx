import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

// Public layout
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import FloatingWhatsApp from './components/layout/FloatingWhatsApp'

// Public pages
import Home          from './pages/Home'
import About         from './pages/About'
import Services      from './pages/Services'
import ServiceDetail from './pages/ServiceDetail'
import Enroll        from './pages/Enroll'
import Contact       from './pages/Contact'
import Payment       from './pages/Payment'
import Testimonials  from './pages/Testimonials'

// Admin pages (no shared Navbar/Footer)
import AdminLogin    from './pages/admin/Login'
import AdminSetup    from './pages/admin/Setup'
import Dashboard     from './pages/admin/Dashboard'
import AdminPatients from './pages/admin/Patients'
import AdminPayments from './pages/admin/Payments'
import EditPatient         from './pages/admin/EditPatient'
import AdminTestimonials   from './pages/admin/Testimonials'
import AdminAvailability   from './pages/admin/Availability'
import AdminAppointments   from './pages/admin/Appointments'
import AdminAnalytics      from './pages/admin/Analytics'
import AdminNotifications  from './pages/admin/Notifications'
import PackageReceipt      from './pages/admin/PackageReceipt'
import Book                from './pages/Book'
import usePageTracking     from './hooks/usePageTracking'

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('rfr_token')
  return token ? children : <Navigate to="/admin/login" replace />
}

function PublicRoutes() {
  const location = useLocation()
  usePageTracking()
  return (
    <>
      <Navbar />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/"                element={<Home />}          />
          <Route path="/about"           element={<About />}         />
          <Route path="/services"        element={<Services />}      />
          <Route path="/services/:slug"  element={<ServiceDetail />} />
          <Route path="/enroll"          element={<Enroll />}        />
          <Route path="/contact"         element={<Contact />}       />
          <Route path="/book"            element={<Book />}          />
          <Route path="/testimonials"    element={<Testimonials />}  />
        </Routes>
      </AnimatePresence>
      <Footer />
      <FloatingWhatsApp />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin routes — no Navbar/Footer */}
        <Route path="/admin/login"     element={<AdminLogin />} />
        <Route path="/admin/setup"     element={<AdminSetup />} />
        <Route path="/admin/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/admin/patients"  element={<ProtectedRoute><AdminPatients /></ProtectedRoute>} />
        <Route path="/admin/patients/:id/edit" element={<ProtectedRoute><EditPatient /></ProtectedRoute>} />
        <Route path="/admin/payments"       element={<ProtectedRoute><AdminPayments /></ProtectedRoute>} />
        <Route path="/admin/testimonials"  element={<ProtectedRoute><AdminTestimonials /></ProtectedRoute>} />
        <Route path="/admin/availability"  element={<ProtectedRoute><AdminAvailability /></ProtectedRoute>} />
        <Route path="/admin/appointments"  element={<ProtectedRoute><AdminAppointments /></ProtectedRoute>} />
        <Route path="/admin/analytics"      element={<ProtectedRoute><AdminAnalytics /></ProtectedRoute>} />
        <Route path="/admin/notifications"  element={<ProtectedRoute><AdminNotifications /></ProtectedRoute>} />
        <Route path="/admin/payment"       element={<ProtectedRoute><Payment /></ProtectedRoute>} />
        <Route path="/admin/package-receipt/:packageId" element={<ProtectedRoute><PackageReceipt /></ProtectedRoute>} />
        <Route path="/admin"           element={<Navigate to="/admin/dashboard" replace />} />

        {/* All public routes */}
        <Route path="/*" element={<PublicRoutes />} />
      </Routes>
    </BrowserRouter>
  )
}
