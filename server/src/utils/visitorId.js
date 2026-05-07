const crypto = require('crypto')

/**
 * Generate a daily-rotating anonymous visitor ID.
 * sha256(IP + UserAgent + HMAC(JWT_SECRET, today's date)) truncated to 16 hex chars.
 * Raw IPs are never stored — only the hash.
 */
function generateVisitorId(ip, userAgent) {
  const secret = process.env.JWT_SECRET || 'fallback-analytics-salt'
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  // Daily salt so visitors can't be tracked across days
  const dailySalt = crypto
    .createHmac('sha256', secret)
    .update(today)
    .digest('hex')

  return crypto
    .createHash('sha256')
    .update(`${ip}${userAgent}${dailySalt}`)
    .digest('hex')
    .slice(0, 16)
}

module.exports = { generateVisitorId }
