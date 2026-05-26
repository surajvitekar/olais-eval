import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { responses } = body

    if (!responses || !Array.isArray(responses) || responses.length === 0) {
      return NextResponse.json(
        { error: "Responses array is required" },
        { status: 400 }
      )
    }

    // Validate each response has questionId and responseValue
    for (const r of responses) {
      if (!r.questionId) {
        return NextResponse.json(
          { error: "Each response must have a questionId" },
          { status: 400 }
        )
      }
    }

    // Batch create/update responses
    const created = await prisma.$transaction(async (tx) => {
      const results = []
      for (const r of responses) {
        const result = await tx.assessmentResponse.upsert({
          where: {
            userId_questionId: {
              userId: session.user.id,
              questionId: r.questionId,
            },
          },
          update: {
            responseValue: r.responseValue,
          },
          create: {
            userId: session.user.id,
            questionId: r.questionId,
            responseValue: r.responseValue,
          },
        })
        results.push(result)
      }
      return results
    })

    return NextResponse.json({
      message: `Submitted ${created.length} response(s)`,
      count: created.length,
    })
  } catch (error) {
    console.error("Submit responses error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
