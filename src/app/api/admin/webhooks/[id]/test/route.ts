import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasPermission, Permission } from "@/lib/auth/permissions"
import type { UserRole } from "@/types"
import { sendTestEvent } from "@/lib/webhooks/events"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user || !hasPermission(session.user.role as UserRole, Permission.VIEW_CANDIDATES)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { id } = await params
    const result = await sendTestEvent(id)

    if (result.success) {
      return NextResponse.json({ success: true, statusCode: result.statusCode })
    }

    return NextResponse.json(
      { error: result.error || "Test event failed" },
      { status: 422 },
    )
  } catch (error) {
    console.error("Send test webhook error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
