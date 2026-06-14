import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getFullAnalytics } from "@/lib/analytics/queries"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const analytics = await getFullAnalytics()

    return NextResponse.json(analytics)
  } catch (error) {
    console.error("Analytics error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
