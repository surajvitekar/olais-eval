import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { scoreAssessment } from "@/lib/scoring"

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch all questions
    const questions = await prisma.assessmentQuestion.findMany({
      orderBy: { displayOrder: "asc" },
    })

    if (questions.length === 0) {
      return NextResponse.json(
        { error: "No assessment questions configured" },
        { status: 400 }
      )
    }

    // Fetch user's responses
    const responses = await prisma.assessmentResponse.findMany({
      where: { userId: session.user.id },
    })

    if (responses.length === 0) {
      return NextResponse.json(
        { error: "No assessment responses found. Please submit your responses first." },
        { status: 400 }
      )
    }

    // Run scoring engine
    const result = scoreAssessment(
      questions.map((q) => ({
        id: q.id,
        category: q.category,
        questionType: q.questionType,
        questionText: q.questionText,
        options: q.options as Record<string, any>,
        weight: q.weight,
      })),
      responses.map((r) => ({
        questionId: r.questionId,
        responseValue: r.responseValue,
      }))
    )

    // Create skill profile record
    const profile = await prisma.$transaction(async (tx) => {
      const newProfile = await tx.skillProfile.create({
        data: {
          userId: session.user.id,
          scores: result.scores,
          topSkills: result.topSkills,
        },
      })

      // Update user status
      await tx.user.update({
        where: { id: session.user.id },
        data: { status: "ASSESSMENT_COMPLETED" },
      })

      return newProfile
    })

    return NextResponse.json({
      profile: {
        id: profile.id,
        scores: profile.scores,
        topSkills: profile.topSkills,
        generatedAt: profile.generatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("Complete assessment error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
