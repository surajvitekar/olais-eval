// ─── AI Collaboration Transparency Report Generator ──────────────────────
//
// Generates a structured report for each evaluated candidate showing their
// AI collaboration journey. The report is designed to be encouraging and
// educational — reflecting the platform's philosophy: "This is not LeetCode."
//
// Sections:
//   1. AI Tools Used         — Tools, frequency, reasoning
//   2. Prompt Analysis       — Categories, quality, volume
//   3. Collaboration Timeline — Key milestones
//   4. Manual vs AI Work     — Work distribution
//   5. Score Breakdown       — AI Collaboration Score dimensions
//   6. Recommendations       — Growth guidance

import { getPerformanceLabel } from "../evaluations/scoring"

// ─── Input Data Types (matches Prisma query result shapes) ────────────────────

export interface AIReportInput {
  submission: {
    id: string
    aiUsageExplanation: string | null
    architectureNotes: string | null
    submittedAt: Date | string
    elapsedSeconds: number | null
  }
  user: {
    id: string
    name: string | null
    email: string
  }
  evaluation: {
    id: string
    aiUsageScore: number
    executionScore: number
    thoughtProcessScore: number
    architectureScore: number
    communicationScore: number
    totalScore: number
    notes: string | null
    createdAt: Date | string
  } | null
  template: {
    title: string
    slug: string
    category: string
    difficulty: number
  }
}

export interface ParsedAIUsage {
  tools: string[]
  helpDescription: string
  manualWork: string
  reasoning: string
  prompts: string
}

export interface AIReport {
  /** Unique report identifier (submission ID) */
  reportId: string
  /** Date the report was generated */
  generatedAt: string
  /** Candidate details */
  candidate: {
    name: string | null
    email: string
  }
  /** The problem / challenge */
  problem: {
    title: string
    slug: string
    category: string
    difficulty: number
  }

  // ─── Section 1: AI Tools Used ───────────────────────────────────────────────
  aiToolsUsed: {
    /** List of AI tools the candidate selected */
    tools: string[]
    /** Candidate's reasoning for choosing these tools */
    reasoning: string | null
    /** Count of distinct tools */
    toolCount: number
    /** Computed tool diversity: 0 = no tools, 1 = one tool, 2+ = multi-tool */
    toolDiversity: "none" | "single" | "multi"
  }

  // ─── Section 2: Prompt Analysis ─────────────────────────────────────────────
  promptAnalysis: {
    /** Raw prompt text the candidate provided */
    rawPrompts: string | null
    /** Estimated prompt categories detected */
    promptCategories: string[]
    /** Quality score estimated from the prompts description (1-10) */
    estimatedPromptQuality: number
    /** Whether candidate referenced a prompts/ directory (best practice) */
    hasPromptsDirectory: boolean
  }

  // ─── Section 3: Collaboration Timeline ──────────────────────────────────────
  collaborationTimeline: {
    /** When the submission was made */
    submittedAt: string
    /** How long the candidate spent (in seconds, if available) */
    elapsedSeconds: number | null
    /** Human-readable duration */
    durationLabel: string
    /** When the evaluation was completed (if available) */
    evaluatedAt: string | null
  }

  // ─── Section 4: Manual vs AI Work ──────────────────────────────────────────
  manualVsAI: {
    /** What AI helped with (from declaration) */
    aiHelpDescription: string | null
    /** What the candidate did manually */
    manualWork: string | null
    /** Architecture notes (manual decision-making) */
    architectureNotes: string | null
    /** Estimated AI contribution percentage (educated guess based on declaration) */
    aiContributionEstimate: number
    /** Estimated manual contribution percentage */
    manualContributionEstimate: number
  }

  // ─── Section 5: AI Collaboration Score Breakdown ────────────────────────────
  aiScoreBreakdown: {
    /** The overall AI Usage score (1-10) from the evaluation */
    aiUsageScore: number | null
    /** Overall composite score from the evaluation */
    totalScore: number | null
    /** Performance label based on totalScore */
    performanceLabel: string
    /** Related scores that provide context for AI collaboration ability */
    contextScores: Array<{
      label: string
      score: number | null
      relevance: string
    }>
    /** Score tier label */
    aiTier: "beginner" | "developing" | "proficient" | "advanced" | "expert"
  }

  // ─── Section 6: Recommendations ─────────────────────────────────────────────
  recommendations: {
    strengths: string[]
    growthAreas: string[]
    nextSteps: string[]
    resources: Array<{ title: string; description: string }>
  }
}

// ─── Prompt Category Detection ────────────────────────────────────────────────

const PROMPT_CATEGORY_SIGNALS: Array<{ category: string; keywords: string[] }> = [
  { category: "Architecture & Design", keywords: ["architect", "design", "structure", "component", "pattern", "schema", "database", "api design", "system design"] },
  { category: "Code Generation", keywords: ["write", "create", "implement", "generate", "build", "code", "function", "class", "component"] },
  { category: "Debugging", keywords: ["debug", "fix", "error", "bug", "issue", "broken", "not working", "doesn't work", "failing"] },
  { category: "Refactoring", keywords: ["refactor", "optimize", "improve", "clean", "better", "simplify", "extract", "restructure"] },
  { category: "Testing", keywords: ["test", "unit test", "integration test", "jest", "vitest", "cypress", "playwright", "coverage"] },
  { category: "Styling & UI", keywords: ["css", "style", "design", "ui", "layout", "responsive", "theme", "tailwind", "component"] },
  { category: "Documentation", keywords: ["document", "readme", "comment", "explain", "docstring", "docs"] },
  { category: "Deployment & DevOps", keywords: ["deploy", "ci/cd", "docker", "vercel", "netlify", "pipeline", "github actions", "devops"] },
  { category: "Research & Learning", keywords: ["how to", "what is", "explain", "difference between", "compare", "best practice", "tutorial"] },
  { category: "Planning & Strategy", keywords: ["plan", "strategy", "approach", "roadmap", "todo", "milestone", "step"] },
]

function detectPromptCategories(prompts: string): string[] {
  const lower = prompts.toLowerCase()
  const detected = new Set<string>()

  for (const signal of PROMPT_CATEGORY_SIGNALS) {
    for (const keyword of signal.keywords) {
      if (lower.includes(keyword)) {
        detected.add(signal.category)
        break
      }
    }
  }

  return detected.size > 0 ? Array.from(detected) : ["General Assistance"]
}

function estimatePromptQuality(prompts: string): number {
  if (!prompts || prompts.trim().length === 0) return 0

  let score = 5 // start at neutral

  // Longer, more detailed prompts indicate better quality
  const words = prompts.trim().split(/\s+/).length
  if (words > 100) score += 3
  else if (words > 50) score += 2
  else if (words > 20) score += 1
  else if (words < 5) score -= 2

  // Mentions of iteration or refinement
  if (/iterat|refin|revis|update|improve|better|change/i.test(prompts)) score += 1
  // Mentions of context
  if (/context|reason|because|goal|objective|require/i.test(prompts)) score += 1
  // Mentions of specific technologies
  if (/react|node|python|docker|next\.?js|tailwind|postgres|vercel|aws|api/i.test(prompts)) score += 1
  // Mentions of constraints
  if (/constraint|limit|edge case|boundar|condition|rule/i.test(prompts)) score += 1
  // Multiple prompt examples listed
  if (prompts.includes("\n-") || prompts.includes("\n*") || prompts.includes("\n1.")) score += 1

  return Math.max(1, Math.min(10, score))
}

// ─── Tool Diversity ───────────────────────────────────────────────────────────

function computeToolDiversity(tools: string[]): "none" | "single" | "multi" {
  if (!tools || tools.length === 0) return "none"
  if (tools.length === 1) return "single"
  return "multi"
}

// ─── Duration Formatting ──────────────────────────────────────────────────────

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "Not recorded"
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m`
  return `${seconds}s`
}

// ─── AI Contribution Estimation ───────────────────────────────────────────────

function estimateAIContribution(
  tools: string[],
  helpDescription: string | null,
  manualWork: string | null,
  aiUsageScore: number | null
): { ai: number; manual: number } {
  // Start with AI usage score if available (mapped to percentage)
  if (aiUsageScore !== null && aiUsageScore !== undefined) {
    // Map score 1-10 to contribution percentage 10-90
    // Low AI score means less effective AI use, not necessarily less AI usage
    const aiPct = Math.round((aiUsageScore / 10) * 80 + 10)
    return { ai: aiPct, manual: 100 - aiPct }
  }

  // Fallback heuristic based on declaration
  let aiSignals = 0
  let manualSignals = 0

  if (helpDescription) {
    const words = helpDescription.toLowerCase()
    if (/generated|wrote|created|built|implemented/.test(words)) aiSignals += 3
    if (/debugged|fixed|helped|assisted|suggested/.test(words)) aiSignals += 2
    if (/refactored|optimized|improved/.test(words)) aiSignals += 2
    if (/all|most|everything|entire/.test(words)) aiSignals += 3
    if (/some|part|portion|section/.test(words)) aiSignals += 1
    if (/little|minimal|few/.test(words)) aiSignals -= 1
  }

  if (manualWork) {
    const words = manualWork.toLowerCase()
    if (/architectur|designed|planned|decided/.test(words)) manualSignals += 3
    if (/wrote|implemented|built|coded/.test(words)) manualSignals += 2
    if (/debugged|fixed|tested|tuned/.test(words)) manualSignals += 1
    if (/all|most|everything|entire/.test(words)) manualSignals += 3
    if (/some|part|portion/.test(words)) manualSignals += 1
  }

  if (tools.length === 0) {
    manualSignals += 2
  } else if (tools.length >= 3) {
    aiSignals += 1
  }

  const total = aiSignals + manualSignals
  if (total === 0) return { ai: 50, manual: 50 }

  const aiPct = Math.round((aiSignals / total) * 100)
  return { ai: Math.max(10, Math.min(90, aiPct)), manual: Math.max(10, Math.min(90, 100 - aiPct)) }
}

// ─── AI Tier Classification ──────────────────────────────────────────────────

function classifyAITier(score: number | null): "beginner" | "developing" | "proficient" | "advanced" | "expert" {
  if (score === null || score === undefined) return "developing"
  if (score >= 9) return "expert"
  if (score >= 7) return "advanced"
  if (score >= 5) return "proficient"
  if (score >= 3) return "developing"
  return "beginner"
}

// ─── Recommendations Generator ────────────────────────────────────────────────

const TIER_RECOMMENDATIONS: Record<string, {
  strengths: string[]
  growthAreas: string[]
  nextSteps: string[]
  resources: Array<{ title: string; description: string }>
}> = {
  beginner: {
    strengths: [
      "You're starting your AI collaboration journey — every expert was once here!",
      "You took the important first step by trying AI tools in your workflow.",
    ],
    growthAreas: [
      "Experiment with writing more detailed prompts — context is everything when working with AI.",
      "Try using multiple AI tools for different tasks (e.g., one for code, one for architecture).",
      "Build a habit of iterating on AI outputs rather than accepting the first result.",
    ],
    nextSteps: [
      "Start a prompts/ folder in your repos to track what worked and what didn't.",
      "Try describing your architecture goals to AI before asking for code.",
      "Use AI for code reviews — ask it to find edge cases you might have missed.",
    ],
    resources: [
      { title: "Prompt Engineering Guide", description: "Learn how to write effective prompts that get better results from AI." },
      { title: "AI Collaboration Patterns", description: "Common patterns for pairing with AI effectively in software development." },
    ],
  },
  developing: {
    strengths: [
      "You're actively using AI tools and starting to develop your collaboration skills.",
      "You understand that AI is a partner, not just a code generator.",
    ],
    growthAreas: [
      "Focus on prompt specificity — include constraints, expected outputs, and context.",
      "Work on evaluating AI responses critically rather than accepting them blindly.",
      "Try structuring your prompts with a clear goal, approach, and expected format.",
    ],
    nextSteps: [
      "Document your AI workflow — what kinds of problems do you delegate vs. handle yourself?",
      "Practice iterative prompting: refine your prompts based on AI responses.",
      "Explore AI-assisted testing — let AI generate test cases for your code.",
    ],
    resources: [
      { title: "Iterative Prompting", description: "Techniques for refining prompts through multiple rounds to get optimal results." },
      { title: "AI-Assisted Testing", description: "How to leverage AI for test generation and edge case discovery." },
    ],
  },
  proficient: {
    strengths: [
      "You demonstrate solid AI collaboration — using prompts effectively and working iteratively.",
      "You balance AI assistance with your own judgment and expertise.",
    ],
    growthAreas: [
      "Explore multi-tool workflows — different AIs excel at different tasks.",
      "Work on providing even richer context in your prompts (architecture, constraints, tech stack).",
      "Consider how you can use AI for non-coding tasks like planning and documentation.",
    ],
    nextSteps: [
      "Try using AI for system design discussions before writing code.",
      "Build reusable prompt templates for common tasks in your workflow.",
      "Use AI to generate alternative approaches and evaluate trade-offs.",
    ],
    resources: [
      { title: "Multi-Tool AI Workflows", description: "Strategies for combining multiple AI tools to maximize productivity." },
      { title: "AI for Architecture", description: "Using AI as a thought partner for system design and architectural decisions." },
    ],
  },
  advanced: {
    strengths: [
      "You're an advanced AI collaborator — orchestrating AI tools with clear intent and critical evaluation.",
      "You understand AI's strengths and limitations and adjust your approach accordingly.",
    ],
    growthAreas: [
      "Focus on prompt efficiency — getting better results with fewer, more precise prompts.",
      "Share your AI collaboration patterns with others — teaching reinforces mastery.",
      "Explore AI safety and quality assurance — how do you verify AI-generated code?",
    ],
    nextSteps: [
      "Create a personal AI collaboration framework documenting your best practices.",
      "Experiment with AI-driven code review pipelines for your projects.",
      "Use AI for retrospective analysis — ask it to review your overall approach and suggest improvements.",
    ],
    resources: [
      { title: "AI Quality Assurance", description: "Techniques for validating and verifying AI-generated code and outputs." },
      { title: "AI Collaboration at Scale", description: "Patterns for integrating AI into team workflows and CI/CD pipelines." },
    ],
  },
  expert: {
    strengths: [
      "You demonstrate expert-level AI orchestration — treating AI as a true collaborative partner.",
      "You critically evaluate AI outputs and know exactly when to rely on AI vs. your own expertise.",
    ],
    growthAreas: [
      "Mentor others in AI collaboration — the best way to deepen mastery is to teach.",
      "Push the boundaries — explore cutting-edge AI capabilities and new tooling.",
      "Contribute to the AI engineering community with your patterns and insights.",
    ],
    nextSteps: [
      "Write about your AI collaboration journey and share lessons learned.",
      "Build tools or frameworks that help others collaborate better with AI.",
      "Explore multimodal AI capabilities (vision, audio) for richer collaboration.",
    ],
    resources: [
      { title: "AI Engineering Leadership", description: "How to lead AI adoption in engineering teams and organizations." },
      { title: "Future of AI Collaboration", description: "Emerging patterns and capabilities in human-AI collaborative development." },
    ],
  },
}

function generateRecommendations(
  aiUsageScore: number | null,
  tools: string[],
  helpDescription: string | null,
  prompts: string | null,
  contextScores: Array<{ label: string; score: number | null; relevance: string }>
): AIReport["recommendations"] {
  const tier = classifyAITier(aiUsageScore)
  const base = TIER_RECOMMENDATIONS[tier]

  // Customize based on actual data
  const strengths = [...base.strengths]
  const growthAreas = [...base.growthAreas]
  const nextSteps = [...base.nextSteps]
  const resources = [...base.resources]

  // Add tool-specific recommendations
  if (tools.length === 0) {
    growthAreas.unshift("Start by exploring one AI tool (like Claude or ChatGPT) to assist with your coding workflow.")
  } else if (tools.length === 1) {
    growthAreas.push(`You're using ${tools[0]} — consider trying another tool for different tasks (e.g., one for code generation, another for architecture discussion).`)
  }

  // Prompt-related recommendations
  if (prompts && !prompts.toLowerCase().includes("prompts/") && !prompts.toLowerCase().includes("prompts folder")) {
    nextSteps.push("Create a dedicated prompts/ folder in your git repo to track all your AI prompts — including the ones that didn't work.")
  }

  // Score-based customizations
  if (aiUsageScore !== null) {
    if (aiUsageScore >= 7) {
      strengths.push("Your AI Usage score reflects strong collaboration skills recognized by evaluators.")
    } else if (aiUsageScore <= 4) {
      growthAreas.push("Work on documenting your AI prompts more thoroughly — evaluators want to see your collaboration process.")
    }
  }

  // Check for related skill gaps
  const lowScores = contextScores.filter(s => s.score !== null && s.score < 5)
  for (const s of lowScores) {
    if (s.label === "Communication") {
      growthAreas.push("Your Communication score suggests room for better documentation — try using AI to help structure your explanations.")
    }
    if (s.label === "Thought Process") {
      growthAreas.push("Practice describing your problem-solving approach to AI before diving into code — this strengthens your planning skills.")
    }
  }

  return { strengths, growthAreas, nextSteps, resources }
}

// ─── Context Scores ───────────────────────────────────────────────────────────

function getContextScores(evaluation: AIReportInput["evaluation"]): AIReport["aiScoreBreakdown"]["contextScores"] {
  if (!evaluation) return []

  return [
    { label: "Execution", score: evaluation.executionScore, relevance: "AI-generated code quality" },
    { label: "Thought Process", score: evaluation.thoughtProcessScore, relevance: "Problem-solving with AI" },
    { label: "Architecture", score: evaluation.architectureScore, relevance: "AI-assisted design decisions" },
    { label: "Communication", score: evaluation.communicationScore, relevance: "Prompt clarity & documentation" },
  ]
}

// ─── Main Report Generator ────────────────────────────────────────────────────

export function generateAIReport(data: AIReportInput): AIReport {
  // Parse the AI usage explanation
  let parsedUsage: ParsedAIUsage = {
    tools: [],
    helpDescription: null as unknown as string,
    manualWork: null as unknown as string,
    reasoning: null as unknown as string,
    prompts: null as unknown as string,
  }

  if (data.submission.aiUsageExplanation) {
    try {
      const raw = typeof data.submission.aiUsageExplanation === "string"
        ? data.submission.aiUsageExplanation
        : JSON.stringify(data.submission.aiUsageExplanation)
      const parsed = JSON.parse(raw)
      parsedUsage = {
        tools: Array.isArray(parsed.tools) ? parsed.tools : [],
        helpDescription: parsed.helpDescription || null,
        manualWork: parsed.manualWork || null,
        reasoning: parsed.reasoning || null,
        prompts: parsed.prompts || null,
      }
    } catch {
      // If parsing fails, treat the raw string as a help description
      parsedUsage.helpDescription = String(data.submission.aiUsageExplanation)
    }
  }

  // Detect prompt categories
  const promptCategories = parsedUsage.prompts
    ? detectPromptCategories(parsedUsage.prompts)
    : []

  // Estimate prompt quality
  const estimatedPromptQuality = parsedUsage.prompts
    ? estimatePromptQuality(parsedUsage.prompts)
    : 0

  // Check for prompts directory reference
  const hasPromptsDirectory = parsedUsage.prompts
    ? /prompts\/|prompts folder|\.\/prompts/i.test(parsedUsage.prompts)
    : false

  // Tool diversity
  const toolDiversity = computeToolDiversity(parsedUsage.tools)

  // AI contribution estimate
  const contribution = estimateAIContribution(
    parsedUsage.tools,
    parsedUsage.helpDescription,
    parsedUsage.manualWork,
    data.evaluation?.aiUsageScore ?? null
  )

  // Normalize dates
  const normalizeDate = (d: Date | string): string =>
    typeof d === "string" ? d : d.toISOString()

  // Context scores
  const contextScores = getContextScores(data.evaluation)

  // AI tier
  const aiTier = classifyAITier(data.evaluation?.aiUsageScore ?? null)

  // Recommendations
  const recommendations = generateRecommendations(
    data.evaluation?.aiUsageScore ?? null,
    parsedUsage.tools,
    parsedUsage.helpDescription,
    parsedUsage.prompts,
    contextScores
  )

  // Performance label
  const performanceLabel = data.evaluation?.totalScore !== null && data.evaluation?.totalScore !== undefined
    ? getPerformanceLabel(data.evaluation.totalScore)
    : "Not evaluated"

  return {
    reportId: data.submission.id,
    generatedAt: new Date().toISOString(),
    candidate: {
      name: data.user.name,
      email: data.user.email,
    },
    problem: {
      title: data.template.title,
      slug: data.template.slug,
      category: data.template.category,
      difficulty: data.template.difficulty,
    },

    // Section 1
    aiToolsUsed: {
      tools: parsedUsage.tools,
      reasoning: parsedUsage.reasoning,
      toolCount: parsedUsage.tools.length,
      toolDiversity,
    },

    // Section 2
    promptAnalysis: {
      rawPrompts: parsedUsage.prompts,
      promptCategories,
      estimatedPromptQuality,
      hasPromptsDirectory,
    },

    // Section 3
    collaborationTimeline: {
      submittedAt: normalizeDate(data.submission.submittedAt),
      elapsedSeconds: data.submission.elapsedSeconds,
      durationLabel: formatDuration(data.submission.elapsedSeconds),
      evaluatedAt: data.evaluation?.createdAt ? normalizeDate(data.evaluation.createdAt) : null,
    },

    // Section 4
    manualVsAI: {
      aiHelpDescription: parsedUsage.helpDescription,
      manualWork: parsedUsage.manualWork,
      architectureNotes: data.submission.architectureNotes,
      aiContributionEstimate: contribution.ai,
      manualContributionEstimate: contribution.manual,
    },

    // Section 5
    aiScoreBreakdown: {
      aiUsageScore: data.evaluation?.aiUsageScore ?? null,
      totalScore: data.evaluation?.totalScore ?? null,
      performanceLabel,
      contextScores,
      aiTier,
    },

    // Section 6
    recommendations,
  }
}
