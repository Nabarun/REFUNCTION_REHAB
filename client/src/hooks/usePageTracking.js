import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '../lib/api'

const CANONICAL_BASE = 'https://www.refunctionrehab.in'

export default function usePageTracking() {
  const location = useLocation()

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return

    // Update canonical tag to reflect current page
    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = CANONICAL_BASE + location.pathname

    // Self-hosted analytics
    trackPageView({
      path: location.pathname,
      referrer: document.referrer || null,
    })

    // GA4 SPA page view
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: location.pathname,
        page_location: window.location.href,
      })
    }
  }, [location.pathname])
}
