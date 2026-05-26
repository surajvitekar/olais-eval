import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "CANDIDATE") {
      return NextResponse.json({ error: "Only candidates can view assigned problems" }, { status: 403 })
    }

    const assignedProblems = await prisma.assignedProblem.findMany({
      where: { userId: session.user.id },
      include: {
        template: true,
      },
      orderBy: { assignedAt: "desc" },
    })

    return NextResponse.json({ problems: assignedProblems })
  } catch (error) {
    console.error("Get candidate problems error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
