import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import NextAuth from "next-auth"
import { authConfig } from "./lib/auth.config"
import { isAdminRole } from "./lib/auth/permissions"

const { auth } = NextAuth(authConfig)
import type { UserRole } from "./types"
import {
  rateLimit,
  RATE_LIMIT_CONFIGS,
} from "./lib/security/rate-limit"
import { applySecurityHeaders } from "./lib/security/headers"
import { logApiRequest, extractIp } from "./lib/security/audit"
import { recordRequest } from "./lib/monitoring/metrics"

// Public routes that don't require auth
const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/leaderboard",
  "/api/invite",
  "/api/leaderboard",
  "/api/auth",
  "/INSTRUCTIONS.md",
]

// Admin-only routes
const adminRoutes = ["/admin"]

// ─── Rate Limit Helpers ─────────────────────────────────────────────────────

/**
 * Determine the rate limit config and key for a given request path.
 */
function getRateLimitConfig(pathname: string) {
  // Auth endpoints: strict
  if (
    pathname.startsWith("/api/auth") ||
    pathname === "/login" ||
    pathname === "/register"
  ) {
    return { config: RATE_LIMIT_CONFIGS.AUTH, category: "auth" }
  }

  // Sandbox / code execution
  if (pathname.startsWith("/api/sandbox") || pathname.startsWith("/sandbox")) {
    return { config: RATE_LIMIT_CONFIGS.SANDBOX, category: "sandbox" }
  }

  // Admin API: moderate
  if (pathname.startsWith("/api/admin")) {
    return { config: RATE_LIMIT_CONFIGS.ADMIN_API, category: "admin" }
  }

  // Public pages
  if (
    publicRoutes.some(
      (route) => pathname === route || pathname.startsWith(route + "/"),
    )
  ) {
    return { config: RATE_LIMIT_CONFIGS.PUBLIC_PAGE, category: "public" }
  }

  // Default: general API
  return { config: RATE_LIMIT_CONFIGS.GENERAL_API, category: "general" }
}

/**
 * Build a rate limit key from the request.
 * Prefers session user ID, falls back to IP.
 */
function buildRateLimitKey(req: NextRequest, sessionUserId?: string): string {
  if (sessionUserId) {
    return `user:${sessionUserId}`
  }
  const ip = extractIp(req)
  return `ip:${ip ?? "unknown"}`
}

/**
 * Apply rate limiting. Returns a 429 response if rate limited,
 * or null to continue.
 */
async function applyRateLimit(
  req: NextRequest,
): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl

  // Skip rate limiting for internal Next.js assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets")
  ) {
    return null
  }

  // Try to get session for user-based limiting
  let sessionUserId: string | undefined
  try {
    const session = await auth()
    if (session?.user?.id) {
      sessionUserId = session.user.id
    }
  } catch {
    // Not authenticated — that's fine, use IP-based limiting
  }

  const { config } = getRateLimitConfig(pathname)
  const key = buildRateLimitKey(req, sessionUserId)

  const result = rateLimit(key, config.limit, config.windowMs)

  if (!result.success) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)
    const response = NextResponse.json(
      {
        error: "Too many requests",
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(result.resetTime / 1000)),
        },
      },
    )
    return response
  }

  return null
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── 0. Apply rate limiting BEFORE everything else ─────────────────────────
  const rateLimitResponse = await applyRateLimit(req)
  if (rateLimitResponse) {
    recordRequest({
      path: pathname,
      method: req.method,
      status: 429,
      durationMs: 0,
    })
    return rateLimitResponse
  }

  // ── 1. Allow Next.js internal routes ─────────────────────────────────────
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets")
  ) {
    const response = NextResponse.next()
    applySecurityHeaders(response)
    recordRequest({
      path: pathname,
      method: req.method,
      status: response.status,
      durationMs: 0,
    })
    return response
  }

  // ── 2. Allow public routes ───────────────────────────────────────────────
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"))) {
    const response = NextResponse.next()
    applySecurityHeaders(response)

    // Log public API requests
    if (pathname.startsWith("/api/")) {
      logApiRequest(req)
    }

    recordRequest({
      path: pathname,
      method: req.method,
      status: response.status,
      durationMs: 0,
    })

    return response
  }

  // ── 3. Check authentication ──────────────────────────────────────────────
  const session = await auth()

  if (!session?.user) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    const redirect = NextResponse.redirect(loginUrl)
    recordRequest({
      path: pathname,
      method: req.method,
      status: 302,
      durationMs: 0,
    })
    return redirect
  }

  // ── 4. Admin route protection — check if user has an admin-level role ────
  if (adminRoutes.some((route) => pathname.startsWith(route))) {
    if (!isAdminRole(session.user.role as UserRole)) {
      const redirect = NextResponse.redirect(new URL("/dashboard", req.url))
      recordRequest({
        path: pathname,
        method: req.method,
        status: 302,
        durationMs: 0,
        userId: session.user.id,
      })
      return redirect
    }
  }

  // ── 5. Candidate-specific protections ────────────────────────────────────
  if (
    session.user.role === "CANDIDATE" &&
    (pathname.startsWith("/assessment") ||
     pathname.startsWith("/problems") ||
     pathname.startsWith("/submissions") ||
     pathname.startsWith("/instructions") ||
     pathname.startsWith("/dashboard"))
  ) {
    const response = NextResponse.next()
    applySecurityHeaders(response)
    recordRequest({
      path: pathname,
      method: req.method,
      status: response.status,
      durationMs: 0,
      userId: session.user.id,
    })
    return response
  }

  // ── 6. Default: pass through with security headers ───────────────────────
  const response = NextResponse.next()
  applySecurityHeaders(response)

  // Log API requests to audit log (fire-and-forget)
  if (pathname.startsWith("/api/")) {
    logApiRequest(req, session.user.id)
  }

  recordRequest({
    path: pathname,
    method: req.method,
    status: response.status,
    durationMs: 0,
    userId: session.user.id,
  })

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    "/((?!_next/static|_next/image|favicon\\.ico|assets).*)",
  ],
}
