import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { assignProblems } from "@/lib/problem-assigner"
import { logAudit } from "@/lib/audit"

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "CANDIDATE") {
      return NextResponse.json({ error: "Only candidates can be assigned problems" }, { status: 403 })
    }

    // Check if the user already has active assigned problems
    const existingAssignments = await prisma.assignedProblem.findMany({
      where: {
        userId: session.user.id,
        status: { in: ["ASSIGNED", "IN_PROGRESS"] },
      },
    })

    if (existingAssignments.length >= 2) {
      return NextResponse.json(
        { error: "You already have assigned problems. Complete or submit them first." },
        { status: 400 }
      )
    }

    if (existingAssignments.length === 1) {
      // Need one more
      const second = await assignProblems(session.user.id)
      const needed = second.slice(0, 1)
      if (needed.length === 0) {
        return NextResponse.json(
          { error: "No problems available for assignment." },
          { status: 400 }
        )
      }

      const assignment = await prisma.assignedProblem.create({
        data: {
          userId: session.user.id,
          problemTemplateId: needed[0].id as string,
          status: "ASSIGNED",
          variantConfig: {},
        },
      })

      await prisma.user.update({
        where: { id: session.user.id },
        data: { status: "PROBLEM_ASSIGNED" },
      })

      // Audit: problem assigned
      await logAudit("problem.assign", {
        assignmentId: assignment.id,
        problemTemplateId: needed[0].id,
      }, session.user.id)

      return NextResponse.json({
        message: "Problem assigned",
        assignments: [assignment],
      })
    }

    // Fresh assignment - pick 2 problems
    const picks = await assignProblems(session.user.id)
    if (picks.length === 0) {
      return NextResponse.json(
        { error: "No problems available for assignment." },
        { status: 400 }
      )
    }

    const assignments = await prisma.$transaction(async (tx) => {
      const created = []
      for (const pick of picks.slice(0, 2)) {
        const ap = await tx.assignedProblem.create({
          data: {
            userId: session.user.id,
            problemTemplateId: pick.id as string,
            status: "ASSIGNED",
            variantConfig: {},
          },
        })
        created.push(ap)
      }
      return created
    })

    // Update user status
    await prisma.user.update({
      where: { id: session.user.id },
      data: { status: "PROBLEM_ASSIGNED" },
    })

    // Audit: problems assigned (batch)
    await logAudit("problem.assign", {
      assignments: assignments.map(a => ({
        id: a.id,
        problemTemplateId: a.problemTemplateId,
      })),
      count: assignments.length,
    }, session.user.id)

    return NextResponse.json({
      message: `Assigned ${assignments.length} problem(s)`,
      assignments,
    }, { status: 201 })
  } catch (error) {
    console.error("Assign problems error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
