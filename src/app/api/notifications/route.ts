import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/notifications
 * Admin-only. Returns recent "notification.sent" audit log entries.
 *
 * Query params:
 *   ?userId=xxx  — optional filter by userId
 *
 * Response: { notifications: AuditLog[] }  (last 50 entries)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const url = request.nextUrl
    const userId = url.searchParams.get("userId")

    const notifications = await prisma.auditLog.findMany({
      where: {
        action: "notification.sent",
        ...(userId ? { userId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error("[Notifications API] Error fetching notification logs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
