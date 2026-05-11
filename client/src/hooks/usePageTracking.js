import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '../lib/api'

export default function usePageTracking() {
  const location = useLocation()

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return

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
