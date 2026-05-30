import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, Star, ExternalLink, MessageSquare } from 'lucide-react'
import TestimonialCard from '../components/testimonials/TestimonialCard'
import { getTestimonials } from '../lib/api'

const GOOGLE_REVIEWS_URL = 'https://share.google/3imlOQOFAxoefCX60'

const filters = [
  { key: '',                label: 'All' },
  { key: 'seniors',        label: 'Seniors' },
  { key: 'womens-health',  label: "Women's Health" },
  { key: 'pain-management',label: 'Pain Management' },
  { key: 'sports-rehab',   label: 'Sports Injury' },
  { key: 'post-surgery',   label: 'Post-Surgery' },
  { key: 'kids',           label: 'Kids' },
]

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [visibleCount, setVisibleCount] = useState(8)

  const fetchTestimonials = (service) => {
    setLoading(true)
    setError('')
    getTestimonials(service ? { service } : {})
      .then((res) => {
        setTestimonials(res.data.testimonials || [])
        setVisibleCount(8)
      })
      .catch(() => setError('Failed to load testimonials.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchTestimonials(activeFilter)
  }, [activeFilter])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Hero banner */}
      <section
        className="pt-32 pb-16 md:pt-40 md:pb-20 text-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1B2F5E 0%, #1A4F6A 60%, #1A7F8E 100%)' }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #F5A623, transparent)' }} />
        </div>
        <div className="max-w-4xl mx-auto px-4 relative">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display font-bold text-3xl md:text-5xl text-white mb-4"
          >
            Patient Success Stories
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/70 text-lg max-w-2xl mx-auto"
          >
            Real recovery journeys from our patients. Every story represents dedication,
            expert care, and life-changing results.
          </motion.p>
          <motion.a
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 mt-6 px-6 py-2.5 bg-white rounded-full text-sm font-medium hover:shadow-lg transition-all"
            style={{ color: '#1B2F5E' }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Read All Reviews on Google <ExternalLink size={14} />
          </motion.a>
        </div>
      </section>

      {/* Google Reviews Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <motion.a
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="block rounded-2xl border border-gray-200 hover:shadow-xl transition-all cursor-pointer overflow-hidden"
          >
            {/* Top bar */}
            <div className="bg-white px-6 py-6 sm:px-8 sm:py-8 flex flex-col sm:flex-row items-center gap-6">
              {/* Google logo + rating */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" width="32" height="32">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </div>
                <div>
                  <h2 className="font-display font-bold text-xl sm:text-2xl" style={{ color: '#1B2F5E' }}>
                    Google Reviews
                  </h2>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-lg font-bold" style={{ color: '#1B2F5E' }}>5.0</span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={16} style={{ color: '#FBBC04', fill: '#FBBC04' }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px h-14 bg-gray-200" />

              {/* Description + CTA */}
              <div className="flex-1 text-center sm:text-left">
                <p className="text-muted text-sm leading-relaxed mb-3">
                  Read verified reviews from our patients on Google. See why families across Bengaluru trust ReFunction Rehab for physiotherapy.
                </p>
                <span
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm text-white"
                  style={{ background: '#4285F4' }}
                >
                  <MessageSquare size={15} />
                  Read All Patient Reviews <ExternalLink size={13} />
                </span>
              </div>
            </div>
          </motion.a>
        </div>
      </section>

      {/* Filters + Grid */}
      <section className="py-12 md:py-16" style={{ background: '#F0F6FA' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Loading */}
          {loading && (
            <div className="text-center py-16 text-muted">Loading testimonials...</div>
          )}

          {/* Error */}
          {error && (
            <div className="text-center py-16 text-red-500 flex items-center justify-center gap-2">
              <AlertCircle size={20} /> {error}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && testimonials.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted text-lg">No testimonials found for this category.</p>
              {activeFilter && (
                <button
                  onClick={() => setActiveFilter('')}
                  className="mt-4 text-sm font-medium"
                  style={{ color: '#1A7F8E' }}
                >
                  View all testimonials
                </button>
              )}
            </div>
          )}

          {/* Testimonial grid */}
          {!loading && !error && testimonials.length > 0 && (
            <>
              <div className="grid md:grid-cols-2 gap-6">
                {testimonials.slice(0, visibleCount).map((t) => (
                  <TestimonialCard key={t.id} testimonial={t} />
                ))}
              </div>

              {/* Load More */}
              {visibleCount < testimonials.length && (
                <div className="text-center mt-10">
                  <button
                    onClick={() => setVisibleCount((c) => c + 8)}
                    className="px-8 py-3 rounded-full font-medium text-sm transition-all hover:shadow-md"
                    style={{ background: '#fff', color: '#1B2F5E', border: '2px solid #1B2F5E' }}
                  >
                    Load More ({testimonials.length - visibleCount} remaining)
                  </button>
                </div>
              )}

              <p className="text-center text-muted text-sm mt-6">
                Showing {Math.min(visibleCount, testimonials.length)} of {testimonials.length} testimonials
              </p>
            </>
          )}
        </div>
      </section>
    </motion.div>
  )
}
