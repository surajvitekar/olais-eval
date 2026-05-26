import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Total candidates
    const totalCandidates = await prisma.user.count({
      where: { role: "CANDIDATE" },
    })

    // Candidates by status
    const statusCounts = await prisma.user.groupBy({
      by: ["status"],
      where: { role: "CANDIDATE" },
      _count: true,
    })

    const byStatus: Record<string, number> = {}
    statusCounts.forEach((s) => {
      byStatus[s.status] = s._count
    })

    // Total submissions
    const totalSubmissions = await prisma.submission.count()

    // Total evaluations
    const totalEvaluations = await prisma.evaluation.count()
    const pendingEvaluations = await prisma.evaluation.count({
      where: { status: "PENDING" },
    })
    const completedEvaluations = await prisma.evaluation.count({
      where: { status: "COMPLETED" },
    })

    // Selection rate (SELECTED / total candidates)
    const selectedCount = byStatus["SELECTED"] || 0
    const selectionRate = totalCandidates > 0
      ? Math.round((selectedCount / totalCandidates) * 100)
      : 0

    // Assigned problems count
    const totalAssigned = await prisma.assignedProblem.count()

    // Recent activity - last 20 audit log entries
    const recentActivity = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    // Recent submissions
    const recentSubmissions = await prisma.submission.findMany({
      orderBy: { submittedAt: "desc" },
      take: 10,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        assignedProblem: {
          include: {
            template: {
              select: { title: true, slug: true },
            },
          },
        },
      },
    })

    const stats = {
      totals: {
        totalCandidates,
        totalSubmissions,
        totalEvaluations,
        pendingEvaluations,
        completedEvaluations,
        totalAssigned,
        selectedCount,
        selectionRate,
      },
      byStatus,
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        action: a.action,
        user: a.user ? { id: a.user.id, name: a.user.name, email: a.user.email } : null,
        metadata: a.metadata,
        createdAt: a.createdAt.toISOString(),
      })),
      recentSubmissions: recentSubmissions.map((s) => ({
        id: s.id,
        userName: s.user.name || s.user.email,
        userId: s.user.id,
        problemTitle: s.assignedProblem.template.title,
        problemSlug: s.assignedProblem.template.slug,
        submittedAt: s.submittedAt.toISOString(),
        hasEvaluation: false, // Will be populated below
      })),
    }

    // Mark submissions that have evaluations
    const subIds = recentSubmissions.map((s) => s.id)
    const evaluatedSubs = await prisma.evaluation.findMany({
      where: { submissionId: { in: subIds } },
      select: { submissionId: true },
      distinct: ["submissionId"],
    })
    const evaluatedSet = new Set(evaluatedSubs.map((e) => e.submissionId))
    stats.recentSubmissions = stats.recentSubmissions.map((s) => ({
      ...s,
      hasEvaluation: evaluatedSet.has(s.id),
    }))

    return NextResponse.json({ stats })
  } catch (error) {
    console.error("Stats error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
