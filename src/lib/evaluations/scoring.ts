// ─── 8-Dimension Evaluation Scoring Utilities ────────────────────────────────
//
// Default weight configuration for the 8 evaluation dimensions.
// Each weight is a decimal between 0.0 and 1.0, summing to 1.0.
// These map to the individual score fields on the Evaluation model.

export const EVALUATION_DIMENSIONS = [
  {
    key: "executionScore",
    label: "Execution",
    description: "Code runs, meets requirements, handles edge cases",
  },
  {
    key: "architectureScore",
    label: "Architecture",
    description: "Project structure, component design, data flow",
  },
  {
    key: "thoughtProcessScore",
    label: "Thought Process",
    description: "Problem-solving approach, planning, trade-offs",
  },
  {
    key: "aiUsageScore",
    label: "AI Usage",
    description: "Effective use of AI tools, prompt quality, iteration",
  },
  {
    key: "deploymentScore",
    label: "Deployment",
    description: "Live deployment, CI/CD, environment config",
  },
  {
    key: "codeOrganizationScore",
    label: "Code Org",
    description: "Clean code, naming, file organization, conventions",
  },
  {
    key: "uiUxScore",
    label: "UI/UX",
    description: "Interface quality, responsiveness, user experience",
  },
  {
    key: "communicationScore",
    label: "Communication",
    description: "Documentation, comments, clarity of explanation",
  },
] as const

export type DimensionKey = (typeof EVALUATION_DIMENSIONS)[number]["key"]

export type DimensionWeights = Record<DimensionKey, number>

/**
 * Get the default weight configuration for the 8 dimensions.
 * Weights sum to 1.0 (100%).
 */
export function getDefaultWeights(): DimensionWeights {
  return {
    executionScore: 0.25,
    architectureScore: 0.15,
    thoughtProcessScore: 0.15,
    aiUsageScore: 0.1,
    deploymentScore: 0.1,
    codeOrganizationScore: 0.1,
    uiUxScore: 0.08,
    communicationScore: 0.07,
  }
}

/**
 * Calculate the composite (weighted) score from individual dimension scores.
 *
 * Each dimension score is expected to be 1-10.
 * The composite is calculated as:
 *   sum( (dimensionScore / 10) * weight * 100 ) for each dimension
 *
 * Returns a number between 0 and 100, rounded to 1 decimal place.
 */
export function calculateCompositeScore(
  scores: Partial<Record<DimensionKey, number>>,
  weights?: DimensionWeights
): number {
  const w = weights ?? getDefaultWeights()
  let total = 0
  let weightSum = 0

  for (const dim of EVALUATION_DIMENSIONS) {
    const score = scores[dim.key]
    const weight = w[dim.key] ?? 0
    if (score !== undefined && score !== null) {
      total += (score / 10) * weight * 100
      weightSum += weight
    }
  }

  // If no weighted dimensions were found, return 0
  if (weightSum === 0) return 0

  // Normalize in case the total weight doesn't sum to 1.0
  return Math.round((total / weightSum) * 10) / 10
}

/**
 * Get a performance label based on the composite score.
 *
 *   Excellent: >= 85
 *   Good:      >= 70
 *   Fair:      >= 50
 *   Poor:      < 50
 */
export function getPerformanceLabel(score: number): string {
  if (score >= 85) return "Excellent"
  if (score >= 70) return "Good"
  if (score >= 50) return "Fair"
  return "Poor"
}

/**
 * Get a color class (Tailwind) for the performance label badge.
 */
export function getPerformanceColor(score: number): string {
  if (score >= 85) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
  if (score >= 70) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
  if (score >= 50) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
  return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
}

/**
 * Format a detailed score breakdown with weighted contributions.
 *
 * Returns an array of objects with:
 *   - key, label, description: the dimension metadata
 *   - score: the raw dimension score (1-10)
 *   - weight: the weight applied to this dimension
 *   - weightedContribution: (score / 10) * weight * 100 (the contribution to total)
 *   - maxContribution: weight * 100 (the maximum this dimension could contribute)
 */
export function formatScoreBreakdown(
  scores: Partial<Record<DimensionKey, number>>,
  weights?: DimensionWeights
): Array<{
  key: string
  label: string
  description: string
  score: number | null
  weight: number
  weightedContribution: number
  maxContribution: number
}> {
  const w = weights ?? getDefaultWeights()

  return EVALUATION_DIMENSIONS.map((dim) => {
    const score = scores[dim.key] ?? null
    const weight = w[dim.key] ?? 0
    const weightedContribution =
      score !== null ? Math.round(((score / 10) * weight * 100) * 10) / 10 : 0
    const maxContribution = Math.round(weight * 100 * 10) / 10

    return {
      key: dim.key,
      label: dim.label,
      description: dim.description,
      score,
      weight,
      weightedContribution,
      maxContribution,
    }
  })
}

/**
 * Evaluation rubric descriptions for each dimension and score level.
 * Used to display grading criteria to the reviewer.
 */
export interface RubricLevel {
  label: string
  range: [number, number] // inclusive score range
  criteria: string
}

export interface DimensionRubric {
  key: string
  label: string
  levels: RubricLevel[]
}

export const EVALUATION_RUBRIC: DimensionRubric[] = [
  {
    key: "executionScore",
    label: "Execution",
    levels: [
      { label: "Poor", range: [1, 3], criteria: "Code doesn't run or fails on basic inputs" },
      { label: "Fair", range: [4, 6], criteria: "Core features work, minor edge cases fail" },
      { label: "Good", range: [7, 8], criteria: "All features work, handles edge cases well" },
      { label: "Excellent", range: [9, 10], criteria: "Robust, performant, handles all edge cases gracefully" },
    ],
  },
  {
    key: "architectureScore",
    label: "Architecture",
    levels: [
      { label: "Poor", range: [1, 3], criteria: "No clear structure, monolithic, poor separation of concerns" },
      { label: "Fair", range: [4, 6], criteria: "Basic structure with some organization" },
      { label: "Good", range: [7, 8], criteria: "Well-structured with clear component separation and data flow" },
      { label: "Excellent", range: [9, 10], criteria: "Clean, modular architecture with excellent design patterns" },
    ],
  },
  {
    key: "thoughtProcessScore",
    label: "Thought Process",
    levels: [
      { label: "Poor", range: [1, 3], criteria: "No evidence of planning, random approach" },
      { label: "Fair", range: [4, 6], criteria: "Some planning evident but incomplete" },
      { label: "Good", range: [7, 8], criteria: "Clear problem-solving approach with reasoned trade-offs" },
      { label: "Excellent", range: [9, 10], criteria: "Exceptional planning with deep analysis of alternatives" },
    ],
  },
  {
    key: "aiUsageScore",
    label: "AI Usage",
    levels: [
      { label: "Poor", range: [1, 3], criteria: "No AI usage or completely AI-generated without understanding" },
      { label: "Fair", range: [4, 6], criteria: "Basic AI assistance with some iteration" },
      { label: "Good", range: [7, 8], criteria: "Effective AI collaboration with clear prompts and reasoning" },
      { label: "Excellent", range: [9, 10], criteria: "Expert-level AI orchestration with critical evaluation of outputs" },
    ],
  },
  {
    key: "deploymentScore",
    label: "Deployment",
    levels: [
      { label: "Poor", range: [1, 3], criteria: "No deployment attempted or broken" },
      { label: "Fair", range: [4, 6], criteria: "Deployed but with issues or missing configuration" },
      { label: "Good", range: [7, 8], criteria: "Properly deployed with CI/CD setup" },
      { label: "Excellent", range: [9, 10], criteria: "Production-ready deployment with monitoring and scaling considerations" },
    ],
  },
  {
    key: "codeOrganizationScore",
    label: "Code Org",
    levels: [
      { label: "Poor", range: [1, 3], criteria: "Messy code, inconsistent naming, no conventions" },
      { label: "Fair", range: [4, 6], criteria: "Readable code with some organization issues" },
      { label: "Good", range: [7, 8], criteria: "Clean, well-organized code following conventions" },
      { label: "Excellent", range: [9, 10], criteria: "Exceptional code quality with excellent patterns and documentation" },
    ],
  },
  {
    key: "uiUxScore",
    label: "UI/UX",
    levels: [
      { label: "Poor", range: [1, 3], criteria: "Broken UI, poor responsiveness, confusing layout" },
      { label: "Fair", range: [4, 6], criteria: "Functional UI but lacking polish" },
      { label: "Good", range: [7, 8], criteria: "Clean, responsive interface with good user experience" },
      { label: "Excellent", range: [9, 10], criteria: "Polished, accessible, delightful user experience" },
    ],
  },
  {
    key: "communicationScore",
    label: "Communication",
    levels: [
      { label: "Poor", range: [1, 3], criteria: "No documentation or unclear explanations" },
      { label: "Fair", range: [4, 6], criteria: "Basic documentation with some gaps" },
      { label: "Good", range: [7, 8], criteria: "Clear documentation and well-explained decisions" },
      { label: "Excellent", range: [9, 10], criteria: "Comprehensive documentation and exceptional clarity" },
    ],
  },
]

/**
 * Get the rubric level for a specific dimension and score.
 */
export function getRubricLevel(dimensionKey: string, score: number): RubricLevel | null {
  const rubric = EVALUATION_RUBRIC.find((r) => r.key === dimensionKey)
  if (!rubric) return null
  return rubric.levels.find((l) => score >= l.range[0] && score <= l.range[1]) ?? null
}
