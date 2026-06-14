/**
 * Security headers configuration for Olais Eval.
 *
 * Provides a `getSecurityHeaders()` function that returns a
 * `Headers` object with hardened security policies suitable for
 * an assessment platform running behind Cloudflare Tunnel.
 *
 * Includes: CSP, HSTS, X-Frame-Options, X-Content-Type-Options,
 * Referrer-Policy, Permissions-Policy, and more.
 *
 * Usage in Next.js 16 proxy.ts:
 *   import { getSecurityHeaders } from "@/lib/security/headers"
 *   const response = NextResponse.next()
 *   getSecurityHeaders().forEach((value, key) => response.headers.set(key, value))
 *   return response
 */

export interface SecurityHeadersConfig {
  /** Content Security Policy string (default: restrictive) */
  contentSecurityPolicy?: string
  /** HTTP Strict-Transport-Security max-age in seconds (default: 2 years) */
  hstsMaxAge?: number
  /** Include subdomains in HSTS (default: true) */
  hstsIncludeSubdomains?: boolean
  /** X-Frame-Options value (default: "DENY") */
  xFrameOptions?: string
  /** X-Content-Type-Options value (default: "nosniff") */
  xContentTypeOptions?: string
  /** Referrer-Policy value (default: "strict-origin-when-cross-origin") */
  referrerPolicy?: string
}

// ─── Default CSP ────────────────────────────────────────────────────────────

const DEFAULT_CSP = [
  // Default: only same-origin
  "default-src 'self'",
  // Scripts: same-origin + inline for Next.js
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // Styles: same-origin + inline for Tailwind / CSS-in-JS
  "style-src 'self' 'unsafe-inline'",
  // Images: same-origin + data: + blob: + https: for avatars
  "img-src 'self' data: blob: https:",
  // Fonts: same-origin + data: (for icons)
  "font-src 'self' data:",
  // Connections: same-origin + WebSocket for dev
  "connect-src 'self' ws: wss: https:",
  // Media: same-origin + blob:
  "media-src 'self' blob:",
  // Frames: deny by default
  "frame-src 'none'",
  // Form actions: same-origin
  "form-action 'self'",
  // Base URIs: same-origin
  "base-uri 'self'",
  // Report-URI (optional)
  // "report-uri /api/csp-report",
].join("; ")

// ─── Header Builder ─────────────────────────────────────────────────────────

/**
 * Build a `Headers` object with security hardening.
 *
 * @param overrides Optional overrides for specific headers
 * @returns A new `Headers` instance
 */
export function getSecurityHeaders(
  overrides?: SecurityHeadersConfig,
): Headers {
  const headers = new Headers()

  // 1. Content Security Policy
  headers.set(
    "Content-Security-Policy",
    overrides?.contentSecurityPolicy ?? DEFAULT_CSP,
  )

  // 2. HTTP Strict-Transport-Security (only in production)
  if (process.env.NODE_ENV === "production") {
    const maxAge = overrides?.hstsMaxAge ?? 63_072_000 // 2 years
    const includeSubdomains =
      overrides?.hstsIncludeSubdomains !== false
        ? "; includeSubDomains"
        : ""
    headers.set(
      "Strict-Transport-Security",
      `max-age=${maxAge}${includeSubdomains}`,
    )
  }

  // 3. X-Frame-Options
  headers.set(
    "X-Frame-Options",
    overrides?.xFrameOptions ?? "DENY",
  )

  // 4. X-Content-Type-Options
  headers.set(
    "X-Content-Type-Options",
    overrides?.xContentTypeOptions ?? "nosniff",
  )

  // 5. Referrer-Policy
  headers.set(
    "Referrer-Policy",
    overrides?.referrerPolicy ?? "strict-origin-when-cross-origin",
  )

  // 6. Permissions-Policy (block all powerful features by default)
  const permissionsPolicy = [
    "accelerometer=()",
    "ambient-light-sensor=()",
    "autoplay=()",
    "battery=()",
    "camera=()",
    "display-capture=()",
    "document-domain=()",
    "encrypted-media=()",
    "fullscreen=(self)",
    "gamepad=()",
    "geolocation=()",
    "gyroscope=()",
    "layout-animations=()",
    "legacy-image-formats=()",
    "magnetometer=()",
    "microphone=()",
    "midi=()",
    "oversized-images=()",
    "payment=()",
    "picture-in-picture=()",
    "publickey-credentials-get=()",
    "screen-wake-lock=()",
    "sync-xhr=(self)",
    "usb=()",
    "web-share=()",
    "xr-spatial-tracking=()",
  ].join(", ")
  headers.set("Permissions-Policy", permissionsPolicy)

  // 7. Cross-Origin-Embedder-Policy (for security isolation)
  headers.set("Cross-Origin-Embedder-Policy", "require-corp")

  // 8. Cross-Origin-Opener-Policy
  headers.set("Cross-Origin-Opener-Policy", "same-origin")

  // 9. Cross-Origin-Resource-Policy
  headers.set("Cross-Origin-Resource-Policy", "same-origin")

  // 10. X-DNS-Prefetch-Control
  headers.set("X-DNS-Prefetch-Control", "off")

  // 11. X-Download-Options (IE)
  headers.set("X-Download-Options", "noopen")

  // 12. X-Powered-By removal hint (set by Next.js — we strip in proxy)
  headers.set("X-Content-Security-Policy", DEFAULT_CSP) // legacy fallback

  return headers
}

/**
 * Apply security headers to a Next.js Response object.
 *
 * @param response A `NextResponse` (or plain `Response`)
 * @param config   Optional header overrides
 */
export function applySecurityHeaders(
  response: { headers: Headers },
  config?: SecurityHeadersConfig,
): void {
  const securityHeaders = getSecurityHeaders(config)
  securityHeaders.forEach((value, key) => {
    // Don't override if already set
    if (!response.headers.has(key)) {
      response.headers.set(key, value)
    }
  })
}
