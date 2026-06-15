import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit"
import { getPerformanceLabel } from "@/lib/evaluations/scoring"

export interface ThresholdResult {
  passed: boolean
  score: number
  threshold: number
  label: string // "Excellent" | "Good" | "Fair" | "Poor"
}

/**
 * Returns the active passing threshold from EvaluationConfig (name="default").
 * If no config exists, defaults to 60.0.
 */
export async function getPassingThreshold(): Promise<number> {
  const config = await prisma.evaluationConfig.findFirst({
    where: { name: "default", isActive: true },
  })
  return config?.passingScore ?? 60.0
}

/**
 * Evaluates whether a candidate's best completed evaluation score meets the threshold.
 * Returns ThresholdResult. Also updates user status:
 *   passed → status="SHORTLISTED"
 *   failed → status="REJECTED"
 * Writes an audit log entry: "threshold.gate.passed" or "threshold.gate.failed"
 */
export async function evaluateThreshold(userId: string): Promise<ThresholdResult> {
  const threshold = await getPassingThreshold()

  const evaluation = await prisma.evaluation.findFirst({
    where: {
      submission: { userId },
      status: "COMPLETED",
    },
    orderBy: { totalScore: "desc" },
  })

  if (!evaluation) {
    throw new Error("No completed evaluation found")
  }

  const score = evaluation.totalScore
  const passed = score >= threshold
  const label = getPerformanceLabel(score)

  await prisma.user.update({
    where: { id: userId },
    data: { status: passed ? "SHORTLISTED" : "REJECTED" },
  })

  await logAudit(
    passed ? "threshold.gate.passed" : "threshold.gate.failed",
    { score, threshold, label },
    userId
  )

  return { passed, score, threshold, label }
}
