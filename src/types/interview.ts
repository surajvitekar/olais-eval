/**
 * ─── Interview Management Types ─────────────────────────────────────────────
 * Shared types for the Interview Management System
 */

export type InterviewEvaluatorRole = "EVALUATOR" | "LEAD" | "SHADOW"

export interface InterviewEvaluator {
  id: string
  interviewId: string
  userId: string
  role: InterviewEvaluatorRole
  user: {
    id: string
    name: string | null
    email: string
  }
}

export interface ScoringDimension {
  id: string
  cycleId: string | null
  name: string
  description: string | null
  minScore: number
  maxScore: number
  weight: number
  rubric: RubricLevel[] | null
  displayOrder: number
  isActive: boolean
  createdAt: string
}

export interface RubricLevel {
  level: number
  label: string
  description: string
}

export interface EvaluatorDashboardInterview {
  id: string
  candidateId: string
  candidateName: string | null
  candidateEmail: string
  scheduledAt: string
  duration: number
  timezone: string
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED"
  meetingLink: string | null
  notes: string | null
  candidateStatus: string
  candidateSkills?: {
    scores: Record<string, number>
    topSkills?: string[]
  }
  interviewEvaluators: InterviewEvaluator[]
}

export interface CreateInterviewInput {
  candidateId: string
  evaluatorId?: string
  scheduledAt: string
  duration?: number
  timezone?: string
  notes?: string
  meetingLink?: string
}

export interface UpdateInterviewInput {
  evaluatorId?: string
  scheduledAt?: string
  duration?: number
  timezone?: string
  notes?: string
  meetingLink?: string
  status?: "SCHEDULED" | "COMPLETED" | "CANCELLED"
}

export interface AddEvaluatorInput {
  userId: string
  role?: InterviewEvaluatorRole
}

export type EmailType = "schedule" | "reminder" | "score-published" | "reschedule" | "cancellation"
