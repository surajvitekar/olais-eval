import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { logAudit } from "@/lib/audit"

const submitSchema = z.object({
  responses: z.array(
    z.object({
      questionId: z.string().min(1),
      responseValue: z.any(),
    })
  ).min(1, "At least one response is required"),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = submitSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { responses } = parsed.data
    const userId = session.user.id

    // Upsert each response (idempotent — candidates can revise before completing)
    await prisma.$transaction(
      responses.map((r) =>
        prisma.assessmentResponse.upsert({
          where: { userId_questionId: { userId, questionId: r.questionId } },
          create: { userId, questionId: r.questionId, responseValue: r.responseValue },
          update: { responseValue: r.responseValue },
        })
      )
    )

    await logAudit("assessment.responses_submitted", { count: responses.length }, userId)

    return NextResponse.json({ success: true, count: responses.length })
  } catch (error) {
    console.error("Assessment submit error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
