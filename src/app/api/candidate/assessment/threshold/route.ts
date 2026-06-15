import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { evaluateThreshold } from "@/lib/threshold-gate"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await evaluateThreshold(session.user.id)

    // Fetch the timestamp of the best completed evaluation for the response
    const evaluation = await prisma.evaluation.findFirst({
      where: {
        submission: { userId: session.user.id },
        status: "COMPLETED",
      },
      orderBy: { totalScore: "desc" },
      select: { updatedAt: true },
    })

    return Response.json({
      passed: result.passed,
      score: result.score,
      threshold: result.threshold,
      label: result.label,
      evaluatedAt: evaluation?.updatedAt ?? new Date(),
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "No completed evaluation found"
    ) {
      return Response.json(
        { error: "No completed evaluation found" },
        { status: 404 }
      )
    }
    console.error("Threshold gate error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
