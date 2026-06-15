import { prisma } from "@/lib/prisma"

export type RecommendationVerdict = "HIRE" | "REJECT" | "BORDERLINE"

export interface RecommendationResult {
  verdict: RecommendationVerdict
  combinedScore: number        // 0-100
  evaluationScore: number | null
  interviewScore: number | null
  confidence: "HIGH" | "MEDIUM" | "LOW"
  reasoning: string            // 1-2 sentences explaining the verdict
  breakdown: {
    evaluationWeight: number   // always 0.6
    interviewWeight: number    // always 0.4
    hasInterview: boolean
  }
}

// Scoring formula:
//   If both scores exist: combined = (eval * 0.6) + (interview * 0.4)
//   If only eval exists:  combined = eval * 1.0  (no interview penalty)
//   If only interview:    combined = interview * 1.0
//
// Verdict thresholds:
//   HIRE:       combined >= 70
//   BORDERLINE: combined >= 55 and < 70
//   REJECT:     combined < 55
//
// Confidence:
//   HIGH:   both scores available
//   MEDIUM: only one score available
//   LOW:    no scores available (returns REJECT with reasoning "Insufficient data")
export async function generateRecommendation(userId: string): Promise<RecommendationResult> {
  // Get best completed evaluation for this user (via submission.userId)
  const evaluation = await prisma.evaluation.findFirst({
    where: {
      submission: { userId },
      status: "COMPLETED",
    },
    orderBy: { totalScore: "desc" },
    select: { totalScore: true },
  })

  // Get best completed interview for this user
  const interview = await prisma.interview.findFirst({
    where: {
      candidateId: userId,
      status: "COMPLETED",
      overallScore: { not: null },
    },
    orderBy: { overallScore: "desc" },
    select: { overallScore: true },
  })

  const evaluationScore = evaluation?.totalScore ?? null
  const interviewScore = interview?.overallScore ?? null
  const hasInterview = interviewScore !== null

  // Calculate combined score and confidence
  let combinedScore: number
  let confidence: "HIGH" | "MEDIUM" | "LOW"

  if (evaluationScore !== null && interviewScore !== null) {
    combinedScore = evaluationScore * 0.6 + interviewScore * 0.4
    confidence = "HIGH"
  } else if (evaluationScore !== null) {
    combinedScore = evaluationScore
    confidence = "MEDIUM"
  } else if (interviewScore !== null) {
    combinedScore = interviewScore
    confidence = "MEDIUM"
  } else {
    combinedScore = 0
    confidence = "LOW"
  }

  // Round to 1 decimal place
  combinedScore = Math.round(combinedScore * 10) / 10

  // Determine verdict
  let verdict: RecommendationVerdict
  if (confidence === "LOW") {
    verdict = "REJECT"
  } else if (combinedScore >= 70) {
    verdict = "HIRE"
  } else if (combinedScore >= 55) {
    verdict = "BORDERLINE"
  } else {
    verdict = "REJECT"
  }

  // Build reasoning string
  let reasoning: string
  if (confidence === "LOW") {
    reasoning =
      "Insufficient data to make a recommendation. No evaluation or interview scores are available."
  } else if (evaluationScore !== null && interviewScore !== null) {
    const outcomePhrase =
      verdict === "HIRE"
        ? "This meets the hire threshold."
        : verdict === "BORDERLINE"
          ? "This falls in the borderline range and warrants further review."
          : "This falls below the minimum threshold for advancement."
    reasoning = `Candidate scored ${evaluationScore} on evaluation and ${interviewScore} on interview, yielding a combined score of ${combinedScore}. ${outcomePhrase}`
  } else if (evaluationScore !== null) {
    const outcomePhrase =
      verdict === "HIRE"
        ? "Score meets the hire threshold."
        : verdict === "BORDERLINE"
          ? "Score falls in the borderline range; an interview is recommended."
          : "Score falls below the minimum threshold."
    reasoning = `Candidate achieved an evaluation score of ${evaluationScore} with no interview data available. ${outcomePhrase}`
  } else {
    const outcomePhrase =
      verdict === "HIRE"
        ? "Score meets the hire threshold."
        : verdict === "BORDERLINE"
          ? "Score falls in the borderline range; an evaluation is recommended."
          : "Score falls below the minimum threshold."
    reasoning = `Candidate achieved an interview score of ${interviewScore} with no evaluation data available. ${outcomePhrase}`
  }

  return {
    verdict,
    combinedScore,
    evaluationScore,
    interviewScore,
    confidence,
    reasoning,
    breakdown: {
      evaluationWeight: 0.6,
      interviewWeight: 0.4,
      hasInterview,
    },
  }
}
