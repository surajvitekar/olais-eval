/**
 * Sliding window rate limiter for Olais Eval.
 *
 * Uses an in-memory Map (window-based) to track request timestamps.
 * Exported functions:
 *   - rateLimit(key, limit, windowMs): checks & records a request
 *   - checkRateLimit(key, limit, windowMs): read-only check (no record)
 *   - resetRateLimit(key): clears counters for a key
 *
 * Works in proxy.ts BEFORE auth checks. Supports both IP-based
 * and session/user-based limiting.
 *
 * Recommended default limits:
 *   Auth routes (login, register)     → 10 req / min
 *   General API                        → 120 req / min
 *   Sandbox execution                  → 5 req / min
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetTime: number // Unix timestamp (ms) when the window resets
  limit: number
  current: number // Current count in window
}

export interface RateLimitConfig {
  limit: number
  windowMs: number
}

// ─── Store ──────────────────────────────────────────────────────────────────

/**
 * Internal store mapping a key → sorted array of request timestamps (ms).
 * The array acts as a sliding window: entries older than `windowMs` ago
 * are pruned on each check.
 */
const store = new Map<string, number[]>()

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Prune expired timestamps from the window for a given key.
 * Returns the cleaned array (may be empty).
 */
function prune(key: string, windowMs: number): number[] {
  const now = Date.now()
  const cutoff = now - windowMs
  const timestamps = store.get(key) ?? []
  const valid = timestamps.filter((t) => t > cutoff)
  if (valid.length === 0) {
    store.delete(key)
  } else {
    store.set(key, valid)
  }
  return valid
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Check and record a request against the sliding window rate limit.
 *
 * @param key      Unique identifier (e.g. "ip:1.2.3.4" or "user:abc123")
 * @param limit    Max number of requests allowed in the window
 * @param windowMs Window duration in milliseconds
 * @returns        RateLimitResult
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const valid = prune(key, windowMs)
  const current = valid.length + 1 // +1 for this request
  const now = Date.now()

  const resetTime = now + windowMs

  if (current > limit) {
    return {
      success: false,
      remaining: 0,
      resetTime,
      limit,
      current: current - 1, // don't count this rejected request
    }
  }

  // Record this request
  valid.push(now)
  store.set(key, valid)

  return {
    success: true,
    remaining: limit - current,
    resetTime,
    limit,
    current,
  }
}

/**
 * Read-only check — does NOT record the request.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const valid = prune(key, windowMs)
  const current = valid.length
  const now = Date.now()
  const resetTime = now + windowMs
  const remaining = Math.max(0, limit - current)

  return {
    success: current < limit,
    remaining,
    resetTime,
    limit,
    current,
  }
}

/**
 * Reset (clear) rate limit counters for a given key.
 */
export function resetRateLimit(key: string): void {
  store.delete(key)
}

/**
 * Clear all stored rate limit data (e.g. during testing).
 */
export function resetAllRateLimits(): void {
  store.clear()
}

/**
 * Get approximate store size (for diagnostics).
 */
export function getRateLimitStoreSize(): number {
  return store.size
}

/**
 * Pre-built rate limit configurations.
 */
export const RATE_LIMIT_CONFIGS = {
  /** Auth endpoints: 300 requests per minute — every page load makes 3-4 auth calls */
  AUTH: { limit: 300, windowMs: 60_000 },
  /** General API endpoints: 300 requests per minute */
  GENERAL_API: { limit: 300, windowMs: 60_000 },
  /** Sandbox / code execution: 20 requests per minute */
  SANDBOX: { limit: 20, windowMs: 60_000 },
  /** Admin API: 120 requests per minute */
  ADMIN_API: { limit: 120, windowMs: 60_000 },
  /** Public pages: 120 requests per minute */
  PUBLIC_PAGE: { limit: 120, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitConfig>
