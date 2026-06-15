import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { sendOutcomeNotification } from "@/lib/notifications/outcome"

// ─── Validation Schema ────────────────────────────────────────────────────────

const notifyOutcomeSchema = z.object({
  outcome: z.enum(["SELECTED", "REJECTED"]),
  nextSteps: z.string().optional(),
  feedback: z.string().optional(),
  companyName: z.string().optional(),
})

// ─── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { id } = await params

    const body = await request.json()
    const parsed = notifyOutcomeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { outcome, nextSteps, feedback, companyName } = parsed.data
    const result = await sendOutcomeNotification(id, outcome, { nextSteps, feedback, companyName })

    if (!result.sent) {
      return NextResponse.json(
        { error: result.error || "Failed to send notification" },
        { status: 404 },
      )
    }

    return NextResponse.json({ sent: true, channel: result.channel })
  } catch (error) {
    console.error("Notify outcome error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
