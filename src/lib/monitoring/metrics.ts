/**
 * ─── OLAIS EVAL — Monitoring & Metrics Collection ──────────────────────────
 * In-memory metrics for request counting, response time histograms,
 * active user tracking, and error rate monitoring.
 *
 * Data is stored in Maps and resets every hour to prevent unbounded growth.
 * ═════════════════════════════════════════════════════════════════════════════
 */

// ─── Types ──────────────────────────────────────────────────────────────────

interface HistogramBucket {
  fromMs: number
  toMs: number
  count: number
}

export interface MetricsSnapshot {
  requestCounts: Array<{
    path: string
    method: string
    status: number
    count: number
  }>
  responseTimeHistogram: HistogramBucket[]
  activeUsers: number
  totalRequests: number
  errorCount: number
  errorRate: number
  avgResponseTime: number
  uptimeSeconds: number
  collectedAt: number
  windowStart: number
}

export interface RecentError {
  path: string
  method: string
  status: number
  timestamp: number
  durationMs: number
}

// ─── Constants ──────────────────────────────────────────────────────────────

const HISTOGRAM_BUCKETS = [
  { fromMs: 0, toMs: 50 },
  { fromMs: 50, toMs: 100 },
  { fromMs: 100, toMs: 200 },
  { fromMs: 200, toMs: 500 },
  { fromMs: 500, toMs: 1000 },
  { fromMs: 1000, toMs: 2000 },
  { fromMs: 2000, toMs: 5000 },
  { fromMs: 5000, toMs: Infinity },
] as const

const RESET_INTERVAL_MS = 60 * 60 * 1000 // 1 hour
const MAX_RECENT_ERRORS = 100
const ERROR_STATUS_THRESHOLD = 400

// ─── Internal Store ─────────────────────────────────────────────────────────

interface RequestRecord {
  path: string
  method: string
  status: number
  durationMs: number
  userId?: string
  timestamp: number
}

let requestLog: RequestRecord[] = []
let windowStart = Date.now()
let startupTime = Date.now()

// Request counters by (path, method, status)
const requestCounters = new Map<string, number>()

// Response time histogram buckets
const histogramCounters = new Map<number, number>() // bucket index → count

// Active user tracking (userId → last seen timestamp)
const activeUsers = new Map<string, number>()

// Recent errors ring buffer
const recentErrors: RecentError[] = []

// ─── Helpers ────────────────────────────────────────────────────────────────

function keyForRequest(path: string, method: string, status: number): string {
  return `${method}:${path}:${status}`
}

function getBucketIndex(durationMs: number): number {
  for (let i = 0; i < HISTOGRAM_BUCKETS.length; i++) {
    const bucket = HISTOGRAM_BUCKETS[i]
    if (durationMs >= bucket.fromMs && durationMs < bucket.toMs) {
      return i
    }
    // Handle the Infinity case
    if (bucket.toMs === Infinity && durationMs >= bucket.fromMs) {
      return i
    }
  }
  return HISTOGRAM_BUCKETS.length - 1
}

function maybeResetWindow(): void {
  const now = Date.now()
  if (now - windowStart > RESET_INTERVAL_MS) {
    requestLog = []
    requestCounters.clear()
    histogramCounters.clear()
    activeUsers.clear()
    recentErrors.length = 0
    windowStart = now
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Record an API request with its metadata.
 * Updates counters, histogram, active users, and error tracking.
 */
export function recordRequest(params: {
  path: string
  method: string
  status: number
  durationMs: number
  userId?: string
}): void {
  maybeResetWindow()

  const { path, method, status, durationMs, userId } = params

  // Update request counter by (path, method, status)
  const key = keyForRequest(path, method, status)
  requestCounters.set(key, (requestCounters.get(key) ?? 0) + 1)

  // Update histogram
  const bucketIndex = getBucketIndex(durationMs)
  histogramCounters.set(bucketIndex, (histogramCounters.get(bucketIndex) ?? 0) + 1)

  // Track active user
  if (userId) {
    activeUsers.set(userId, Date.now())
  }

  // Track recent errors (status >= 400)
  if (status >= ERROR_STATUS_THRESHOLD) {
    recentErrors.push({
      path,
      method,
      status,
      timestamp: Date.now(),
      durationMs,
    })
    // Trim ring buffer
    if (recentErrors.length > MAX_RECENT_ERRORS) {
      recentErrors.splice(0, recentErrors.length - MAX_RECENT_ERRORS)
    }
  }

  // Full request log entry (for avg calculation)
  requestLog.push({ path, method, status, durationMs, userId, timestamp: Date.now() })
}

/**
 * Get a snapshot of all current metrics.
 */
export function getMetrics(): MetricsSnapshot {
  maybeResetWindow()

  const now = Date.now()
  const totalRequests = requestLog.length

  // Build request counts array
  const requestCounts: MetricsSnapshot["requestCounts"] = []
  requestCounters.forEach((count, key) => {
    const [method, ...pathParts] = key.split(":")
    const statusStr = pathParts.pop()!
    const path = pathParts.join(":")
    requestCounts.push({
      path,
      method,
      status: Number(statusStr),
      count,
    })
  })

  // Build histogram
  const responseTimeHistogram: HistogramBucket[] = HISTOGRAM_BUCKETS.map(
    (bucket, index) => ({
      fromMs: bucket.fromMs,
      toMs: bucket.toMs === Infinity ? -1 : bucket.toMs,
      count: histogramCounters.get(index) ?? 0,
    }),
  )

  // Calculate error metrics
  const errorCount = requestLog.filter((r) => r.status >= ERROR_STATUS_THRESHOLD).length
  const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0

  // Calculate average response time
  const totalDuration = requestLog.reduce((sum, r) => sum + r.durationMs, 0)
  const avgResponseTime = totalRequests > 0 ? totalDuration / totalRequests : 0

  // Prune stale active users (no activity in 15 minutes)
  const staleThreshold = now - 15 * 60 * 1000
  activeUsers.forEach((lastSeen, uid) => {
    if (lastSeen < staleThreshold) {
      activeUsers.delete(uid)
    }
  })

  return {
    requestCounts,
    responseTimeHistogram,
    activeUsers: activeUsers.size,
    totalRequests,
    errorCount,
    errorRate,
    avgResponseTime,
    uptimeSeconds: Math.floor((now - startupTime) / 1000),
    collectedAt: now,
    windowStart,
  }
}

/**
 * Get the list of recent errors (most recent first).
 */
export function getRecentErrors(limit = 20): RecentError[] {
  maybeResetWindow()
  return recentErrors.slice(-limit).reverse()
}

/**
 * Reset all metrics counters and start a fresh window.
 */
export function resetMetrics(): void {
  requestLog = []
  requestCounters.clear()
  histogramCounters.clear()
  activeUsers.clear()
  recentErrors.length = 0
  windowStart = Date.now()
  startupTime = Date.now()
}
