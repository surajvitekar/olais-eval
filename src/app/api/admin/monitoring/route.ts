import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  getMetrics,
  getRecentErrors,
  resetMetrics,
} from "@/lib/monitoring/metrics"
import prisma from "@/lib/prisma"
import { execSync } from "child_process"

// ─── GET /api/admin/monitoring ──────────────────────────────────────────────
// Returns current metrics snapshot

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const url = new URL(req.url)
    const includeErrors = url.searchParams.get("include_errors") === "true"

    const metrics = getMetrics()
    const response: Record<string, unknown> = { metrics }

    if (includeErrors) {
      response.recentErrors = getRecentErrors(20)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[Monitoring API] GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

// ─── DELETE /api/admin/monitoring ───────────────────────────────────────────
// Reset all metrics counters

export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    resetMetrics()
    return NextResponse.json({
      success: true,
      message: "All metrics counters reset",
    })
  } catch (error) {
    console.error("[Monitoring API] DELETE error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}

// ─── Helper: Docker health check ────────────────────────────────────────────

function checkDockerAvailable(): { available: boolean; message: string } {
  try {
    const output = execSync("docker info --format '{{.ServerVersion}}'", {
      timeout: 5000,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim()
    return { available: true, message: output || "running" }
  } catch {
    return { available: false, message: "Docker daemon not reachable" }
  }
}

// ─── Helper: Email provider health check ────────────────────────────────────

function checkEmailProvider(): { configured: boolean; message: string } {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { configured: false, message: "RESEND_API_KEY not set" }
  }
  // Just check if the key looks valid (starts with re_)
  if (!apiKey.startsWith("re_")) {
    return { configured: false, message: "RESEND_API_KEY format invalid" }
  }
  return { configured: true, message: "Resend API key configured" }
}

// ─── GET /api/admin/monitoring/health ───────────────────────────────────────
// Enhanced health check

export async function OPTIONS() {
  return NextResponse.json({})
}

// We need a separate export for the health sub-path.
// Next.js uses route groups: /api/admin/monitoring/health/route.ts
