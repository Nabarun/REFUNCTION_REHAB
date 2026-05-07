import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '../lib/api'

/**
 * Fire-and-forget page view beacon on every public route change.
 * Skips /admin/* routes.
 */
export default function usePageTracking() {
  const location = useLocation()

  useEffect(() => {
    // Don't track admin pages
    if (location.pathname.startsWith('/admin')) return

    trackPageView({
      path: location.pathname,
      referrer: document.referrer || null,
    })
  }, [location.pathname])
}
