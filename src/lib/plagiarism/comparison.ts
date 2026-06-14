import stringSimilarity from "string-similarity"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlagiarismResult {
  pairId: string // `${subA.id}-${subB.id}`
  submissionA: {
    id: string
    userId: string
    userName: string | null
    userEmail: string
    content: string
  }
  submissionB: {
    id: string
    userId: string
    userName: string | null
    userEmail: string
    content: string
  }
  similarity: number // 0-1 scale
  flagged: boolean
}

export interface PlagiarismReport {
  totalSubmissions: number
  comparisonsRun: number
  flaggedPairs: PlagiarismResult[]
  matrix: SimilarityMatrixEntry[]
}

export interface SimilarityMatrixEntry {
  submissionId: string
  userName: string | null
  userEmail: string
  scores: Record<string, number> // target submissionId -> similarity score
}

// ─── Text Preparation ────────────────────────────────────────────────────────

interface SubmissionInput {
  id: string
  userId: string
  userName: string | null
  userEmail: string
  architectureNotes: string | null
  aiUsageExplanation: string | null
}

/**
 * Combine and normalize text from submission fields for comparison.
 * Strips extra whitespace, lowercases, and concatenates relevant text fields.
 */
function prepareText(sub: SubmissionInput): string {
  const parts: string[] = []
  if (sub.architectureNotes) parts.push(sub.architectureNotes)
  if (sub.aiUsageExplanation) parts.push(sub.aiUsageExplanation)
  return parts
    .join("\n")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

// ─── Comparison Engine ───────────────────────────────────────────────────────

const SIMILARITY_THRESHOLD = 0.7

/**
 * Run pairwise similarity comparison across all submissions.
 * Returns full report with matrix and flagged pairs.
 */
export function compareSubmissions(submissions: SubmissionInput[]): PlagiarismReport {
  const totalSubmissions = submissions.length
  const report: PlagiarismReport = {
    totalSubmissions,
    comparisonsRun: 0,
    flaggedPairs: [],
    matrix: [],
  }

  if (submissions.length < 2) return report

  // Build matrix entries for every submission
  const matrixMap = new Map<string, SimilarityMatrixEntry>()
  for (const sub of submissions) {
    matrixMap.set(sub.id, {
      submissionId: sub.id,
      userName: sub.userName,
      userEmail: sub.userEmail,
      scores: {},
    })
  }

  // Pre-prepare text content
  const texts = new Map<string, string>()
  for (const sub of submissions) {
    texts.set(sub.id, prepareText(sub))
  }

  // Compare all unique pairs
  for (let i = 0; i < submissions.length; i++) {
    for (let j = i + 1; j < submissions.length; j++) {
      const subA = submissions[i]!
      const subB = submissions[j]!
      const textA = texts.get(subA.id)!
      const textB = texts.get(subB.id)!

      // Skip if either has no content to compare
      if (!textA || !textB) continue

      const similarity = stringSimilarity.compareTwoStrings(textA, textB)
      const flagged = similarity >= SIMILARITY_THRESHOLD

      report.comparisonsRun++

      // Populate matrix (bidirectional)
      const entryA = matrixMap.get(subA.id)!
      const entryB = matrixMap.get(subB.id)!
      entryA.scores[subB.id] = similarity
      entryB.scores[subA.id] = similarity

      // Collect flagged pairs
      if (flagged) {
        report.flaggedPairs.push({
          pairId: `${subA.id}-${subB.id}`,
          submissionA: {
            id: subA.id,
            userId: subA.userId,
            userName: subA.userName,
            userEmail: subA.userEmail,
            content: textA,
          },
          submissionB: {
            id: subB.id,
            userId: subB.userId,
            userName: subB.userName,
            userEmail: subB.userEmail,
            content: textB,
          },
          similarity: Math.round(similarity * 1000) / 1000,
          flagged: true,
        })
      }
    }
  }

  report.matrix = Array.from(matrixMap.values())
  report.flaggedPairs.sort((a, b) => b.similarity - a.similarity)

  return report
}

/**
 * Compare a single pair of submission texts and return the similarity score (0-1).
 */
export function comparePair(
  textA: string,
  textB: string
): number {
  const cleanA = textA.replace(/\s+/g, " ").trim().toLowerCase()
  const cleanB = textB.replace(/\s+/g, " ").trim().toLowerCase()

  if (!cleanA || !cleanB) return 0

  return stringSimilarity.compareTwoStrings(cleanA, cleanB)
}

export { SIMILARITY_THRESHOLD }
