interface AssessmentQuestion {
  id: string
  category: string
  questionType: string
  questionText: string
  options: Record<string, any>
  weight: number
}

interface AssessmentResponse {
  questionId: string
  responseValue: any
}

interface CategoryScores {
  [category: string]: number
}

/**
 * Weight multipliers per question type.
 */
const WEIGHT_MULTIPLIERS: Record<string, number> = {
  SELF_RATING: 1.0,
  MULTIPLE_CHOICE: 2.0,
  EXPERIENCE: 3.0,
  PROJECT_FAMILIARITY: 2.0,
  AI_USAGE: 1.5,
}

/**
 * Normalize a response value to a score between 0 and 10.
 */
function normalizeScore(
  question: AssessmentQuestion,
  responseValue: any
): number {
  if (responseValue === null || responseValue === undefined) return 0

  switch (question.questionType) {
    case "SELF_RATING": {
      // Already a numeric rating (1-10)
      const num = Number(responseValue)
      if (isNaN(num)) return 0
      return Math.max(0, Math.min(10, num))
    }

    case "MULTIPLE_CHOICE": {
      // Map choice index to score (0 = first = low expertise, last = high expertise)
      const choices = question.options?.choices ?? []
      if (!choices.length) return 0
      const index = choices.indexOf(responseValue)
      if (index === -1) return 5 // default midpoint
      return ((index + 1) / choices.length) * 10
    }

    case "EXPERIENCE": {
      // Map experience levels to scores
      const levels = question.options?.levels ?? question.options?.choices ?? []
      if (!levels.length) return 0
      const index = levels.indexOf(responseValue)
      if (index === -1) return 0
      return ((index + 1) / levels.length) * 10
    }

    case "PROJECT_FAMILIARITY": {
      // yes = 10, maybe = 5, no = 0
      const val = String(responseValue).toLowerCase()
      if (val === "yes") return 10
      if (val === "maybe") return 5
      return 0
    }

    case "AI_USAGE": {
      // Count selected tools, normalize to 10
      if (!Array.isArray(responseValue)) return 0
      const tools = question.options?.tools ?? []
      if (!tools.length) return 0
      const count = responseValue.filter((t: string) => tools.includes(t)).length
      return Math.min(10, (count / Math.max(tools.length, 1)) * 10)
    }

    default:
      return 5
  }
}

/**
 * Score assessment responses and compute category-level scores.
 */
export function scoreAssessment(
  questions: AssessmentQuestion[],
  responses: AssessmentResponse[]
): { scores: CategoryScores; topSkills: string[] } {
  // Group questions by category
  const categoryMap = new Map<string, AssessmentQuestion[]>()
  for (const q of questions) {
    const existing = categoryMap.get(q.category) ?? []
    existing.push(q)
    categoryMap.set(q.category, existing)
  }

  // Build response lookup
  const responseMap = new Map<string, any>()
  for (const r of responses) {
    responseMap.set(r.questionId, r.responseValue)
  }

  // Calculate weighted score per category
  const categoryScores: CategoryScores = {}

  categoryMap.forEach((categoryQuestions, category) => {
    let totalWeight = 0
    let weightedScore = 0

    for (const q of categoryQuestions) {
      const responseValue = responseMap.get(q.id)
      if (responseValue === undefined) continue

      const normalized = normalizeScore(q, responseValue)
      const multiplier = WEIGHT_MULTIPLIERS[q.questionType] ?? 1.0
      const questionWeight = q.weight * multiplier

      totalWeight += questionWeight
      weightedScore += normalized * questionWeight
    }

    categoryScores[category] =
      totalWeight > 0
        ? Math.round((weightedScore / totalWeight) * 10) / 10
        : 0
  })

  // Sort categories by score descending
  const topSkills = Object.entries(categoryScores)
    .sort(([, a], [, b]) => b - a)
    .filter(([, score]) => score > 0)
    .map(([category]) => category)

  return {
    scores: categoryScores,
    topSkills,
  }
}
