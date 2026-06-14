import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { execSync } from "child_process"

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
  if (!apiKey.startsWith("re_")) {
    return { configured: false, message: "RESEND_API_KEY format invalid" }
  }
  return { configured: true, message: "Resend API key configured" }
}

// ─── GET /api/admin/monitoring/health ───────────────────────────────────────
// Enhanced health check: DB, Docker sandbox, email provider

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const checks: Record<string, { status: "ok" | "error"; message: string }> = {}

    // 1. Database connectivity
    try {
      await prisma.$queryRaw`SELECT 1`
      checks.database = { status: "ok", message: "PostgreSQL connected" }
    } catch (err) {
      checks.database = {
        status: "error",
        message: err instanceof Error ? err.message : "Database connection failed",
      }
    }

    // 2. Docker sandbox
    const docker = checkDockerAvailable()
    checks.docker = {
      status: docker.available ? "ok" : "error",
      message: docker.message,
    }

    // 3. Email provider (Resend)
    const email = checkEmailProvider()
    checks.email = {
      status: email.configured ? "ok" : "error",
      message: email.message,
    }

    // 4. App config check
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    checks.appConfig = {
      status: appUrl ? "ok" : "error",
      message: appUrl
        ? `APP_URL=${appUrl}`
        : "NEXT_PUBLIC_APP_URL not configured",
    }

    // Overall status
    const allHealthy = Object.values(checks).every((c) => c.status === "ok")

    return NextResponse.json({
      status: allHealthy ? "healthy" : "degraded",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks,
    })
  } catch (error) {
    console.error("[Health API] GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
