import cors from 'cors'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'

/** Parse CORS_ORIGINS=https://a.com,https://b.com — empty = reflect request origin (dev) */
export function buildCors() {
  const raw = String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (!raw.length) {
    return cors({ origin: true, credentials: true })
  }

  return cors({
    origin(origin, cb) {
      if (!origin || raw.includes(origin)) return cb(null, true)
      return cb(new Error(`CORS blocked for origin: ${origin}`))
    },
    credentials: true,
  })
}

export function buildHelmet() {
  return helmet({
    contentSecurityPolicy: false, // API-only; FE hosts its own CSP
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
}

export function authRateLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.AUTH_RATE_LIMIT || 40),
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many login attempts — try again later' },
  })
}

export function apiRateLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: Number(process.env.API_RATE_LIMIT || 300),
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Rate limit exceeded' },
  })
}
