/**
 * Request audit logging for Olais Eval.
 *
 * Provides middleware-style functions to log API requests to the
 * AuditLog table. Designed to be called from proxy.ts or individual
 * API route handlers.
 *
 * The AuditLog model already exists in Prisma with:
 *   id, userId?, action, metadata (Json), ip?, createdAt
 */

import prisma from "@/lib/prisma"
import type { NextRequest } from "next/server"
import type { Prisma } from "@/generated/prisma/client"

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  /** Optional user ID (string or null) */
  userId?: string | null
  /** Action identifier, e.g. "api.auth.login" or "proxy.request" */
  action: string
  /** Arbitrary JSON metadata */
  metadata?: Record<string, unknown>
  /** Client IP address */
  ip?: string | null
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Extract a client IP address from a NextRequest.
 * Checks common headers used by Cloudflare Tunnel, proxies, etc.
 */
export function extractIp(req: NextRequest): string | null {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-client-ip") ??
    null
  )
}

/**
 * Extract path-based action name from a request URL and method.
 * e.g. GET /api/admin/security → "api.admin.security.read"
 */
export function pathToAction(req: NextRequest): string {
  const { pathname } = req.nextUrl
  const method = req.method.toLowerCase()

  // Strip leading/trailing slashes
  const cleaned = pathname.replace(/^\/+|\/+$/g, "").replace(/\//g, ".")
  if (!cleaned) return `root.${method}`

  return `${cleaned}.${method}`
}

// ─── Logging ────────────────────────────────────────────────────────────────

/**
 * Log a request to the AuditLog table.
 *
 * Can be called:
 *  1. From proxy.ts for every API request
 *  2. From individual route handlers for specific actions
 *
 * This function is fire-and-forget: errors are caught and logged
 * to console so they never crash the request.
 *
 * @param entry  Audit log entry data
 * @returns      The created AuditLog record, or null on error
 */
export async function logAuditEntry(
  entry: AuditLogEntry,
): Promise<unknown | null> {
  try {
    const log = await prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        metadata: (entry.metadata ?? {}) as unknown as Prisma.InputJsonValue,
        ip: entry.ip ?? null,
      },
    })
    return log
  } catch (error) {
    // Never let logging crash the request
    console.error("[AuditLog] Failed to write audit entry:", error)
    return null
  }
}

/**
 * Log an API request automatically by extracting IP, path, method, etc.
 * Fire-and-forget — does not await the DB write.
 *
 * @param req    The incoming NextRequest
 * @param userId Optional authenticated user ID
 */
export function logApiRequest(
  req: NextRequest,
  userId?: string | null,
): void {
  const action = pathToAction(req)
  const ip = extractIp(req)
  const metadata: Record<string, unknown> = {
    userAgent: req.headers.get("user-agent") ?? undefined,
    method: req.method,
    path: req.nextUrl.pathname,
    query: Object.fromEntries(req.nextUrl.searchParams.entries()),
  }

  // Fire-and-forget — don't block the request
  logAuditEntry({ userId, action, metadata, ip }).catch(() => {
    // Already handled in logAuditEntry
  })
}

/**
 * Create an audit log entry for a specific event (e.g. login, logout,
 * rate limit exceeded, etc.).
 *
 * @param action   Action name (e.g. "auth.login", "rate_limit.exceeded")
 * @param metadata Additional context
 * @param userId   Optional user ID
 * @param ip       Optional client IP
 */
export async function auditEvent(
  action: string,
  metadata?: Record<string, unknown>,
  userId?: string | null,
  ip?: string | null,
): Promise<unknown | null> {
  return logAuditEntry({ userId, action, metadata, ip })
}
