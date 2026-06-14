import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { status } = await request.json()
    if (!status || typeof status !== "string") {
      return NextResponse.json({ error: "Status is required" }, { status: 400 })
    }

    // Verify the assigned problem belongs to this user
    const assigned = await prisma.assignedProblem.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    })

    if (!assigned) {
      return NextResponse.json(
        { error: "Assigned problem not found" },
        { status: 404 }
      )
    }

    // Only allow valid transitions
    const validTransitions: Record<string, string[]> = {
      ASSIGNED: ["IN_PROGRESS"],
      IN_PROGRESS: ["SUBMITTED"],
    }

    const allowed = validTransitions[assigned.status]
    if (!allowed || !allowed.includes(status)) {
      return NextResponse.json(
        {
          error: `Cannot transition from ${assigned.status} to ${status}`,
        },
        { status: 400 }
      )
    }

    await prisma.assignedProblem.update({
      where: { id: id },
      data: { status: status as any },
    })

    return NextResponse.json({
      message: `Status updated to ${status}`,
    })
  } catch (error) {
    console.error("Update status error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
