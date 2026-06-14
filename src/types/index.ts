// ─── Enums ───────────────────────────────────────────────────────────────────

export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  REVIEWER = "REVIEWER",
  HIRING_MANAGER = "HIRING_MANAGER",
  CANDIDATE = "CANDIDATE",
  READ_ONLY = "READ_ONLY",
}

export enum UserStatus {
  REGISTERED = "REGISTERED",
  ASSESSMENT_COMPLETED = "ASSESSMENT_COMPLETED",
  PROBLEM_ASSIGNED = "PROBLEM_ASSIGNED",
  IN_PROGRESS = "IN_PROGRESS",
  SUBMITTED = "SUBMITTED",
  UNDER_REVIEW = "UNDER_REVIEW",
  SHORTLISTED = "SHORTLISTED",
  REJECTED = "REJECTED",
  SELECTED = "SELECTED",
}

export enum AssessmentCategory {
  FRONTEND = "FRONTEND",
  BACKEND = "BACKEND",
  PYTHON = "PYTHON",
  AI_ML = "AI_ML",
  API = "API",
  DATABASE = "DATABASE",
  DEVOPS = "DEVOPS",
  UI_UX = "UI_UX",
  AUTOMATION = "AUTOMATION",
  SYSTEM_DESIGN = "SYSTEM_DESIGN",
}

export enum QuestionType {
  SELF_RATING = "SELF_RATING",
  MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
  EXPERIENCE = "EXPERIENCE",
  PROJECT_FAMILIARITY = "PROJECT_FAMILIARITY",
  AI_USAGE = "AI_USAGE",
}

export enum ProblemStatus {
  ASSIGNED = "ASSIGNED",
  IN_PROGRESS = "IN_PROGRESS",
  SUBMITTED = "SUBMITTED",
}

export enum EvaluationStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
}

// ─── Type Interfaces ─────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  email: string
  name: string | null
  role: UserRole
  status: UserStatus
  phone: string | null
  college: string | null
  resumeUrl: string | null
  githubUrl: string | null
  linkedinUrl: string | null
  avatarUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export interface InviteData {
  id: string
  code: string
  maxUses: number
  usedCount: number
  expiresAt: Date
  createdBy: string
  createdAt: Date
}

export interface AssessmentQuestionData {
  id: string
  category: AssessmentCategory
  questionType: QuestionType
  questionText: string
  options: Record<string, unknown>
  weight: number
  displayOrder: number
}

export interface SkillProfileData {
  id: string
  userId: string
  scores: Record<string, number>
  topSkills: string[]
  generatedAt: Date
}

export interface ProblemTemplateData {
  id: string
  title: string
  slug: string
  category: string
  difficulty: number
  overview: string
  requirements: string[]
  constraints: string[]
  bonusFeatures: string[]
  deliverables: string[]
  evaluationCriteria: string[]
  isActive: boolean
  variantGroup: string | null
  createdAt: Date
  updatedAt: Date
}

export interface AssignedProblemData {
  id: string
  userId: string
  problemTemplateId: string
  status: ProblemStatus
  variantConfig: Record<string, unknown>
  assignedAt: Date
  deadline: Date | null
}

export interface SubmissionData {
  id: string
  userId: string
  assignedProblemId: string
  gitUrl: string | null
  liveUrl: string | null
  architectureNotes: string | null
  aiUsageExplanation: string | null
  videoUrl: string | null
  screenshots: string[]
  submittedAt: Date
  elapsedSeconds: number | null
}

export interface EvaluationData {
  id: string
  submissionId: string
  evaluatorId: string
  executionScore: number
  thoughtProcessScore: number
  architectureScore: number
  uiUxScore: number
  aiUsageScore: number
  deploymentScore: number
  codeOrganizationScore: number
  communicationScore: number
  totalScore: number
  notes: string | null
  status: EvaluationStatus
  createdAt: Date
  updatedAt: Date
}

export interface LeaderboardEntryData {
  id: string
  userId: string
  cycleId: string
  submissionCount: number
  fastestTime: number | null
  status: string
  hidden: boolean
}

export interface AuditLogData {
  id: string
  userId: string | null
  action: string
  metadata: Record<string, unknown>
  ip: string | null
  createdAt: Date
}

export interface WebhookEndpointData {
  id: string
  name: string
  url: string
  secret: string
  events: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface WebhookEventData {
  id: string
  endpointId: string
  event: string
  payload: Record<string, unknown>
  status: string
  responseCode: number | null
  attempts: number
  nextRetryAt: Date | null
  deliveredAt: Date | null
  createdAt: Date
}

export const WEBHOOK_EVENTS = {
  CANDIDATE_REGISTERED: "candidate.registered",
  ASSESSMENT_COMPLETED: "assessment.completed",
  SUBMISSION_SUBMITTED: "submission.submitted",
  EVALUATION_COMPLETED: "evaluation.completed",
} as const

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS]

// ─── Interview Types (Time Zone & Calendar) ─────────────────────────────────

export enum InterviewStatus {
  SCHEDULED = "SCHEDULED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export interface InterviewData {
  id: string
  candidateId: string
  evaluatorId: string | null
  scheduledAt: Date
  duration: number
  timezone: string
  status: InterviewStatus
  notes: string | null
  meetingLink: string | null
  createdAt: Date
  updatedAt: Date
}
