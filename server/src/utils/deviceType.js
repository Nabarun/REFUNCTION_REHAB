/**
 * Detect device type from User-Agent string.
 * Returns "mobile", "tablet", or "desktop".
 */
function detectDevice(ua) {
  if (!ua) return 'desktop'
  const lower = ua.toLowerCase()

  // Tablet patterns (check before mobile since some tablets include "mobile")
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) {
    return 'tablet'
  }

  // Mobile patterns
  if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini|iemobile/i.test(ua)) {
    return 'mobile'
  }

  return 'desktop'
}

module.exports = { detectDevice }
