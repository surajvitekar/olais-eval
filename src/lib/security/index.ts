/**
 * Security module barrel export.
 *
 * Provides rate limiting, security headers, and audit logging
 * for the Olais Eval platform.
 */

export {
  rateLimit,
  checkRateLimit,
  resetRateLimit,
  resetAllRateLimits,
  getRateLimitStoreSize,
  RATE_LIMIT_CONFIGS,
} from "./rate-limit"
export type { RateLimitResult, RateLimitConfig } from "./rate-limit"

export { getSecurityHeaders, applySecurityHeaders } from "./headers"
export type { SecurityHeadersConfig } from "./headers"

export {
  logAuditEntry,
  logApiRequest,
  auditEvent,
  extractIp,
  pathToAction,
} from "./audit"
