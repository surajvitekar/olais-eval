// ─── AI Collaboration Analyzer ──────────────────────────────────────────────
//
// Analyzes HOW candidates used AI — not just whether they did.
// Evaluates prompt quality, categorizes prompts, generates collaboration
// insights, and produces an AI Collaboration Score (0–100) with breakdown.
//
// This is NOT a cheating detector. It's an AI partnership skill evaluator.

export interface AIDeclarationData {
  tools: string[]
  helpDescription: string
  manualWork: string
  reasoning: string
  prompts: string
}

export interface PromptAnalysis {
  /** Number of individual prompts parsed from the text */
  promptCount: number
  /** List of parsed prompt texts */
  prompts: string[]
  /** Specificity score 0–1 */
  specificity: number
  /** Context score 0–1 */
  context: number
  /** Intent clarity score 0–1 */
  intent: number
  /** Overall prompt quality score 0–1 */
  quality: number
  /** Why this quality rating was given */
  qualityRationale: string
}

export type PromptCategory =
  | "architecture"
  | "code"
  | "debugging"
  | "verification"
  | "other"

export interface CategorizedPrompt {
  text: string
  category: PromptCategory
  confidence: number
}

export interface ToolUsageInsight {
  tool: string
  category: string
  frequency: number
  notes: string
}

export interface CollaborationInsight {
  type: "strength" | "opportunity" | "observation"
  category: string
  message: string
  detail: string
}

export interface CollaborationScoreBreakdown {
  promptQuality: {
    score: number
    max: number
    specifics: string[]
  }
  toolUsage: {
    score: number
    max: number
    specifics: string[]
  }
  collaborationDepth: {
    score: number
    max: number
    specifics: string[]
  }
  selfAwareness: {
    score: number
    max: number
    specifics: string[]
  }
  reasoningQuality: {
    score: number
    max: number
    specifics: string[]
  }
}

export interface AICollaborationReport {
  /** Submission this report is for */
  submissionId: string
  /** Raw parsed AI declaration data */
  declaration: AIDeclarationData | null
  /** Analysis of the prompts used */
  promptAnalysis: PromptAnalysis
  /** Each prompt categorized */
  categorizedPrompts: CategorizedPrompt[]
  /** Tool usage timeline / breakdown */
  toolUsageInsights: ToolUsageInsight[]
  /** Generated collaboration insights */
  insights: CollaborationInsight[]
  /** The overall AI Collaboration Score 0–100 */
  overallScore: number
  /** Detailed breakdown of the score components */
  scoreBreakdown: CollaborationScoreBreakdown
  /** Performance label */
  label: string
  /** When the analysis was generated */
  analyzedAt: string
}

// ─── Keyword dictionaries ───────────────────────────────────────────────────

const SPECIFICITY_KEYWORDS: string[] = [
  // Technology names
  "react", "nextjs", "node", "express", "typescript", "javascript",
  "python", "postgres", "prisma", "docker", "graphql", "rest",
  "api", "database", "component", "hook", "middleware", "route",
  "schema", "model", "migration", "query", "mutation",
  "tailwind", "css", "html", "jsx", "tsx", "json",
  "function", "class", "interface", "type", "prop",
  "async", "await", "promise", "callback", "event",
  "state", "effect", "context", "reducer", "store",
  // Specific actions
  "implement", "create", "build", "write", "generate",
  "refactor", "optimize", "configure", "setup", "deploy",
  // Specific references
  "file", "folder", "directory", "function", "method",
  "endpoint", "table", "column", "row", "field",
]

const CONTEXT_KEYWORDS: string[] = [
  // Problem framing
  "project", "application", "system", "service", "platform",
  "requirement", "spec", "specification", "goal", "objective",
  "purpose", "need", "problem", "task", "feature",
  // Constraints & context
  "using", "with", "for", "because", "since", "whereas",
  "limit", "constraint", "must", "should", "need",
  "user", "client", "customer", "audience",
  // Tech stack mentions
  "stack", "framework", "library", "tool", "platform",
  "environment", "version", "config", "configuration",
  // Design context
  "design", "architecture", "pattern", "approach", "strategy",
  "tradeoff", "alternative", "compare", "versus",
]

const INTENT_KEYWORDS: string[] = [
  // Action intent
  "how", "what", "why", "where", "when", "which",
  "help", "can", "could", "would", "should",
  "need to", "want to", "trying to", "looking for",
  // Question intent
  "explain", "describe", "show", "demonstrate",
  "recommend", "suggest", "advise", "guide",
  "fix", "solve", "resolve", "debug", "improve",
  "optimize", "enhance", "upgrade", "migrate",
  // Decision intent
  "decide", "choose", "select", "pick", "determine",
  "evaluate", "assess", "review", "compare",
]

const ARCHITECTURE_KEYWORDS: string[] = [
  "architecture", "design", "structure", "component",
  "pattern", "layout", "flow", "diagram", "schema",
  "module", "organize", "organize", "folder", "directory",
  "decouple", "separation", "concern", "layer",
  "hierarchy", "tree", "compose", "composition",
  "state management", "data flow", "prop drilling",
  "dependency", "injection", "service", "provider",
  "route design", "api design", "endpoint structure",
]

const CODE_KEYWORDS: string[] = [
  "implement", "write", "code", "function", "method",
  "class", "component", "hook", "utility", "helper",
  "create", "generate", "build", "add", "make",
  "script", "snippet", "template", "boilerplate",
  "syntax", "logic", "algorithm", "routine",
  "generate", "produce", "scaffold", "setup",
]

const DEBUGGING_KEYWORDS: string[] = [
  "debug", "fix", "bug", "error", "issue", "problem",
  "broken", "not working", "fail", "failure", "crash",
  "exception", "throw", "catch", "trace", "stack trace",
  "log", "logging", "console", "inspect", "examine",
  "troubleshoot", "diagnose", "resolve", "patch",
  "unexpected", "wrong", "incorrect", "strange",
  "null", "undefined", "NaN", "type error", "syntax error",
]

const VERIFICATION_KEYWORDS: string[] = [
  "test", "verify", "validate", "check", "confirm",
  "review", "audit", "inspect", "examine",
  "unit test", "integration test", "e2e", "end to end",
  "assert", "expect", "should", "coverage",
  "lint", "type check", "compile", "build",
  "quality", "correctness", "accuracy", "reliability",
  "regression", "smoke test", "acceptance",
]

// ─── Helper functions ──────────────────────────────────────────────────────

function countKeywordMatches(text: string, keywords: string[]): number {
  const lower = text.toLowerCase()
  return keywords.filter((kw) => lower.includes(kw.toLowerCase())).length
}

function getKeywordDensity(text: string, keywords: string[]): number {
  if (!text.trim()) return 0
  const matches = countKeywordMatches(text, keywords)
  const words = text.split(/\s+/).length
  return Math.min(matches / Math.max(words, 1), 1)
}

function hasSentenceStructure(text: string): boolean {
  // Check for sentence-like patterns: capital letters, punctuation, verbs
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  if (sentences.length === 0) return false

  // At least some sentences should be more than 3 words
  const meaningful = sentences.filter((s) => s.split(/\s+/).length > 3)
  return meaningful.length > 0
}

function hasInstructionalStructure(text: string): boolean {
  const lines = text.split("\n").filter((l) => l.trim().length > 0)
  // Check for imperative sentences (starting with verbs)
  const actionStarts = lines.filter((l) =>
    /^(create|build|implement|write|add|make|fix|refactor|setup|configure|deploy|test|design|show|explain)/i.test(
      l.trim()
    )
  )
  return actionStarts.length >= Math.min(lines.length, 2)
}

// ─── Parsing ────────────────────────────────────────────────────────────────

/**
 * Parse the `aiUsageExplanation` JSON string from a Submission.
 * Returns null if the string is not valid JSON or doesn't contain expected keys.
 */
export function parseAIDeclaration(
  raw: string | null | undefined
): AIDeclarationData | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null

    return {
      tools: Array.isArray(parsed.tools) ? parsed.tools : [],
      helpDescription:
        typeof parsed.helpDescription === "string" ? parsed.helpDescription : "",
      manualWork:
        typeof parsed.manualWork === "string" ? parsed.manualWork : "",
      reasoning:
        typeof parsed.reasoning === "string" ? parsed.reasoning : "",
      prompts:
        typeof parsed.prompts === "string" ? parsed.prompts : "",
    }
  } catch {
    return null
  }
}

// ─── Prompt analysis ───────────────────────────────────────────────────────

/**
 * Split a prompts text block into individual prompts.
 * Prompts can be separated by double newlines, numbered items, or bullet points.
 */
export function splitPrompts(raw: string): string[] {
  if (!raw.trim()) return []

  // Try splitting by common delimiters
  const candidates: string[] = []

  // Try splitting by numbered lists (e.g., "1. ", "2. ")
  const numbered = raw.split(/\n\s*(?:\d+[\.\)])\s*/).filter(Boolean)
  if (numbered.length > 1) {
    return numbered.map((p) => p.trim()).filter((p) => p.length > 10)
  }

  // Try splitting by bullet points
  const bulleted = raw.split(/\n\s*[-*•]\s*/).filter(Boolean)
  if (bulleted.length > 1) {
    return bulleted.map((p) => p.trim()).filter((p) => p.length > 10)
  }

  // Try splitting by double newlines
  const paragraphs = raw.split(/\n\s*\n\s*/).filter(Boolean)
  if (paragraphs.length > 1) {
    return paragraphs.map((p) => p.trim()).filter((p) => p.length > 10)
  }

  // Fallback: treat the whole thing as one prompt
  const trimmed = raw.trim()
  return trimmed.length > 10 ? [trimmed] : []
}

/**
 * Analyze the quality of prompts.
 */
export function analyzePrompts(prompts: string[]): PromptAnalysis {
  if (prompts.length === 0) {
    return {
      promptCount: 0,
      prompts: [],
      specificity: 0,
      context: 0,
      intent: 0,
      quality: 0,
      qualityRationale: "No prompts provided.",
    }
  }

  const combined = prompts.join("\n")

  // Specificity: check for technology names, specific actions, file references
  const specificityScore = Math.min(
    hasInstructionalStructure(combined)
      ? getKeywordDensity(combined, SPECIFICITY_KEYWORDS) * 1.5
      : getKeywordDensity(combined, SPECIFICITY_KEYWORDS),
    1
  )

  // Context: check for problem framing, constraints, design context
  const contextScore = Math.min(
    getKeywordDensity(combined, CONTEXT_KEYWORDS) * 1.2,
    1
  )

  // Intent: check for clear action words and questions
  const intentScore = Math.min(
    hasSentenceStructure(combined)
      ? getKeywordDensity(combined, INTENT_KEYWORDS) * 1.3
      : getKeywordDensity(combined, INTENT_KEYWORDS),
    1
  )

  const quality = Math.round((specificityScore + contextScore + intentScore) / 3 * 100) / 100

  // Generate rationale
  const rationaleParts: string[] = []
  if (specificityScore > 0.7) {
    rationaleParts.push("Prompts are highly specific with technical details.")
  } else if (specificityScore > 0.4) {
    rationaleParts.push("Prompts have moderate specificity.")
  } else {
    rationaleParts.push("Prompts could benefit from more technical specificity.")
  }

  if (contextScore > 0.7) {
    rationaleParts.push("Good context and problem framing provided.")
  } else if (contextScore > 0.4) {
    rationaleParts.push("Some context provided but could be more detailed.")
  } else {
    rationaleParts.push("Limited context — prompts lack background information.")
  }

  if (intentScore > 0.7) {
    rationaleParts.push("Clear intent and actionable requests.")
  } else if (intentScore > 0.4) {
    rationaleParts.push("Intent is somewhat clear but could be more direct.")
  } else {
    rationaleParts.push("Unclear intent — prompts need more explicit direction.")
  }

  return {
    promptCount: prompts.length,
    prompts,
    specificity: Math.round(specificityScore * 100) / 100,
    context: Math.round(contextScore * 100) / 100,
    intent: Math.round(intentScore * 100) / 100,
    quality: Math.round(quality * 100) / 100,
    qualityRationale: rationaleParts.join(" "),
  }
}

// ─── Prompt categorization ─────────────────────────────────────────────────

/**
 * Categorize a single prompt text into one of the known categories.
 */
export function categorizePrompt(text: string): CategorizedPrompt {
  const lower = text.toLowerCase()
  const scores: Record<PromptCategory, number> = {
    architecture: 0,
    code: 0,
    debugging: 0,
    verification: 0,
    other: 0,
  }

  scores.architecture = countKeywordMatches(lower, ARCHITECTURE_KEYWORDS)
  scores.code = countKeywordMatches(lower, CODE_KEYWORDS)
  scores.debugging = countKeywordMatches(lower, DEBUGGING_KEYWORDS)
  scores.verification = countKeywordMatches(lower, VERIFICATION_KEYWORDS)

  // Bonus for specific patterns
  if (/\b(how (should|can|do|would|could))\b/i.test(lower)) {
    scores.architecture += 1
  }
  if (/^create|^implement|^add|^write\b/i.test(lower.trim())) {
    scores.code += 2
  }
  if (/not working|doesn't work|isn't working|error:|unexpected/i.test(lower)) {
    scores.debugging += 2
  }
  if (/\btest\b.*\b(should|expect|assert|verify)\b/i.test(lower)) {
    scores.verification += 2
  }

  // Find the category with the highest score
  let bestCategory: PromptCategory = "other"
  let bestScore = 0

  for (const [cat, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score
      bestCategory = cat as PromptCategory
    }
  }

  // Calculate confidence: if no keywords matched, it's a low confidence "other"
  const totalKeywords = Object.values(scores).reduce((a, b) => a + b, 0)
  const confidence = totalKeywords > 0
    ? Math.min(bestScore / Math.max(totalKeywords, 1), 1)
    : 0

  return {
    text: text.substring(0, 120) + (text.length > 120 ? "..." : ""),
    category: bestCategory,
    confidence: Math.round(confidence * 100) / 100,
  }
}

/**
 * Categorize all prompts from a declaration.
 */
export function categorizePrompts(prompts: string[]): CategorizedPrompt[] {
  return prompts.map((p) => categorizePrompt(p))
}

// ─── Tool usage analysis ───────────────────────────────────────────────────

const TOOL_CATEGORIES: Record<string, string> = {
  cursor: "AI IDE",
  copilot: "AI Autocomplete",
  claude: "Chat Assistant",
  chatgpt: "Chat Assistant",
  windsurf: "AI IDE",
  cline: "Autonomous Agent",
  other: "Other",
}

/**
 * Analyze which tools were used and generate insights.
 */
export function analyzeToolUsage(declaration: AIDeclarationData | null): ToolUsageInsight[] {
  if (!declaration || declaration.tools.length === 0) {
    return []
  }

  return declaration.tools.map((tool) => {
    const normalized = tool.toLowerCase()
    const category = TOOL_CATEGORIES[normalized] ?? "Other"

    let notes = ""
    if (category === "AI IDE") {
      notes = "AI-integrated development environment — indicates deep AI workflow integration."
    } else if (category === "Chat Assistant") {
      notes = "Conversational AI — good for reasoning, brainstorming, and code generation."
    } else if (category === "AI Autocomplete") {
      notes = "Inline AI suggestions — useful for boilerplate and rapid coding."
    } else if (category === "Autonomous Agent") {
      notes = "Task-automation agent — can independently plan and execute multi-step tasks."
    } else {
      notes = "General-purpose AI tool."
    }

    return {
      tool,
      category,
      frequency: 1,
      notes,
    }
  })
}

// ─── Insights generation ───────────────────────────────────────────────────

/**
 * Generate collaboration insights based on the analysis.
 */
export function generateInsights(
  declaration: AIDeclarationData | null,
  promptAnalysis: PromptAnalysis,
  categorized: CategorizedPrompt[],
  toolInsights: ToolUsageInsight[]
): CollaborationInsight[] {
  const insights: CollaborationInsight[] = []

  if (!declaration) {
    insights.push({
      type: "observation",
      category: "data",
      message: "No AI declaration data available.",
      detail: "The candidate did not provide AI usage information. This may indicate limited AI partnership awareness.",
    })
    return insights
  }

  // ── Prompt quality insights ──
  if (promptAnalysis.quality > 0.7) {
    insights.push({
      type: "strength",
      category: "prompting",
      message: "Strong prompting ability demonstrated.",
      detail: `Prompts show high quality (${Math.round(promptAnalysis.quality * 100)}%). They are specific, contextual, and intentional.`,
    })
  } else if (promptAnalysis.quality < 0.3) {
    insights.push({
      type: "opportunity",
      category: "prompting",
      message: "Prompt quality could be improved significantly.",
      detail: `Prompts scored ${Math.round(promptAnalysis.quality * 100)}% quality. Encourage providing more technical context and clearer intent.`,
    })
  } else {
    insights.push({
      type: "observation",
      category: "prompting",
      message: "Moderate prompting ability.",
      detail: `Prompt quality at ${Math.round(promptAnalysis.quality * 100)}%. Room to improve specificity and context.`,
    })
  }

  // Specific aspect insights
  if (promptAnalysis.specificity < 0.3) {
    insights.push({
      type: "opportunity",
      category: "specificity",
      message: "Prompts lack technical specificity.",
      detail: "Adding specific technology names, framework references, and concrete actions would help AI provide more relevant responses.",
    })
  } else if (promptAnalysis.specificity > 0.7) {
    insights.push({
      type: "strength",
      category: "specificity",
      message: "Excellent prompt specificity.",
      detail: "Prompts reference specific technologies, patterns, and actions — a hallmark of effective AI collaboration.",
    })
  }

  if (promptAnalysis.context < 0.3) {
    insights.push({
      type: "opportunity",
      category: "context",
      message: "Prompts lack sufficient context.",
      detail: "Providing background, constraints, and goals helps AI produce more targeted solutions.",
    })
  }

  if (promptAnalysis.intent < 0.3) {
    insights.push({
      type: "opportunity",
      category: "intent",
      message: "Prompt intent is unclear.",
      detail: "Clearly stating what you want AI to do (explain, implement, debug, review) leads to better outcomes.",
    })
  }

  // ── Tool usage insights ──
  if (toolInsights.length === 0) {
    insights.push({
      type: "observation",
      category: "tools",
      message: "No AI tools declared.",
      detail: "Candidate did not specify which AI tools were used.",
    })
  } else if (toolInsights.length === 1) {
    insights.push({
      type: "observation",
      category: "tools",
      message: "Single AI tool used.",
      detail: `Only ${toolInsights[0].tool} was used. Exploring multiple tools often improves collaboration effectiveness across different task types.`,
    })
  } else {
    insights.push({
      type: "strength",
      category: "tools",
      message: "Multi-tool strategy employed.",
      detail: `Used ${toolInsights.length} different AI tools (${toolInsights.map((t) => t.tool).join(", ")}), suggesting awareness of different AI strengths.`,
    })
  }

  // ── Category diversity insights ──
  const categories = new Set(categorized.map((c) => c.category))
  if (categories.size >= 3) {
    insights.push({
      type: "strength",
      category: "diversity",
      message: "Diverse AI interaction patterns.",
      detail: `Prompts span ${categories.size} categories (${Array.from(categories).join(", ")}), demonstrating versatile AI partnership across different development activities.`,
    })
  } else if (categories.size <= 1) {
    insights.push({
      type: "opportunity",
      category: "diversity",
      message: "Narrow AI interaction focus.",
      detail: "Prompts are concentrated in one area. Consider using AI for a wider range of development tasks.",
    })
  }

  // ── Self-awareness insights ──
  if (declaration.manualWork.trim().length > 100) {
    insights.push({
      type: "strength",
      category: "self-awareness",
      message: "Clear distinction between AI and human work.",
      detail: "The candidate thoughtfully differentiated what they did manually from what AI helped with — a sign of metacognitive awareness in AI collaboration.",
    })
  } else if (declaration.manualWork.trim().length < 20) {
    insights.push({
      type: "opportunity",
      category: "self-awareness",
      message: "Limited self-awareness of personal contribution.",
      detail: "Brief or absent description of manual work. Reflecting on one's own role is key to understanding the AI partnership dynamic.",
    })
  }

  // ── Reasoning insights ──
  if (declaration.reasoning.trim().length > 50) {
    insights.push({
      type: "strength",
      category: "reasoning",
      message: "Thoughtful tool selection rationale.",
      detail: "The candidate explained why they chose specific AI tools, demonstrating strategic thinking about AI partnerships.",
    })
  } else {
    insights.push({
      type: "observation",
      category: "reasoning",
      message: "Limited tool choice rationale.",
      detail: "No detailed explanation of why specific AI tools were chosen. Understanding tool strengths is part of effective AI collaboration.",
    })
  }

  // ── Iteration / refinement insight ──
  if (promptAnalysis.promptCount > 3) {
    insights.push({
      type: "strength",
      category: "iteration",
      message: "Iterative refinement of prompts.",
      detail: `With ${promptAnalysis.promptCount} prompts provided, there is evidence of iterative refinement — a critical AI collaboration skill.`,
    })
  } else if (promptAnalysis.promptCount <= 1 && declaration.prompts.trim().length > 20) {
    insights.push({
      type: "observation",
      category: "iteration",
      message: "Single prompt pattern.",
      detail: "Only one prompt was provided. Iterating on prompts based on AI responses often leads to better outcomes.",
    })
  }

  // ── Help description insight ──
  if (declaration.helpDescription.trim().length > 100) {
    insights.push({
      type: "observation",
      category: "collaboration",
      message: "Detailed description of AI assistance.",
      detail: "The candidate provided a thorough account of how AI contributed, suggesting thoughtful engagement with AI tools.",
    })
  }

  return insights
}

// ── Score calculation ──────────────────────────────────────────────────────

/**
 * Calculate the AI Collaboration Score (0–100) with breakdown.
 */
export function calculateCollaborationScore(
  declaration: AIDeclarationData | null,
  promptAnalysis: PromptAnalysis,
  categorized: CategorizedPrompt[],
  toolInsights: ToolUsageInsight[]
): {
  overallScore: number
  breakdown: CollaborationScoreBreakdown
} {
  // Default breakdown
  const breakdown: CollaborationScoreBreakdown = {
    promptQuality: { score: 0, max: 30, specifics: [] },
    toolUsage: { score: 0, max: 20, specifics: [] },
    collaborationDepth: { score: 0, max: 25, specifics: [] },
    selfAwareness: { score: 0, max: 15, specifics: [] },
    reasoningQuality: { score: 0, max: 10, specifics: [] },
  }

  if (!declaration) {
    return { overallScore: 0, breakdown }
  }

  // ── 1. Prompt Quality (max 30) ──
  const pqRaw = promptAnalysis.quality * 30
  breakdown.promptQuality.score = Math.round(pqRaw * 10) / 10
  if (promptAnalysis.specificity > 0.5) {
    breakdown.promptQuality.specifics.push("Prompts reference specific technologies and actions.")
  } else {
    breakdown.promptQuality.specifics.push("Prompts could use more technical specificity.")
  }
  if (promptAnalysis.context > 0.5) {
    breakdown.promptQuality.specifics.push("Adequate problem context provided.")
  } else {
    breakdown.promptQuality.specifics.push("Prompts lack background context.")
  }
  if (promptAnalysis.intent > 0.5) {
    breakdown.promptQuality.specifics.push("Clear intent behind prompts.")
  } else {
    breakdown.promptQuality.specifics.push("Intent of prompts is unclear.")
  }

  // ── 2. Tool Usage (max 20) ──
  let toolScore = 0
  if (toolInsights.length === 0) {
    toolScore = 0
    breakdown.toolUsage.specifics.push("No AI tools declared.")
  } else if (toolInsights.length === 1) {
    toolScore = 8
    breakdown.toolUsage.specifics.push("Single tool used — consider diversifying.")
  } else if (toolInsights.length === 2) {
    toolScore = 14
    breakdown.toolUsage.specifics.push("Two tools used — reasonable diversity.")
  } else {
    toolScore = 18
    breakdown.toolUsage.specifics.push("Multiple tools used — good tool awareness.")
  }

  // Bonus for tool categories diversity
  const toolCategories = new Set(toolInsights.map((t) => t.category))
  if (toolCategories.size >= 2) {
    toolScore = Math.min(toolScore + 2, 20)
    breakdown.toolUsage.specifics.push("Tools span different categories (IDE, chat, etc.).")
  }

  breakdown.toolUsage.score = toolScore

  // ── 3. Collaboration Depth (max 25) ──
  let depthScore = 0

  // Prompt count contributes
  const promptCountFactor = Math.min(promptAnalysis.promptCount / 5, 1)
  depthScore += promptCountFactor * 8

  // Category diversity contributes
  const categories = new Set(categorized.map((c) => c.category))
  const catFactor = Math.min(categories.size / 4, 1)
  depthScore += catFactor * 7

  // Help description length contributes
  if (declaration.helpDescription.trim().length > 150) {
    depthScore += 5
    breakdown.collaborationDepth.specifics.push("Detailed description of AI assistance.")
  } else if (declaration.helpDescription.trim().length > 50) {
    depthScore += 3
    breakdown.collaborationDepth.specifics.push("Moderate description of AI assistance.")
  }

  // Has reasoning
  if (declaration.reasoning.trim().length > 20) {
    depthScore += 5
    breakdown.collaborationDepth.specifics.push("Tool reasoning provided.")
  }

  breakdown.collaborationDepth.score = Math.min(Math.round(depthScore * 10) / 10, 25)
  if (breakdown.collaborationDepth.score >= 15) {
    breakdown.collaborationDepth.specifics.push("Evidence of iterative collaboration.")
  }

  // ── 4. Self-Awareness (max 15) ──
  let saScore = 0

  // Manual work description
  const manualWords = declaration.manualWork.trim().split(/\s+/).length
  if (manualWords > 50) {
    saScore += 7
    breakdown.selfAwareness.specifics.push("Detailed reflection on personal contribution.")
  } else if (manualWords > 15) {
    saScore += 4
    breakdown.selfAwareness.specifics.push("Some reflection on personal contribution.")
  } else {
    saScore += 1
    breakdown.selfAwareness.specifics.push("Limited reflection on personal contribution.")
  }

  // Contrast between AI help and manual work
  const helpWords = declaration.helpDescription.trim().split(/\s+/).length
  if (helpWords > 30 && manualWords > 30) {
    saScore += 5
    breakdown.selfAwareness.specifics.push("Balanced view of AI vs. human contribution.")
  }

  // Awareness of limitations (checking for words like "tried", "attempt", "struggled")
  const allText = [
    declaration.manualWork,
    declaration.helpDescription,
    declaration.reasoning,
  ].join(" ").toLowerCase()
  if (
    /\b(tried?|attempt|struggled|challeng|limit|weakness|improve|couldn't|could not|wasn't working)\b/i.test(
      allText
    )
  ) {
    saScore += 3
    breakdown.selfAwareness.specifics.push("Acknowledges limitations or challenges with AI.")
  }

  breakdown.selfAwareness.score = Math.min(Math.round(saScore * 10) / 10, 15)

  // ── 5. Reasoning Quality (max 10) ──
  let rsScore = 0
  const reasoningWords = declaration.reasoning.trim().split(/\s+/).length
  if (reasoningWords > 30) {
    rsScore = 8
    breakdown.reasoningQuality.specifics.push("Detailed reasoning about tool choices.")
  } else if (reasoningWords > 10) {
    rsScore = 5
    breakdown.reasoningQuality.specifics.push("Basic reasoning about tool choices.")
  } else {
    rsScore = 2
    breakdown.reasoningQuality.specifics.push("No detailed reasoning provided.")
  }

  // Bonus for comparing tools
  if (
    /\b(compared|instead of|rather than|versus|vs|better (at|for)|good (at|for)|suitable)\b/i.test(
      declaration.reasoning
    )
  ) {
    rsScore += 2
    breakdown.reasoningQuality.specifics.push("Shows awareness of tool strengths/weaknesses.")
  }

  breakdown.reasoningQuality.score = Math.min(Math.round(rsScore * 10) / 10, 10)

  // ── Calculate overall score ──
  const overall =
    breakdown.promptQuality.score +
    breakdown.toolUsage.score +
    breakdown.collaborationDepth.score +
    breakdown.selfAwareness.score +
    breakdown.reasoningQuality.score

  return {
    overallScore: Math.round(overall * 10) / 10,
    breakdown,
  }
}

// ── Performance label ──────────────────────────────────────────────────────

export function getCollaborationLabel(score: number): string {
  if (score >= 85) return "Expert AI Collaborator"
  if (score >= 70) return "Proficient AI Partner"
  if (score >= 50) return "Developing AI User"
  if (score >= 30) return "Novice AI Adopter"
  return "Minimal AI Engagement"
}

// ── Main analysis function ─────────────────────────────────────────────────

/**
 * Perform a complete AI collaboration analysis for a submission.
 * This is the main entry point.
 */
export function analyzeAICollaboration(
  submissionId: string,
  aiUsageExplanationRaw: string | null | undefined
): AICollaborationReport {
  const declaration = parseAIDeclaration(aiUsageExplanationRaw)
  const prompts = declaration ? splitPrompts(declaration.prompts) : []
  const promptAnalysis = analyzePrompts(prompts)
  const categorized = categorizePrompts(prompts)
  const toolInsights = analyzeToolUsage(declaration)
  const insights = generateInsights(declaration, promptAnalysis, categorized, toolInsights)
  const { overallScore, breakdown } = calculateCollaborationScore(
    declaration,
    promptAnalysis,
    categorized,
    toolInsights
  )

  return {
    submissionId,
    declaration,
    promptAnalysis,
    categorizedPrompts: categorized,
    toolUsageInsights: toolInsights,
    insights,
    overallScore,
    scoreBreakdown: breakdown,
    label: getCollaborationLabel(overallScore),
    analyzedAt: new Date().toISOString(),
  }
}
