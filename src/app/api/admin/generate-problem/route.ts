import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { logAudit } from "@/lib/audit"

// ─── Validation Schema ──────────────────────────────────────────────────────

const generateSchema = z.object({
  prompt: z.string().min(10, "Prompt must be at least 10 characters"),
  category: z.string().optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 200)
}

interface ProblemTemplateData {
  title: string
  category: string
  difficulty: number
  overview: string
  requirements: string[]
  constraints: string[]
  bonusFeatures: string[]
  deliverables: string[]
  evaluationCriteria: string[]
}

// ─── AI Generation (OpenAI) ─────────────────────────────────────────────────

async function generateWithAI(
  prompt: string,
  category?: string,
  difficulty?: number,
): Promise<ProblemTemplateData | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const systemPrompt = `You are an expert technical problem designer for engineering candidate assessments.
Generate a detailed coding/problem-solving challenge as JSON. The JSON must follow this exact structure:
{
  "title": "Short, descriptive problem title",
  "category": "${category || "one of: FRONTEND, BACKEND, PYTHON, AI_ML, API, DATABASE, DEVOPS, UI_UX, AUTOMATION, SYSTEM_DESIGN"}",
  "difficulty": ${difficulty ?? "integer 1-5"},
  "overview": "A comprehensive 2-3 paragraph description of the problem. Include context, business need, and what the candidate needs to build.",
  "requirements": ["Array of 5-8 specific, testable requirements. Each must be concrete and measurable."],
  "constraints": ["Array of 3-5 technical constraints. Tech stack limitations, performance requirements, etc."],
  "bonusFeatures": ["Array of 2-4 stretch goals or bonus features for extra credit."],
  "deliverables": ["Array of 2-4 specific deliverables the candidate must submit."],
  "evaluationCriteria": ["Array of 5-8 criteria used to evaluate the submission. Each should be a clear, dimension-based metric."]
}

Ensure:
- The problem is realistic and could be solved in 2-4 hours by a skilled engineer.
- Requirements are unambiguous and testable.
- Category matches the problem domain.
- Difficulty reflects complexity: 1-2 (beginner), 3 (intermediate), 4-5 (advanced).
- All arrays contain meaningful, non-generic items specific to the problem context.`

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Generate a technical assessment problem based on this description:\n\n${prompt}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2500,
        response_format: { type: "json_object" },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("OpenAI API error:", response.status, errorText)
      return null
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      console.error("OpenAI returned empty response")
      return null
    }

    const parsed = JSON.parse(content) as ProblemTemplateData

    // Validate required fields
    if (
      !parsed.title ||
      !parsed.overview ||
      !Array.isArray(parsed.requirements) ||
      !Array.isArray(parsed.constraints) ||
      !Array.isArray(parsed.deliverables) ||
      !Array.isArray(parsed.evaluationCriteria)
    ) {
      console.error("AI response missing required fields:", parsed)
      return null
    }

    return {
      title: parsed.title,
      category: category || parsed.category || "FRONTEND",
      difficulty: difficulty ?? parsed.difficulty ?? 3,
      overview: parsed.overview,
      requirements: parsed.requirements,
      constraints: parsed.constraints,
      bonusFeatures: parsed.bonusFeatures ?? [],
      deliverables: parsed.deliverables,
      evaluationCriteria: parsed.evaluationCriteria,
    }
  } catch (error) {
    console.error("AI generation error:", error)
    return null
  }
}

// ─── Template-Based Fallback ─────────────────────────────────────────────────

function generateWithTemplate(
  prompt: string,
  category?: string,
  difficulty?: number,
): ProblemTemplateData {
  const cat = category || "FRONTEND"
  const diff = difficulty ?? 3

  // Normalise category for template selection
  const normalisedCategory = cat.toUpperCase().replace(/[\s-]/g, "_")

  const templates: Record<string, (p: string) => ProblemTemplateData> = {
    FRONTEND: (p) => ({
      title: p.length > 80 ? p.substring(0, 77) + "..." : p,
      category: "FRONTEND",
      difficulty: diff,
      overview: `Build a responsive, interactive frontend application based on the following: ${p}\n\nThe candidate should demonstrate strong understanding of modern frontend development practices, component-based architecture, state management, and user experience design. The solution should be production-ready with attention to edge cases, loading states, and error handling.`,
      requirements: [
        "Implement the core UI with a component-based architecture",
        "Handle loading, empty, and error states for all data-fetching views",
        "Ensure the application is fully responsive across mobile, tablet, and desktop",
        "Implement client-side routing with at least two distinct views",
        "Add form validation with meaningful error messages",
        "Include a search or filter mechanism",
        "Persist state across page reloads where appropriate",
      ],
      constraints: [
        "Use only built-in browser APIs or the specified framework — no additional UI libraries unless explicitly allowed",
        "All network requests must include proper error handling and timeout management",
        "The application must work without JavaScript disabled (server-rendered fallbacks where applicable)",
      ],
      bonusFeatures: [
        "Add dark mode support with a toggle",
        "Implement keyboard navigation and accessibility (ARIA) improvements",
        "Add animation transitions between routes or state changes",
      ],
      deliverables: [
        "A public Git repository with commit history",
        "A live deployment URL (Vercel, Netlify, or similar)",
        "A brief architecture decision record (ADR) explaining key choices",
      ],
      evaluationCriteria: [
        "Code quality: clean, readable, well-structured components",
        "State management: appropriate use of state, props, and side effects",
        "User experience: polished UI, responsive design, loading states",
        "Error handling: graceful degradation and user feedback",
        "Performance: efficient rendering, bundle size awareness",
        "Testing: unit or integration tests for critical paths",
      ],
    }),

    BACKEND: (p) => ({
      title: p.length > 80 ? p.substring(0, 77) + "..." : p,
      category: "BACKEND",
      difficulty: diff,
      overview: `Design and implement a backend service based on the following: ${p}\n\nThe candidate should demonstrate strong backend engineering practices including API design, data modelling, authentication, error handling, and testing. The solution should be robust, scalable, and follow RESTful or GraphQL best practices.`,
      requirements: [
        "Design and implement a RESTful API with at least 5 endpoints",
        "Implement authentication and authorisation (JWT or session-based)",
        "Add input validation and sanitisation for all endpoints",
        "Include database migrations and seed data",
        "Implement pagination, sorting, and filtering for list endpoints",
        "Add comprehensive error handling with structured error responses",
        "Write integration tests for all API endpoints",
      ],
      constraints: [
        "No admin panels or auto-generated CRUD — all endpoints must be hand-written",
        "All API responses must follow a consistent JSON envelope format",
        "Sensitive data must be encrypted at rest",
      ],
      bonusFeatures: [
        "Add rate limiting per user/IP",
        "Implement a webhook system for real-time events",
        "Add API versioning support",
      ],
      deliverables: [
        "A public Git repository with commit history",
        "API documentation (OpenAPI/Swagger or equivalent)",
        "A Postman collection or equivalent API test suite",
        "Instructions for local setup and environment configuration",
      ],
      evaluationCriteria: [
        "API design: RESTful conventions, resource naming, status codes",
        "Data modelling: appropriate schema design and relationships",
        "Security: authentication, input validation, protection against common attacks",
        "Code organisation: modular architecture, separation of concerns",
        "Testing: coverage of happy paths, edge cases, and error scenarios",
        "Documentation: clear README, API docs, setup instructions",
      ],
    }),

    AI_ML: (p) => ({
      title: p.length > 80 ? p.substring(0, 77) + "..." : p,
      category: "AI_ML",
      difficulty: diff,
      overview: `Develop an AI/ML-powered solution based on the following: ${p}\n\nThe candidate should demonstrate the ability to integrate AI/ML capabilities into a practical application, handle prompt engineering, model selection, and evaluation of AI-generated outputs.`,
      requirements: [
        "Integrate an AI/ML model or API to solve the core problem",
        "Implement appropriate prompt engineering or model fine-tuning",
        "Add input preprocessing and output validation/post-processing",
        "Handle API rate limits, timeouts, and fallback mechanisms",
        "Include evaluation metrics to measure output quality",
        "Support batch processing or streaming where applicable",
      ],
      constraints: [
        "All AI calls must include proper error handling and retry logic",
        "Cost and latency of AI calls must be considered and optimised",
        "No hardcoded API keys — use environment variables",
      ],
      bonusFeatures: [
        "Add caching for repeated AI requests to reduce cost",
        "Implement A/B testing for different prompts or models",
        "Add a feedback loop for continuous improvement of outputs",
      ],
      deliverables: [
        "A public Git repository with commit history",
        "A live demo or detailed walkthrough video",
        "Documentation on model selection and prompt engineering approach",
      ],
      evaluationCriteria: [
        "Solution design: appropriate use of AI for the problem",
        "Prompt quality: well-structured prompts with clear instructions",
        "Robustness: error handling, fallbacks, edge case management",
        "Performance: latency optimisation, caching, batch processing",
        "Evaluation: quantitative or qualitative metrics for output quality",
        "Code quality: clean, maintainable, well-documented code",
      ],
    }),

    API: (p) => ({
      title: p.length > 80 ? p.substring(0, 77) + "..." : p,
      category: "API",
      difficulty: diff,
      overview: `Design and implement an API service based on the following: ${p}\n\nThe candidate should demonstrate expertise in API design, integration patterns, error handling, and developer experience. The solution should be production-ready with comprehensive documentation.`,
      requirements: [
        "Design and implement RESTful or GraphQL API endpoints",
        "Implement authentication and authorisation",
        "Add request validation and structured error responses",
        "Include rate limiting and usage tracking",
        "Implement proper HTTP status codes and response headers",
        "Add comprehensive API documentation",
        "Write integration and unit tests",
      ],
      constraints: [
        "No auto-generated API frameworks — endpoints must be manually defined",
        "All responses must include appropriate cache headers",
        "API must support CORS for cross-origin requests",
      ],
      bonusFeatures: [
        "Implement API versioning (URL or header-based)",
        "Add webhook support for event notifications",
        "Include an SDK or client library example",
      ],
      deliverables: [
        "A public Git repository with commit history",
        "OpenAPI/Swagger specification",
        "A collection of example requests (Postman, curl, or HTTPie)",
        "Deployment instructions and environment setup guide",
      ],
      evaluationCriteria: [
        "API design: consistency, resource naming, HTTP methods",
        "Documentation: completeness, clarity, examples",
        "Error handling: informative error messages, proper status codes",
        "Security: authentication, input validation, rate limiting",
        "Testing: coverage of edge cases and error scenarios",
        "Developer experience: ease of integration, documentation quality",
      ],
    }),

    DATABASE: (p) => ({
      title: p.length > 80 ? p.substring(0, 77) + "..." : p,
      category: "DATABASE",
      difficulty: diff,
      overview: `Design and implement a data-intensive solution based on the following: ${p}\n\nThe candidate should demonstrate strong data modelling, query optimisation, and data integrity skills. The solution should handle real-world data challenges like concurrency, consistency, and performance at scale.`,
      requirements: [
        "Design a normalised database schema with at least 5 related tables",
        "Implement complex queries involving joins, aggregations, and subqueries",
        "Add database constraints, indexes, and relationships",
        "Implement data migration scripts with rollback support",
        "Include seed data for realistic testing scenarios",
        "Optimise queries for performance with large datasets",
        "Implement transaction handling for data consistency",
      ],
      constraints: [
        "All data access must go through a repository or data access layer",
        "No raw SQL injection possible — use parameterised queries or ORM",
        "Schema changes must be reversible",
      ],
      bonusFeatures: [
        "Implement full-text search on relevant fields",
        "Add a reporting or analytics query interface",
        "Implement database-level auditing (change tracking)",
      ],
      deliverables: [
        "A public Git repository with commit history",
        "ER diagram or schema documentation",
        "Query performance analysis with explain plans",
        "Setup and migration guide",
      ],
      evaluationCriteria: [
        "Schema design: normalisation, relationships, appropriate data types",
        "Query quality: efficient, readable, properly indexed queries",
        "Data integrity: constraints, transactions, error handling",
        "Performance: query optimisation, index strategy, connection pooling",
        "Migration management: version-controlled, reversible migrations",
        "Code quality: clean data access layer, separation of concerns",
      ],
    }),

    UI_UX: (p) => ({
      title: p.length > 80 ? p.substring(0, 77) + "..." : p,
      category: "UI_UX",
      difficulty: diff,
      overview: `Design and implement a user interface based on the following: ${p}\n\nThe candidate should demonstrate strong UI/UX skills including visual design, interaction patterns, accessibility, and responsive design. The solution should be pixel-perfect and provide an exceptional user experience.`,
      requirements: [
        "Implement a complete, polished user interface based on the description",
        "Ensure full responsiveness across mobile, tablet, and desktop breakpoints",
        "Implement smooth transitions and micro-interactions",
        "Follow accessibility best practices (WCAG 2.1 AA minimum)",
        "Handle all UI states: loading, empty, error, and edge cases",
        "Implement a consistent design system (colors, typography, spacing)",
        "Support keyboard navigation and screen reader compatibility",
      ],
      constraints: [
        "No UI framework or component library — build components from scratch",
        "All interactive elements must have focus and hover states",
        "Colour contrast ratios must meet WCAG AA standards",
      ],
      bonusFeatures: [
        "Add dark mode with system preference detection",
        "Implement internationalisation (i18n) for multi-language support",
        "Add gesture support for touch devices",
      ],
      deliverables: [
        "A public Git repository with commit history",
        "A live deployment URL",
        "A brief design rationale document explaining key decisions",
      ],
      evaluationCriteria: [
        "Visual design: typography, spacing, color usage, consistency",
        "Responsiveness: works seamlessly across all device sizes",
        "Accessibility: screen reader support, keyboard navigation, ARIA",
        "Interaction design: animations, transitions, micro-interactions",
        "Code quality: maintainable CSS, component organisation",
        "Attention to detail: pixel-perfect implementation, edge cases",
      ],
    }),

    DEVOPS: (p) => ({
      title: p.length > 80 ? p.substring(0, 77) + "..." : p,
      category: "DEVOPS",
      difficulty: diff,
      overview: `Design and implement a DevOps solution based on the following: ${p}\n\nThe candidate should demonstrate expertise in CI/CD, infrastructure as code, containerisation, monitoring, and deployment automation. The solution should be production-ready with a focus on reliability and observability.`,
      requirements: [
        "Set up a CI/CD pipeline with build, test, and deploy stages",
        "Containerise the application using Docker with multi-stage builds",
        "Implement infrastructure as code for cloud deployment",
        "Add monitoring and alerting with dashboards",
        "Implement blue/green or rolling deployment strategy",
        "Set up log aggregation and centralised logging",
        "Include security scanning in the pipeline (SAST, dependency scan)",
      ],
      constraints: [
        "All infrastructure must be defined as code (no manual cloud setup)",
        "Containers must follow security best practices (no root, minimal base images)",
        "Secrets must be managed securely (not stored in code)",
      ],
      bonusFeatures: [
        "Implement auto-scaling based on load metrics",
        "Add canary deployment with traffic splitting",
        "Implement disaster recovery with automated failover",
      ],
      deliverables: [
        "A public Git repository with commit history",
        "Architecture diagram showing the deployment pipeline",
        "Runbooks for common operational tasks",
        "A demo or walkthrough video of the pipeline in action",
      ],
      evaluationCriteria: [
        "Pipeline design: efficient stages, caching, parallel execution",
        "Infrastructure as code: modular, reusable, well-documented",
        "Containerisation: optimised images, security, multi-stage builds",
        "Monitoring: comprehensive metrics, dashboards, alerts",
        "Security: vulnerability scanning, secret management, access control",
        "Documentation: runbooks, architecture docs, setup guides",
      ],
    }),

    AUTOMATION: (p) => ({
      title: p.length > 80 ? p.substring(0, 77) + "..." : p,
      category: "AUTOMATION",
      difficulty: diff,
      overview: `Build an automation solution based on the following: ${p}\n\nThe candidate should demonstrate the ability to design and implement automated workflows, scripts, or tools that reduce manual effort and improve reliability. The solution should be robust, well-tested, and easy to maintain.`,
      requirements: [
        "Design and implement the core automation workflow",
        "Include comprehensive error handling and retry logic",
        "Add logging and reporting of automation results",
        "Implement idempotent operations where possible",
        "Include configuration via environment variables or config files",
        "Add dry-run mode for testing",
        "Write unit and integration tests for critical paths",
      ],
      constraints: [
        "All operations must be reversible or include rollback mechanisms",
        "No hardcoded paths or credentials",
        "Must handle edge cases: empty inputs, network failures, partial failures",
      ],
      bonusFeatures: [
        "Add a web UI or dashboard to trigger and monitor automations",
        "Implement scheduling with cron or equivalent",
        "Add notification integration (Slack, email, etc.)",
      ],
      deliverables: [
        "A public Git repository with commit history",
        "Comprehensive README with usage examples",
        "Test suite with coverage report",
        "Documentation explaining the automation flow",
      ],
      evaluationCriteria: [
        "Design: clear modular architecture, separation of concerns",
        "Error handling: graceful failure, retry logic, user feedback",
        "Reliability: idempotency, edge case handling, race condition avoidance",
        "Testing: comprehensive test coverage for critical paths",
        "Documentation: clear setup, configuration, and usage instructions",
        "Code quality: readable, maintainable, well-structured code",
      ],
    }),

    SYSTEM_DESIGN: (p) => ({
      title: p.length > 80 ? p.substring(0, 77) + "..." : p,
      category: "SYSTEM_DESIGN",
      difficulty: diff,
      overview: `Design a system based on the following requirements: ${p}\n\nThe candidate should demonstrate the ability to design scalable, distributed systems with consideration for trade-offs, bottlenecks, and real-world constraints. The solution should include architectural decisions, data flow, and component interaction.`,
      requirements: [
        "Provide a high-level system architecture diagram",
        "Define API contracts between major components",
        "Address data storage, caching, and partitioning strategy",
        "Discuss scalability, availability, and consistency trade-offs",
        "Include monitoring, logging, and alerting strategy",
        "Address security considerations at each layer",
        "Provide capacity estimation and resource planning",
      ],
      constraints: [
        "System must handle at least 10x peak load of current estimates",
        "Must support multi-region deployment for disaster recovery",
        "All inter-service communication must be resilient to failures",
      ],
      bonusFeatures: [
        "Include a cost analysis comparing different architectural options",
        "Design a migration strategy from monolith to microservices",
        "Add a chaos engineering plan for resilience testing",
      ],
      deliverables: [
        "Architecture diagram (C4 model or equivalent)",
        "Written design document covering trade-offs and decisions",
        "API contract definitions (OpenAPI, Protobuf, or equivalent)",
        "Presentation or walkthrough video",
      ],
      evaluationCriteria: [
        "Architecture: appropriate component decomposition, clear data flow",
        "Scalability: handles growth in users, data, and traffic",
        "Reliability: fault tolerance, redundancy, disaster recovery",
        "Trade-off analysis: clear discussion of alternatives and decisions",
        "Security: threat modelling, data protection, access control",
        "Communication: clarity of diagrams, documentation, and explanations",
      ],
    }),

    PYTHON: (p) => ({
      title: p.length > 80 ? p.substring(0, 77) + "..." : p,
      category: "PYTHON",
      difficulty: diff,
      overview: `Build a Python-based solution based on the following: ${p}\n\nThe candidate should demonstrate strong Python programming skills including proper use of the standard library, typing, testing, and package management. The solution should be production-quality with clean, idiomatic Python code.`,
      requirements: [
        "Implement the core functionality using Python",
        "Use type hints throughout the codebase",
        "Include comprehensive unit tests with at least 80% coverage",
        "Follow PEP 8 style guidelines and use linting",
        "Implement proper error handling with custom exceptions",
        "Include CLI interface or programmatic API",
        "Add configuration management via environment variables or config files",
      ],
      constraints: [
        "Standard library preferred — minimise external dependencies",
        "All I/O operations must be handled asynchronously or with proper timeout",
        "Must support Python 3.11+ features where appropriate",
      ],
      bonusFeatures: [
        "Add asyncio support for concurrent operations",
        "Implement a simple web interface using a minimal framework",
        "Add performance benchmarking scripts",
      ],
      deliverables: [
        "A public Git repository with commit history",
        "Installation and usage instructions",
        "Test suite with coverage report",
        "API documentation (docstrings or Sphinx)",
      ],
      evaluationCriteria: [
        "Code quality: idiomatic Python, type hints, PEP 8 compliance",
        "Architecture: modular design, separation of concerns",
        "Error handling: comprehensive error management, custom exceptions",
        "Testing: coverage, edge cases, mocking strategy",
        "Documentation: clear docstrings, README, usage examples",
        "Performance: efficient algorithms, proper resource management",
      ],
    }),
  }

  // Try to find a matching template; fall back to FRONTEND
  const generator = templates[normalisedCategory] || templates.FRONTEND
  return generator(prompt)
}

// ─── POST Handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = generateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { prompt, category, difficulty } = parsed.data

    // Step 1: Try AI-powered generation using OpenAI
    let generated = await generateWithAI(prompt, category, difficulty)

    // Step 2: Fall back to template-based generation
    const usedAI = !!generated
    if (!generated) {
      generated = generateWithTemplate(prompt, category, difficulty)
    }

    // Step 3: Ensure slug uniqueness
    let slug = generateSlug(generated.title)
    let existing = await prisma.problemTemplate.findUnique({ where: { slug } })
    let counter = 1
    while (existing) {
      slug = `${generateSlug(generated.title)}-${counter}`
      existing = await prisma.problemTemplate.findUnique({ where: { slug } })
      counter++
    }

    // Step 4: Create the problem template (inactive by default for admin review)
    const problem = await prisma.problemTemplate.create({
      data: {
        title: generated.title,
        slug,
        category: generated.category,
        difficulty: generated.difficulty,
        overview: generated.overview,
        requirements: generated.requirements,
        constraints: generated.constraints,
        bonusFeatures: generated.bonusFeatures,
        deliverables: generated.deliverables,
        evaluationCriteria: generated.evaluationCriteria,
        isActive: false,
      },
    })

    // Step 5: Audit
    await logAudit(
      "problem.generate",
      {
        problemId: problem.id,
        title: problem.title,
        slug: problem.slug,
        category: problem.category,
        method: usedAI ? "ai" : "template",
      },
      session.user.id,
    )

    return NextResponse.json(
      {
        message: `Problem "${problem.title}" generated successfully`,
        problem,
        method: usedAI ? "ai" : "template",
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Generate problem error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
