/**
 * Simple in-memory rate limiter.
 * Tracks request timestamps per IP, allows up to `maxAttempts` per `windowMs`.
 */

interface RateLimitEntry {
  timestamps: number[]
}

const store = new Map<string, RateLimitEntry>()

// Clean up stale entries every 60 seconds
const CLEANUP_INTERVAL = 60_000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  store.forEach((entry, key) => {
    if (entry.timestamps.length === 0) {
      store.delete(key)
    }
  })
}

export interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
}

export const defaultRateLimit: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 60_000, // 1 minute
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig = defaultRateLimit
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanup()

  const now = Date.now()
  const entry = store.get(key) ?? { timestamps: [] }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter(
    (ts) => now - ts < config.windowMs
  )

  if (entry.timestamps.length >= config.maxAttempts) {
    const oldest = entry.timestamps[0]
    const resetAt = oldest + config.windowMs
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    }
  }

  // Record this attempt
  entry.timestamps.push(now)
  store.set(key, entry)

  return {
    allowed: true,
    remaining: config.maxAttempts - entry.timestamps.length,
    resetAt: now + config.windowMs,
  }
}

export function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown"
  return `auth:${ip}`
}

/**
 * Password strength validation helper.
 */
export function isPasswordStrong(password: string): {
  valid: boolean
  message: string
} {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters" }
  }
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one uppercase letter",
    }
  }
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one lowercase letter",
    }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one number" }
  }
  return { valid: true, message: "Password is strong" }
}
