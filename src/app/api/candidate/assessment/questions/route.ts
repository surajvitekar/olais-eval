import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request?.url ?? "http://localhost")
    const countParam = url.searchParams.get("count")
    const take = countParam ? Math.max(1, parseInt(countParam, 10)) : undefined

    const questions = await prisma.assessmentQuestion.findMany({
      orderBy: { displayOrder: "asc" },
      ...(take ? { take } : {}),
      select: {
        id: true,
        category: true,
        questionType: true,
        questionText: true,
        options: true,
        weight: true,
        displayOrder: true,
      },
    })

    return NextResponse.json({ questions })
  } catch (error) {
    console.error("Fetch questions error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
