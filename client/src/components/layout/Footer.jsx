import { Link } from 'react-router-dom'
import { Phone, MessageCircle, MapPin, Clock, Globe, Share2, Tv } from 'lucide-react'

const services = [
  { label: 'Physiotherapy for Seniors', to: '/services/seniors' },
  { label: "Women's Health & Postnatal", to: '/services/womens-health' },
  { label: 'Back, Neck & Shoulder Pain', to: '/services/pain-management' },
  { label: 'Sports Injury Rehab',        to: '/services/sports-rehab' },
  { label: 'Kids Exercise Program',      to: '/services/kids' },
]

const quickLinks = [
  { label: 'Home',    to: '/' },
  { label: 'About',   to: '/about' },
  { label: 'Services',to: '/services' },
  { label: 'Book',    to: '/book' },
  { label: 'Enroll',  to: '/enroll' },
  { label: 'Contact', to: '/contact' },
]

export default function Footer() {
  const wa = "https://wa.me/919900911795?text=Hi%20Dr.%20Neha%2C%20I'd%20like%20to%20book%20a%20physiotherapy%20session."
  return (
    <footer className="bg-navy text-white">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
              <circle cx="22" cy="6" r="4" fill="#1A7F8E"/>
              <path d="M14 14c2-3 5-5 8-4l4 2-3 6-4-2-5 8 6 4-2 4-8-5 4-13z" fill="white"/>
              <path d="M10 18l-4 10h4l3-7 3 3 2-4-4-4-4 2z" fill="#1A7F8E"/>
            </svg>
            <span className="font-display font-bold text-lg">
              <span style={{color:'#1A7F8E'}}>Re</span>Function Rehab
            </span>
          </div>
          <p className="text-white/70 text-sm leading-relaxed mb-5">
            Specialized physiotherapy care led by Dr. Neha Trivedi, MPT — 15+ years of experience in musculoskeletal & sports injury rehabilitation.
          </p>
          <div className="flex gap-3">
            {[Globe, Share2, Tv].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-teal flex items-center justify-center transition-colors duration-200"
                aria-label="Social"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-display font-semibold text-base mb-5 text-gold">Quick Links</h4>
          <ul className="space-y-2.5">
            {quickLinks.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className="text-white/70 hover:text-white text-sm transition-colors flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-teal inline-block" />
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Services */}
        <div>
          <h4 className="font-display font-semibold text-base mb-5 text-gold">Our Services</h4>
          <ul className="space-y-2.5">
            {services.map((s) => (
              <li key={s.to}>
                <Link
                  to={s.to}
                  className="text-white/70 hover:text-white text-sm transition-colors flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-teal inline-block" />
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-display font-semibold text-base mb-5 text-gold">Contact Us</h4>
          <ul className="space-y-4">
            <li>
              <a
                href="tel:+919900911795"
                className="flex items-start gap-3 text-white/70 hover:text-white transition-colors text-sm"
              >
                <Phone size={16} className="mt-0.5 text-teal flex-shrink-0" />
                <span>99009 11795</span>
              </a>
            </li>
            <li>
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 text-white/70 hover:text-white transition-colors text-sm"
              >
                <MessageCircle size={16} className="mt-0.5 text-teal flex-shrink-0" />
                <span>WhatsApp Us</span>
              </a>
            </li>
            <li className="flex items-start gap-3 text-white/70 text-sm">
              <MapPin size={16} className="mt-0.5 text-teal flex-shrink-0" />
              <span>Bengaluru, Karnataka, India</span>
            </li>
            <li className="flex items-start gap-3 text-white/70 text-sm">
              <Clock size={16} className="mt-0.5 text-teal flex-shrink-0" />
              <span>Mon–Sun: 9AM – 9PM</span>
            </li>
          </ul>
          <div className="mt-5 inline-flex items-center gap-1.5 bg-teal/20 border border-teal/40 text-teal text-xs font-semibold px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
            7PM–8PM Batch • Few Spots Left
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-white/50">
          <p>© 2025 ReFunction Rehab. All rights reserved.</p>
          <p>Designed with care for better health outcomes.</p>
        </div>
      </div>

      {/* Powered by */}
      <div className="border-t border-white/10 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 text-center text-xs text-white/50">
          Powered by{' '}
          <a
            href="https://kaushalstack.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal hover:text-white transition-colors font-medium"
          >
            kaushalstack.com
          </a>
        </div>
      </div>
    </footer>
  )
}
