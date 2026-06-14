import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  checkRateLimit,
  resetRateLimit,
  resetAllRateLimits,
  getRateLimitStoreSize,
  RATE_LIMIT_CONFIGS,
} from "@/lib/security/rate-limit"
import type { RateLimitConfig } from "@/lib/security/rate-limit"

// ─── Types ──────────────────────────────────────────────────────────────────

interface RateLimitStatus {
  key: string
  config: RateLimitConfig
  current: number
  remaining: number
}

interface SecurityStatus {
  rateLimits: {
    configs: Record<string, RateLimitConfig>
    storeSize: number
    checkKeys: RateLimitStatus[]
  }
  headers: {
    csp: string
    hsts: string
    xfo: string
    contentType: string
    referrerPolicy: string
    permissionsPolicy: string
  }
}

// ─── GET /api/admin/security ────────────────────────────────────────────────
// Returns current security configuration and status

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Build status response
    const status: SecurityStatus = {
      rateLimits: {
        configs: {
          auth: RATE_LIMIT_CONFIGS.AUTH,
          generalApi: RATE_LIMIT_CONFIGS.GENERAL_API,
          sandbox: RATE_LIMIT_CONFIGS.SANDBOX,
          adminApi: RATE_LIMIT_CONFIGS.ADMIN_API,
          publicPage: RATE_LIMIT_CONFIGS.PUBLIC_PAGE,
        },
        storeSize: getRateLimitStoreSize(),
        checkKeys: [], // Sampled on demand
      },
      headers: {
        csp: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' ws: wss: https:; media-src 'self' blob:; frame-src 'none'; form-action 'self'; base-uri 'self'",
        hsts: process.env.NODE_ENV === "production"
          ? "max-age=63072000; includeSubDomains"
          : "disabled (dev mode)",
        xfo: "DENY",
        contentType: "nosniff",
        referrerPolicy: "strict-origin-when-cross-origin",
        permissionsPolicy: "All features blocked by default",
      },
    }

    return NextResponse.json({ status, configured: true })
  } catch (error) {
    console.error("[Security API] GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

// ─── PUT /api/admin/security ────────────────────────────────────────────────
// Update security configuration (reset rate limits, etc.)

export async function PUT(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { action } = body

    switch (action) {
      case "reset_all_rate_limits": {
        resetAllRateLimits()
        return NextResponse.json({
          success: true,
          message: "All rate limit counters reset",
        })
      }

      case "reset_rate_limit_key": {
        const { key } = body
        if (!key || typeof key !== "string") {
          return NextResponse.json(
            { error: "Missing or invalid 'key' parameter" },
            { status: 400 },
          )
        }
        resetRateLimit(key)
        return NextResponse.json({
          success: true,
          message: `Rate limit key '${key}' reset`,
        })
      }

      case "check_key": {
        const { key } = body
        if (!key || typeof key !== "string") {
          return NextResponse.json(
            { error: "Missing or invalid 'key' parameter" },
            { status: 400 },
          )
        }
        const result = checkRateLimit(key, RATE_LIMIT_CONFIGS.GENERAL_API.limit, RATE_LIMIT_CONFIGS.GENERAL_API.windowMs)
        return NextResponse.json({
          key,
          limit: result.limit,
          current: result.current,
          remaining: result.remaining,
          resetTime: result.resetTime,
          withinLimit: result.success,
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        )
    }
  } catch (error) {
    console.error("[Security API] PUT error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
