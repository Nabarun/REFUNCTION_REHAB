import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import TestimonialCard from './TestimonialCard'
import { getTestimonials } from '../../lib/api'

export default function TestimonialCarousel() {
  const [testimonials, setTestimonials] = useState([])
  const [current, setCurrent]           = useState(0)
  const [paused, setPaused]             = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    getTestimonials({ featured: true, limit: 6 })
      .then((res) => setTestimonials(res.data.testimonials || []))
      .catch(() => {})
  }, [])

  // Auto-scroll
  useEffect(() => {
    if (testimonials.length <= 1 || paused) return
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(timerRef.current)
  }, [testimonials.length, paused])

  if (testimonials.length === 0) return null

  const prev = () => setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length)
  const next = () => setCurrent((c) => (c + 1) % testimonials.length)

  // Show up to 3 cards at a time on desktop
  const getVisibleCards = () => {
    const cards = []
    for (let i = 0; i < Math.min(3, testimonials.length); i++) {
      cards.push(testimonials[(current + i) % testimonials.length])
    }
    return cards
  }

  return (
    <section className="py-16 md:py-20" style={{ background: '#F0F6FA' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-display font-bold text-3xl md:text-4xl" style={{ color: '#1B2F5E' }}>
            What Our Patients Say
          </h2>
          <p className="text-muted mt-3 text-lg">Real stories from real patients</p>
        </motion.div>

        {/* Carousel */}
        <div
          className="relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Desktop: 3-column grid */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getVisibleCards().map((t) => (
              <TestimonialCard key={t.id} testimonial={t} compact />
            ))}
          </div>

          {/* Mobile: single card */}
          <div className="md:hidden">
            <TestimonialCard testimonial={testimonials[current]} compact />
          </div>

          {/* Navigation arrows */}
          {testimonials.length > 3 && (
            <div className="hidden md:flex items-center justify-center gap-3 mt-8">
              <button
                onClick={prev}
                className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center hover:shadow-md transition-shadow"
                style={{ color: '#1B2F5E' }}
              >
                <ChevronLeft size={20} />
              </button>
              {/* Dots */}
              <div className="flex gap-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className="w-2.5 h-2.5 rounded-full transition-all"
                    style={{
                      background: i === current ? '#1A7F8E' : '#CBD5E1',
                      transform: i === current ? 'scale(1.2)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
              <button
                onClick={next}
                className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center hover:shadow-md transition-shadow"
                style={{ color: '#1B2F5E' }}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          {/* Mobile dots + arrows */}
          {testimonials.length > 1 && (
            <div className="md:hidden flex items-center justify-center gap-3 mt-6">
              <button onClick={prev} className="w-9 h-9 rounded-full bg-white shadow flex items-center justify-center" style={{ color: '#1B2F5E' }}>
                <ChevronLeft size={18} />
              </button>
              <div className="flex gap-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className="w-2 h-2 rounded-full transition-all"
                    style={{ background: i === current ? '#1A7F8E' : '#CBD5E1' }}
                  />
                ))}
              </div>
              <button onClick={next} className="w-9 h-9 rounded-full bg-white shadow flex items-center justify-center" style={{ color: '#1B2F5E' }}>
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        {/* View All + Google Reviews link */}
        <div className="text-center mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/testimonials"
            className="inline-flex items-center gap-2 font-medium hover:gap-3 transition-all"
            style={{ color: '#1A7F8E' }}
          >
            View All Testimonials <ArrowRight size={18} />
          </Link>
          <span className="hidden sm:inline text-gray-300">|</span>
          <a
            href="https://share.google/3imlOQOFAxoefCX60"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium hover:opacity-80 transition-opacity"
            style={{ color: '#4285F4' }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Read Reviews on Google
          </a>
        </div>
      </div>
    </section>
  )
}
