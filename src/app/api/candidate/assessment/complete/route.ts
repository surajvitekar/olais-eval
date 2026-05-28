import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { scoreAssessment } from "@/lib/scoring"
import { assignProblems } from "@/lib/problem-assigner"
import { logAudit } from "@/lib/audit"

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ⛔ If user already has a skill profile, don't re-process
    const existingProfile = await prisma.skillProfile.findFirst({
      where: { userId: session.user.id },
    })
    if (existingProfile) {
      return NextResponse.json({
        message: "Assessment already completed. Problems were already assigned.",
        profile: {
          id: existingProfile.id,
          scores: existingProfile.scores,
          topSkills: existingProfile.topSkills,
          generatedAt: existingProfile.generatedAt.toISOString(),
        },
      })
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

    // Step 1: Create skill profile (commit first so assignProblems can find it)
    const profile = await prisma.skillProfile.create({
      data: {
        userId: session.user.id,
        scores: result.scores,
        topSkills: result.topSkills,
      },
    })

    // Step 2: Auto-assign problems based on skill profile
    let assignments: { id: string; problemTemplateId: string; status: string }[] = []
    try {
      const picks = await assignProblems(session.user.id)
      const created = await prisma.$transaction(async (tx) => {
        const results = []
        for (const pick of picks.slice(0, 2)) {
          const ap = await tx.assignedProblem.create({
            data: {
              userId: session.user.id,
              problemTemplateId: pick.id as string,
              status: "ASSIGNED",
              variantConfig: {},
            },
          })
          results.push(ap)
        }
        // Update user status
        await tx.user.update({
          where: { id: session.user.id },
          data: {
            status: results.length > 0 ? "PROBLEM_ASSIGNED" : "ASSESSMENT_COMPLETED",
          },
        })
        return results
      })
      assignments = created.map((a) => ({
        id: a.id,
        problemTemplateId: a.problemTemplateId,
        status: a.status,
      }))
    } catch (assignErr) {
      // Problems assigned but couldn't auto-assign — set status to ASSESSMENT_COMPLETED
      await prisma.user.update({
        where: { id: session.user.id },
        data: { status: "ASSESSMENT_COMPLETED" },
      })
      console.error("Auto-assign failed:", assignErr)
    }

    // Audit
    await logAudit("assessment.complete", {
      scores: profile.scores,
      topSkills: profile.topSkills,
      assignedProblems: assignments.map(a => a.id),
      autoAssignFailed: assignments.length === 0 ? true : undefined,
    }, session.user.id)

    return NextResponse.json({
      profile: {
        id: profile.id,
        scores: profile.scores,
        topSkills: profile.topSkills,
        generatedAt: profile.generatedAt.toISOString(),
      },
      assignments,
      message: assignments.length > 0
        ? `Assessment complete! ${assignments.length} problem(s) assigned based on your skills.`
        : "Assessment complete! Head to your dashboard to get problems assigned.",
    })
  } catch (error) {
    console.error("Complete assessment error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
