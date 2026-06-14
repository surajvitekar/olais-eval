import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { compareSubmissions } from "@/lib/plagiarism/comparison"

// ─── GET /api/admin/plagiarism ───────────────────────────────────────────────
// Query params: ?cycleId=xxx  or  ?problemId=xxx

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const cycleId = searchParams.get("cycleId")
    const problemId = searchParams.get("problemId")

    if (!cycleId && !problemId) {
      return NextResponse.json(
        { error: "Provide either cycleId or problemId query parameter" },
        { status: 400 }
      )
    }

    // Build the where clause for submissions
    // Submissions are linked to AssignedProblem which links to ProblemTemplate
    // If cycleId is provided, filter AssignedProblem by the cycle (via LeaderboardEntry cycleId convention)
    const assignedProblemWhere: Record<string, unknown> = {}

    if (problemId) {
      assignedProblemWhere.problemTemplateId = problemId
    }

    if (cycleId) {
      // Filter by users who have a LeaderboardEntry for this cycle
      // Since there's no direct cycle model, we use leaderboard_entry.cycleId
      const cycleUserIds = await prisma.leaderboardEntry.findMany({
        where: { cycleId },
        select: { userId: true },
      })
      assignedProblemWhere.userId = { in: cycleUserIds.map((e) => e.userId) }
    }

    // Fetch submissions with content and user info
    const submissions = await prisma.submission.findMany({
      where: {
        assignedProblem: assignedProblemWhere as any,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedProblem: {
          select: {
            id: true,
            problemTemplateId: true,
            template: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    })

    // Filter to only active submissions with text content
    const validSubmissions = submissions.filter(
      (s) =>
        s.architectureNotes ||
        s.aiUsageExplanation
    )

    // Map to input format for comparison engine
    const comparisonInputs = validSubmissions.map((s) => ({
      id: s.id,
      userId: s.user.id,
      userName: s.user.name,
      userEmail: s.user.email,
      architectureNotes: s.architectureNotes,
      aiUsageExplanation: s.aiUsageExplanation,
    }))

    // Run comparison
    const report = compareSubmissions(comparisonInputs)

    return NextResponse.json({
      ...report,
      filter: {
        cycleId: cycleId || null,
        problemId: problemId || null,
      },
      problemInfo:
        submissions.length > 0
          ? {
              problemTemplateId:
                submissions[0]!.assignedProblem.problemTemplateId,
              problemTitle:
                submissions[0]!.assignedProblem.template.title,
              problemSlug: submissions[0]!.assignedProblem.template.slug,
            }
          : null,
    })
  } catch (error) {
    console.error("Plagiarism detection error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
