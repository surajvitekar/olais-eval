import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const assessmentQuestions = [
  // ─── FRONTEND ──────────────────────────────────────────────────────────────
  {
    category: "FRONTEND",
    questionType: "SELF_RATING",
    questionText: "Rate your frontend development skills (React, components, state management)",
    options: { min: 1, max: 10, labels: { low: "Beginner", high: "Expert" } },
    weight: 1.0,
    displayOrder: 1,
  },
  {
    category: "FRONTEND",
    questionType: "MULTIPLE_CHOICE",
    questionText: "Which state management approach do you prefer for complex React apps?",
    options: {
      choices: [
        "React Context + useReducer",
        "Redux / Redux Toolkit",
        "Zustand",
        "Jotai / Recoil",
        "TanStack Query + local state",
      ],
    },
    weight: 2.0,
    displayOrder: 2,
  },
  {
    category: "FRONTEND",
    questionType: "EXPERIENCE",
    questionText: "How many production React applications have you built?",
    options: { levels: ["0", "1-2", "3-5", "6-10", "10+"] },
    weight: 3.0,
    displayOrder: 3,
  },

  // ─── BACKEND ───────────────────────────────────────────────────────────────
  {
    category: "BACKEND",
    questionType: "SELF_RATING",
    questionText: "Rate your backend development skills (APIs, server logic, authentication)",
    options: { min: 1, max: 10, labels: { low: "Beginner", high: "Expert" } },
    weight: 1.0,
    displayOrder: 4,
  },
  {
    category: "BACKEND",
    questionType: "MULTIPLE_CHOICE",
    questionText: "Which backend framework are you most experienced with?",
    options: {
      choices: [
        "Node.js / Express",
        "Next.js API Routes",
        "Python / FastAPI",
        "Go / Gin",
        "Java / Spring Boot",
      ],
    },
    weight: 2.0,
    displayOrder: 5,
  },
  {
    category: "BACKEND",
    questionType: "PROJECT_FAMILIARITY",
    questionText: "Have you built a REST API with authentication, rate limiting, and database integration?",
    options: { values: ["yes", "no", "maybe"] },
    weight: 2.0,
    displayOrder: 6,
  },

  // ─── PYTHON ────────────────────────────────────────────────────────────────
  {
    category: "PYTHON",
    questionType: "SELF_RATING",
    questionText: "Rate your Python programming skills",
    options: { min: 1, max: 10, labels: { low: "Beginner", high: "Expert" } },
    weight: 1.0,
    displayOrder: 7,
  },
  {
    category: "PYTHON",
    questionType: "EXPERIENCE",
    questionText: "How many Python projects have you completed end-to-end?",
    options: { levels: ["0", "1-3", "4-7", "8-15", "15+"] },
    weight: 3.0,
    displayOrder: 8,
  },

  // ─── AI/ML ─────────────────────────────────────────────────────────────────
  {
    category: "AI_ML",
    questionType: "AI_USAGE",
    questionText: "Which AI/ML tools have you used in your development workflow?",
    options: {
      tools: [
        "OpenAI / GPT APIs",
        "LangChain / LlamaIndex",
        "Hugging Face Transformers",
        "TensorFlow / PyTorch",
        "Claude / Anthropic API",
        "Local LLMs (Ollama, llama.cpp)",
        "RAG pipelines",
        "Vector databases (Pinecone, Weaviate, Qdrant)",
      ],
    },
    weight: 1.5,
    displayOrder: 9,
  },
  {
    category: "AI_ML",
    questionType: "SELF_RATING",
    questionText: "Rate your experience integrating AI/ML APIs into applications",
    options: { min: 1, max: 10, labels: { low: "No experience", high: "Expert" } },
    weight: 1.0,
    displayOrder: 10,
  },

  // ─── API ───────────────────────────────────────────────────────────────────
  {
    category: "API",
    questionType: "SELF_RATING",
    questionText: "Rate your API design and development skills",
    options: { min: 1, max: 10, labels: { low: "Beginner", high: "Expert" } },
    weight: 1.0,
    displayOrder: 11,
  },
  {
    category: "API",
    questionType: "MULTIPLE_CHOICE",
    questionText: "What's your preferred API architecture pattern?",
    options: {
      choices: [
        "RESTful",
        "GraphQL",
        "tRPC",
        "WebSockets",
        "gRPC",
      ],
    },
    weight: 2.0,
    displayOrder: 12,
  },
  {
    category: "API",
    questionType: "PROJECT_FAMILIARITY",
    questionText: "Have you designed and documented APIs that were consumed by external teams?",
    options: { values: ["yes", "no", "maybe"] },
    weight: 2.0,
    displayOrder: 13,
  },

  // ─── DATABASE ──────────────────────────────────────────────────────────────
  {
    category: "DATABASE",
    questionType: "EXPERIENCE",
    questionText: "Which databases have you used in production?",
    options: {
      choices: [
        "PostgreSQL",
        "MySQL",
        "MongoDB",
        "SQLite",
        "Redis",
        "Supabase",
        "PlanetScale / Vitess",
      ],
    },
    weight: 3.0,
    displayOrder: 14,
  },
  {
    category: "DATABASE",
    questionType: "SELF_RATING",
    questionText: "Rate your SQL and database design skills",
    options: { min: 1, max: 10, labels: { low: "Beginner", high: "Expert" } },
    weight: 1.0,
    displayOrder: 15,
  },
  {
    category: "DATABASE",
    questionType: "PROJECT_FAMILIARITY",
    questionText: "Have you designed database schemas with migrations and indexing strategies?",
    options: { values: ["yes", "no", "maybe"] },
    weight: 2.0,
    displayOrder: 16,
  },

  // ─── DEVOPS ────────────────────────────────────────────────────────────────
  {
    category: "DEVOPS",
    questionType: "SELF_RATING",
    questionText: "Rate your DevOps and deployment skills",
    options: { min: 1, max: 10, labels: { low: "Beginner", high: "Expert" } },
    weight: 1.0,
    displayOrder: 17,
  },
  {
    category: "DEVOPS",
    questionType: "AI_USAGE",
    questionText: "Which deployment platforms have you used?",
    options: {
      tools: [
        "Vercel",
        "Netlify",
        "AWS (EC2 / ECS / Lambda)",
        "Google Cloud Run",
        "Railway / Render",
        "Docker / Docker Compose",
        "Kubernetes",
        "GitHub Actions / CI/CD",
      ],
    },
    weight: 1.5,
    displayOrder: 18,
  },

  // ─── SYSTEM DESIGN ─────────────────────────────────────────────────────────
  {
    category: "SYSTEM_DESIGN",
    questionType: "SELF_RATING",
    questionText: "Rate your system design and architecture skills",
    options: { min: 1, max: 10, labels: { low: "Beginner", high: "Expert" } },
    weight: 1.0,
    displayOrder: 19,
  },
  {
    category: "SYSTEM_DESIGN",
    questionType: "MULTIPLE_CHOICE",
    questionText: "What's your approach to handling scale in web applications?",
    options: {
      choices: [
        "Vertical scaling (bigger servers)",
        "Horizontal scaling + load balancers",
        "Microservices architecture",
        "Serverless / edge functions",
        "Caching + CDN + database optimization",
      ],
    },
    weight: 2.0,
    displayOrder: 20,
  },
]

const problemTemplates = [
  // ─── FULL-STACK ─────────────────────────────────────────────────────────────
  {
    title: "Real-Time Collaboration Board",
    slug: "real-time-collab-board",
    category: "full-stack",
    difficulty: 4,
    overview: `Build a real-time collaborative whiteboard where multiple users can draw, write sticky notes, and chat simultaneously. This is a modern take on tools like Miro or FigJam, focused on real-time sync and a polished UI.

The application should allow users to create boards, invite collaborators via shareable links, and work together in real-time. Every change — drawing strokes, text additions, sticky notes — should sync across all connected clients with minimal latency.

Think about conflict resolution, optimistic updates, and handling disconnections gracefully. The UI should be intuitive and responsive, with tool selection (pen, sticky note, text, eraser) and color/size customization.`,
    requirements: [
      "User authentication with session management",
      "Real-time collaboration using WebSockets (Socket.io or similar)",
      "Drawing canvas with pen, shapes, text, and sticky note tools",
      "Shareable board links with permission levels (view/edit)",
      "Undo/redo history per board session",
      "User presence indicators (who's viewing/editing)",
      "Auto-save and recovery on reconnection",
      "Board listing page with search and recent boards",
    ],
    constraints: [
      "Must handle at least 10 concurrent users on a single board",
      "Max latency under 500ms for sync operations",
      "Optimistic UI updates with server reconciliation",
      "Export boards as PNG or PDF",
    ],
    bonusFeatures: [
      "Template boards (brainstorming, retro, planning)",
      "Comment threads on specific elements",
      "Dark mode toggle",
    ],
    deliverables: [
      "Git repository with full source code",
      "Live deployment URL",
      "ARCHITECTURE.md with real-time sync explanation",
      "AI declaration and prompts/ folder",
    ],
    evaluationCriteria: [
      "Real-time sync quality and latency",
      "UI/UX polish and responsiveness",
      "Code organization and architecture",
      "Error handling and reconnection logic",
      "Feature completeness against requirements",
      "Deployment quality and accessibility",
    ],
    variantGroup: "full-stack-real-time",
  },
  {
    title: "SaaS Subscription Dashboard",
    slug: "saas-subscription-dashboard",
    category: "full-stack",
    difficulty: 3,
    overview: `Create a full-stack SaaS subscription management dashboard where customers can view their subscription plans, usage stats, invoices, and billing history. Admins can manage plans, view all customers, and generate reports.

The dashboard should display real-time usage metrics (API calls, storage, active users) with interactive charts. Implement Stripe-like subscription management with plan upgrades/downgrades, proration, and payment method management.

Focus on clean data visualization, responsive design, and a smooth subscription flow. The app should handle webhook events from payment providers for subscription lifecycle management.`,
    requirements: [
      "User registration with email verification",
      "Subscription plan listing with feature comparison",
      "Usage metrics dashboard with interactive charts (Chart.js or Recharts)",
      "Payment method management (add/remove/update)",
      "Invoice history with download links",
      "Admin panel: manage plans, view all customers",
      "Webhook endpoint for subscription lifecycle events",
      "Email notifications for billing events",
    ],
    constraints: [
      "Use a mock payment provider or Stripe test mode",
      "Responsive layout for mobile and desktop",
      "All API endpoints must have rate limiting",
      "Proration calculations must be accurate",
    ],
    bonusFeatures: [
      "Multi-currency support",
      "Team/org accounts with role-based access",
      "Custom invoice branding",
    ],
    deliverables: [
      "Git repository with full source code",
      "Live deployment URL",
      "ARCHITECTURE.md with subscription flow",
      "AI declaration and prompts/ folder",
    ],
    evaluationCriteria: [
      "Subscription flow completeness",
      "Data visualization quality",
      "Code organization and testing",
      "Payment integration (even mock) accuracy",
      "Admin panel functionality",
      "Deployment and reliability",
    ],
    variantGroup: "full-stack-saas",
  },
  // ─── AUTOMATION ─────────────────────────────────────────────────────────────
  {
    title: "CI/CD Pipeline Visualizer",
    slug: "cicd-pipeline-visualizer",
    category: "automation",
    difficulty: 3,
    overview: `Build a web application that visualizes CI/CD pipeline runs from GitHub Actions or a similar provider. The app should fetch pipeline data, display run history, show individual job steps with timing, and provide failure analysis.

Think of this as a more visual, user-friendly alternative to the default GitHub Actions interface. Users should be able to see pipeline DAGs (directed acyclic graphs), drill into failed steps, view logs, and get summary statistics across multiple repositories.

The application should poll or receive webhook events for live updates, showing real-time progress of running pipelines with animated transitions.`,
    requirements: [
      "OAuth integration with GitHub/GitLab for pipeline access",
      "Pipeline run history with status badges and duration",
      "DAG visualization showing job dependencies and parallel execution",
      "Step-level drill-down with log viewer (syntax highlighting)",
      "Failure analysis with common error pattern detection",
      "Multi-repository dashboard with filtering",
      "Real-time updates via webhooks or polling",
      "Summary stats: success rate, avg duration, flaky test detection",
    ],
    constraints: [
      "Must work with public GitHub repos without auth (read-only mode)",
      "Handle pagination for repos with 1000+ pipeline runs",
      "Log viewer must handle files of 10MB+",
      "Responsive design for mobile monitoring",
    ],
    bonusFeatures: [
      "Slack/Discord notification integration",
      "Deployment timeline overlay",
      "Custom dashboard widgets",
    ],
    deliverables: [
      "Git repository with full source code",
      "Live deployment URL",
      "ARCHITECTURE.md with data flow explanation",
      "AI declaration and prompts/ folder",
    ],
    evaluationCriteria: [
      "DAG visualization quality and accuracy",
      "Real-time update mechanism",
      "Log viewer performance with large files",
      "Error analysis usefulness",
      "UI/UX polish",
      "Code architecture and maintainability",
    ],
    variantGroup: "automation-cicd",
  },
  {
    title: "Email Template Builder with Automation",
    slug: "email-template-builder",
    category: "automation",
    difficulty: 3,
    overview: `Create a drag-and-drop email template builder with automated sending capabilities. Users should be able to visually design email templates, manage contact lists, schedule campaigns, and track open/click rates.

The builder should provide a WYSIWYG interface with common email components (header, text, image, button, divider, footer). Templates should render reliably across major email clients (Gmail, Outlook, Apple Mail). Include an automation engine for triggered emails (welcome series, abandoned cart, birthday).`,
    requirements: [
      "Drag-and-drop email template builder with live preview",
      "10+ reusable components (header, text, image, button, columns, etc.)",
      "Responsive email rendering preview (desktop + mobile)",
      "Contact list management with CSV import",
      "Campaign scheduling with timezone support",
      "Open rate and click tracking via pixel + link wrapping",
      "Automation rules engine for triggered sequences",
      "Template version history and A/B testing",
    ],
    constraints: [
      "Templates must render consistently in Gmail and Outlook",
      "Support at least 10,000 contacts per campaign",
      "Drag-and-drop must work on mobile browsers",
      "Email sending must use a transactional email service (SendGrid/Mailgun mock)",
    ],
    bonusFeatures: [
      "AI subject line generator",
      "Spam score checker",
      "Custom CSS injection for advanced users",
    ],
    deliverables: [
      "Git repository with full source code",
      "Live deployment URL",
      "ARCHITECTURE.md with email rendering approach",
      "AI declaration and prompts/ folder",
    ],
    evaluationCriteria: [
      "Drag-and-drop editor usability and completeness",
      "Email rendering accuracy across clients",
      "Automation engine flexibility",
      "Campaign management features",
      "Code quality and testing",
      "Deployment and documentation",
    ],
    variantGroup: "automation-email",
  },
  // ─── AI WORKFLOWS ───────────────────────────────────────────────────────────
  {
    title: "AI-Powered Code Review Assistant",
    slug: "ai-code-review-assistant",
    category: "ai-workflows",
    difficulty: 5,
    overview: `Build a web application that performs automated code reviews using AI. Users submit PR URLs or paste code snippets, and the application provides detailed reviews covering code quality, security vulnerabilities, performance issues, and best practices.

This is not just a linter — it should understand context, suggest improvements with code examples, detect common anti-patterns, and provide educational explanations. The system should maintain a review history and track code quality trends across a repository.

Integrate with GitHub/GitLab via webhooks for automatic review on PR creation. Support multiple programming languages and frameworks.`,
    requirements: [
      "Code submission via PR URL, direct paste, or file upload",
      "AI-powered review covering: quality, security, performance, best practices",
      "Language-specific linting and style suggestions (ESLint, Prettier, Pylint integration)",
      "Review history dashboard with per-repository trends",
      "GitHub/GitLab webhook integration for automatic PR review",
      "Severity ratings (critical, major, minor, suggestion) for each finding",
      "Markdown-formatted review report with code snippets",
      "User feedback mechanism (upvote/downvote reviews for fine-tuning)",
    ],
    constraints: [
      "Must handle files up to 5000 lines",
      "Support at least 5 programming languages (JS, TS, Python, Go, Rust)",
      "AI API calls must be rate-limited and cached",
      "Review must complete within 60 seconds for standard PRs",
    ],
    bonusFeatures: [
      "Diff view showing suggested changes inline",
      "Auto-fix with PR creation",
      "Custom rule configuration per project",
    ],
    deliverables: [
      "Git repository with full source code",
      "Live deployment URL",
      "ARCHITECTURE.md with AI integration approach",
      "AI declaration and prompts/ folder",
    ],
    evaluationCriteria: [
      "Review quality and accuracy",
      "Multi-language support depth",
      "Integration quality (webhooks, PR flow)",
      "Performance and caching strategy",
      "UI/UX for reviewing results",
      "Architecture and extensibility",
    ],
    variantGroup: "ai-code-review",
  },
  {
    title: "AI Chatbot with RAG Pipeline",
    slug: "ai-chatbot-rag-pipeline",
    category: "ai-workflows",
    difficulty: 4,
    overview: `Build a Retrieval-Augmented Generation (RAG) chatbot that answers questions based on a custom knowledge base. Users upload documents (PDF, text, markdown), and the system indexes them into a vector database for semantic search.

The chatbot should provide accurate, source-cited answers using an LLM of choice (OpenAI, Claude, or local via Ollama). Show confidence scores, source document excerpts, and follow-up suggestions. Implement conversation memory for contextual follow-ups.

Design a clean chat interface with document management, chunk visualization, and query debugging tools.`,
    requirements: [
      "Document upload (PDF, TXT, MD, DOCX) with chunking and indexing",
      "Vector database integration (Pinecone, Qdrant, or in-memory FAISS)",
      "Semantic search with hybrid (keyword + vector) retrieval",
      "Source-cited answers with relevant excerpt highlighting",
      "Conversation history with contextual memory",
      "Document management UI (list, delete, re-index)",
      "Confidence scoring and alternative answers",
      "Streaming responses for real-time chat feel",
    ],
    constraints: [
      "Handle documents up to 100 pages each",
      "Support at least 3 file formats",
      "Retrieval latency under 2 seconds",
      "Must work with at least one free/self-hosted LLM option",
    ],
    bonusFeatures: [
      "Admin dashboard for query analytics",
      "Multi-tenant document isolation",
      "Batch document processing with progress tracking",
    ],
    deliverables: [
      "Git repository with full source code",
      "Live deployment URL",
      "ARCHITECTURE.md with RAG pipeline explanation",
      "AI declaration and prompts/ folder",
    ],
    evaluationCriteria: [
      "Retrieval accuracy and relevance",
      "Answer quality with proper citations",
      "Document processing pipeline robustness",
      "UI/UX of chat interface",
      "Performance and latency optimization",
      "Code architecture and testing",
    ],
    variantGroup: "ai-rag-chatbot",
  },
  // ─── APIs ───────────────────────────────────────────────────────────────────
  {
    title: "API Gateway with Rate Limiting & Analytics",
    slug: "api-gateway-rate-limiting",
    category: "apis",
    difficulty: 4,
    overview: `Build an API gateway that sits in front of microservices, providing unified authentication, rate limiting, request/response transformation, and analytics. This is a lightweight alternative to Kong or AWS API Gateway.

The gateway should route requests to different backend services based on path patterns, apply rate limits per API key or IP, collect usage metrics, and provide a dashboard for monitoring. Include a developer portal where users can generate API keys, view docs, and test endpoints.

Focus on performance — the gateway should add minimal latency while providing robust security and observability features.`,
    requirements: [
      "Request routing to multiple backend services based on path patterns",
      "Rate limiting with configurable tiers (per key, per IP, per endpoint)",
      "API key authentication and management",
      "Request/response transformation (headers, body, CORS)",
      "Usage analytics dashboard with charts and export",
      "Developer portal with API documentation (OpenAPI/Swagger)",
      "Logging middleware with structured JSON logs",
      "Health check endpoint and uptime monitoring",
    ],
    constraints: [
      "Gateway must add less than 10ms latency per request",
      "Support 1000+ concurrent connections",
      "Rate limit data must survive server restarts",
      "All analytics data must be cached with TTL",
    ],
    bonusFeatures: [
      "WebSocket proxy support",
      "Canary release routing",
      "Circuit breaker pattern implementation",
    ],
    deliverables: [
      "Git repository with full source code",
      "Live deployment URL",
      "ARCHITECTURE.md with routing and rate limiting approach",
      "AI declaration and prompts/ folder",
    ],
    evaluationCriteria: [
      "Performance and latency overhead",
      "Rate limiting accuracy and flexibility",
      "Analytics dashboard completeness",
      "Developer portal UX",
      "Security and authentication robustness",
      "Code quality and documentation",
    ],
    variantGroup: "apis-gateway",
  },
  {
    title: "Webhook Receiver & Event Bus",
    slug: "webhook-event-bus",
    category: "apis",
    difficulty: 3,
    overview: `Build a webhook receiver that ingests events from external services, transforms them into a standardized format, and routes them to configured subscribers with retry logic. Think of it as a lightweight Zapier or webhook relay.

The system should accept webhooks from popular services (GitHub, Stripe, Slack), provide a dashboard to view incoming events, configure transformations, and monitor delivery status. Include a subscriber SDK or webhook forwarding mechanism.

Handle delivery guarantees (at-least-once), dead-letter queues, and idempotency keys. Provide a public API for programmatic subscriber management.`,
    requirements: [
      "Webhook ingestion endpoint with signature verification",
      "Event transformation pipeline (JSONata or template-based)",
      "Subscriber management with retry policy configuration",
      "Delivery status dashboard with logs per event",
      "Dead-letter queue for failed deliveries",
      "At-least-once delivery with idempotency keys",
      "Public API for subscriber CRUD operations",
      "Support for common webhook formats (GitHub, Stripe, Slack)",
    ],
    constraints: [
      "Handle 100+ webhooks per second",
      "Retry with exponential backoff (max 3 retries)",
      "Store event history for 30 days",
      "All transformations must be testable",
    ],
    bonusFeatures: [
      "Webhook testing tool (send mock events)",
      "Event replay from any point in history",
      "Slack/Discord notification on delivery failure",
    ],
    deliverables: [
      "Git repository with full source code",
      "Live deployment URL",
      "ARCHITECTURE.md with event flow explanation",
      "AI declaration and prompts/ folder",
    ],
    evaluationCriteria: [
      "Event ingestion throughput and reliability",
      "Transformation pipeline flexibility",
      "Dashboard usability and event visibility",
      "Retry and dead-letter queue implementation",
      "API design and documentation",
      "Code quality and testing",
    ],
    variantGroup: "apis-webhook",
  },
  // ─── DASHBOARDS ──────────────────────────────────────────────────────────────
  {
    title: "Multi-Source Analytics Dashboard",
    slug: "multi-source-analytics-dashboard",
    category: "dashboards",
    difficulty: 3,
    overview: `Create a comprehensive analytics dashboard that pulls data from multiple sources (database, APIs, CSV uploads) and visualizes it in customizable widgets. Users should be able to build their own dashboard layouts with drag-and-drop widgets.

The dashboard should support various chart types, filter data by date range and dimensions, and export reports as PDF or CSV. Include a SQL query editor for advanced users who want to write custom queries against connected data sources.

Focus on performance — dashboard load time under 2 seconds even with complex widgets, and smooth interactions for filtering and drill-down.`,
    requirements: [
      "Connect to multiple data sources (PostgreSQL, REST API, CSV upload)",
      "Drag-and-drop widget layout editor",
      "10+ chart types (line, bar, pie, table, heatmap, gauge, etc.)",
      "Date range picker with presets and custom ranges",
      "Interactive filtering with cross-widget filtering",
      "SQL query editor with syntax highlighting and auto-complete",
      "Dashboard sharing with role-based permissions",
      "Export widgets as PNG, dashboard as PDF",
    ],
    constraints: [
      "Dashboard must load in under 2 seconds",
      "Handle datasets up to 100,000 rows per widget",
      "Widget positions persist across sessions",
      "SQL editor must prevent dangerous queries (read-only for non-admins)",
    ],
    bonusFeatures: [
      "Alert rules (when metric exceeds threshold)",
      "Scheduled email PDF reports",
      "Embedded dashboard iframe support",
    ],
    deliverables: [
      "Git repository with full source code",
      "Live deployment URL",
      "ARCHITECTURE.md with data flow explanation",
      "AI declaration and prompts/ folder",
    ],
    evaluationCriteria: [
      "Visualization quality and chart variety",
      "Drag-and-drop UX polish",
      "Data source integration flexibility",
      "SQL editor usability",
      "Performance with large datasets",
      "Code quality and architecture",
    ],
    variantGroup: "dashboards-analytics",
  },
  // ─── DATA ───────────────────────────────────────────────────────────────────
  {
    title: "ETL Pipeline Builder",
    slug: "etl-pipeline-builder",
    category: "data",
    difficulty: 4,
    overview: `Build a visual ETL (Extract, Transform, Load) pipeline builder where users can define data extraction from sources (APIs, databases, files), apply transformations (filter, map, aggregate, join), and load results into destinations.

This is a simplified version of tools like Apache NiFi or Airbyte. Users should be able to design pipelines visually with a node-based editor, schedule runs, monitor execution, and view data samples at each stage.

Focus on the visual pipeline builder experience — nodes representing operations, drag-to-connect edges, inline data preview, and execution status indicators.`,
    requirements: [
      "Visual node-based pipeline editor (drag, connect, configure)",
      "10+ node types: HTTP extractor, DB extractor, CSV loader, filter, map, aggregate, join, sort, JSON loader",
      "Data preview at each pipeline stage (sample rows)",
      "Pipeline scheduling (cron-based) with manual trigger",
      "Execution history with per-stage timing and row counts",
      "Error handling with per-stage retry policy",
      "Pipeline import/export as JSON",
      "Credential management for data sources",
    ],
    constraints: [
      "Handle datasets up to 500MB in memory",
      "Pipeline editor must work smoothly in browser",
      "Maximum 50 nodes per pipeline",
      "Sensitive credentials must be encrypted at rest",
    ],
    bonusFeatures: [
      "Auto-schema detection from data sources",
      "Data quality checks as pipeline stages",
      "Parallel branch execution",
    ],
    deliverables: [
      "Git repository with full source code",
      "Live deployment URL",
      "ARCHITECTURE.md with pipeline execution model",
      "AI declaration and prompts/ folder",
    ],
    evaluationCriteria: [
      "Pipeline editor UX and completeness",
      "Node type variety and configuration flexibility",
      "Execution engine correctness",
      "Error handling and retry logic",
      "Data preview accuracy and performance",
      "Code architecture and testing",
    ],
    variantGroup: "data-etl",
  },
  // ─── TOOLING ────────────────────────────────────────────────────────────────
  {
    title: "Developer Snippet Manager",
    slug: "developer-snippet-manager",
    category: "tooling",
    difficulty: 2,
    overview: `Create a developer-focused code snippet manager where users can save, organize, search, and share code snippets. Think of it as a personal knowledge base for code with syntax highlighting, tagging, and AI-powered search.

Snippets should support multiple languages, version history, and one-click copy. Include a browser extension or VS Code extension for quick saving. Social features include public snippet sharing with comments and upvotes.

Focus on the search experience — fast full-text search across snippets with language filters, tag filters, and AI semantic search.`,
    requirements: [
      "Create, edit, delete code snippets with syntax highlighting",
      "Language detection and formatting (20+ languages)",
      "Tag-based organization with auto-suggest",
      "Full-text search with language and tag filters",
      "AI semantic search (embedding-based) for finding relevant snippets",
      "Markdown description support per snippet",
      "Public/private snippet visibility",
      "Snippet collections (folders/playlists)",
    ],
    constraints: [
      "Search results must appear in under 500ms",
      "Snippets can be up to 500 lines",
      "Syntax highlighting must support 20+ languages",
      "VS Code extension must work with basic auth",
    ],
    bonusFeatures: [
      "Browser extension for saving from any site",
      "Snippet sharing with expiring links",
      "AI snippet generator from natural language description",
    ],
    deliverables: [
      "Git repository with full source code",
      "Live deployment URL",
      "ARCHITECTURE.md with search architecture",
      "AI declaration and prompts/ folder",
    ],
    evaluationCriteria: [
      "Search performance and accuracy",
      "UI/UX for snippet management",
      "Syntax highlighting quality",
      "AI features usefulness",
      "Code quality and testing",
      "Deployment and documentation",
    ],
    variantGroup: "tooling-snippets",
  },
  // ─── AGENTIC ────────────────────────────────────────────────────────────────
  {
    title: "Autonomous Code Migration Agent",
    slug: "autonomous-code-migration-agent",
    category: "agentic",
    difficulty: 5,
    overview: `Build an AI agent that autonomously migrates code from one framework/language to another. For example, migrating a React class component to a functional component with hooks, or converting a Python Flask API to FastAPI.

The agent should analyze the input code, plan the migration steps, execute the transformation, and verify the output. Users can review and approve each step before final commit. The system should maintain context across multiple files and handle common migration patterns.

This is a complex agentic workflow — the AI must understand the source and target paradigms deeply and produce correct, idiomatic output code.`,
    requirements: [
      "File upload or repo URL input for source code",
      "Framework/language migration roadmap generation",
      "Step-by-step migration with AI-driven transformation per file",
      "Side-by-side diff view for review and approval",
      "Automated verification (lint, compile, basic tests)",
      "Support 5+ migration paths (React class→hooks, JS→TS, Flask→FastAPI, Express→NestJS, jQuery→React)",
      "Migration progress tracking with rollback per file",
      "Export migration as patches or a new repo branch",
    ],
    constraints: [
      "Must preserve code comments and formatting",
      "Each migration step must be independently reviewable",
      "Generate migration report with statistics",
      "Handle repos up to 100 files",
    ],
    bonusFeatures: [
      "Automated PR creation on GitHub",
      "Dependency update detection",
      "Migration cost estimation (time + complexity)",
    ],
    deliverables: [
      "Git repository with full source code",
      "Live deployment URL",
      "ARCHITECTURE.md with agent workflow explanation",
      "AI declaration and prompts/ folder",
    ],
    evaluationCriteria: [
      "Migration accuracy and code quality",
      "Agent workflow design and reliability",
      "Diff review UX",
      "Support for multiple migration paths",
      "Verification step robustness",
      "Architecture and extensibility to new migrations",
    ],
    variantGroup: "agentic-migration",
  },
  // ─── OCR ────────────────────────────────────────────────────────────────────
  {
    title: "Document OCR & Data Extraction Pipeline",
    slug: "document-ocr-extraction",
    category: "ocr",
    difficulty: 4,
    overview: `Build a document processing pipeline that extracts text and structured data from uploaded images and PDFs using OCR. The system should handle scanned documents, photos of documents, and digital PDFs with varied layouts.

Use Tesseract.js or a cloud OCR API to extract text, then apply AI-powered post-processing to extract structured fields (names, dates, amounts, invoice numbers) based on document type templates. Provide a web-based document viewer with overlaid extracted text.

Focus on extraction accuracy, handling of low-quality images, and a clean UI for reviewing and correcting extracted data.`,
    requirements: [
      "Upload images (JPG, PNG) and PDFs for OCR processing",
      "Automatic language detection and multi-language OCR support",
      "AI-powered field extraction for invoices, receipts, ID cards, and resumes",
      "Document viewer with overlaid OCR text highlighting",
      "Review and correct interface for extracted fields",
      "Template system for custom document types",
      "Batch processing with progress tracking",
      "Export extracted data as JSON, CSV, or Excel",
    ],
    constraints: [
      "Handle documents up to 20 pages each",
      "Support low-quality images (dirt, angle, low light)",
      "Extraction must complete within 30 seconds for 5-page docs",
      "Confidence scores for each extracted field",
    ],
    bonusFeatures: [
      "Auto-rotation and deskew correction",
      "Table extraction from documents",
      "Document classification (invoice, receipt, contract, etc.)",
    ],
    deliverables: [
      "Git repository with full source code",
      "Live deployment URL",
      "ARCHITECTURE.md with OCR pipeline explanation",
      "AI declaration and prompts/ folder",
    ],
    evaluationCriteria: [
      "OCR accuracy on varied document types",
      "Field extraction precision and recall",
      "Document viewer and correction UX",
      "Batch processing efficiency",
      "Template system flexibility",
      "Code quality and testing",
    ],
    variantGroup: "ocr-document",
  },
  // ─── MONITORING ─────────────────────────────────────────────────────────────
  {
    title: "Application Performance Monitor (APM)",
    slug: "application-performance-monitor",
    category: "monitoring",
    difficulty: 4,
    overview: `Build a lightweight Application Performance Monitoring (APM) dashboard that tracks request metrics, error rates, and system resources. Deploy a small agent (or SDK) that reports metrics from a sample application to the monitoring server.

The dashboard should display real-time and historical metrics: request throughput, latency percentiles (p50, p95, p99), error rates, CPU/memory usage, and endpoint-level breakdowns. Set up alert rules that trigger when metrics exceed thresholds.

Focus on clean, actionable visualizations and a simple setup process. The agent should be easy to integrate — just a few lines of code.`,
    requirements: [
      "Agent/sdk that reports request metrics and system resources",
      "Real-time dashboard with auto-refreshing charts",
      "Latency percentile tracking (p50, p95, p99, p99.9)",
      "Endpoint-level breakdown with status codes",
      "Error tracking with stack trace capture and grouping",
      "Alert rule configuration (email, webhook notifications)",
      "Time range selector with granularity adjustment",
      "Service map showing dependencies between services",
    ],
    constraints: [
      "Agent must add less than 5ms overhead per request",
      "Metrics data stored for 30 days at full resolution",
      "Dashboard must handle 10+ services simultaneously",
      "Alert evaluation must complete in under 10 seconds",
    ],
    bonusFeatures: [
      "Distributed tracing with span visualization",
      "Custom metric reporting via SDK API",
      "Anomaly detection using statistical models",
    ],
    deliverables: [
      "Git repository with full source code",
      "Live deployment URL",
      "ARCHITECTURE.md with monitoring approach",
      "AI declaration and prompts/ folder",
    ],
    evaluationCriteria: [
      "Dashboard visualization quality and clarity",
      "Agent performance overhead",
      "Alert rule implementation and notification",
      "Real-time update mechanism",
      "Data retention and query performance",
      "Code quality and documentation",
    ],
    variantGroup: "monitoring-apm",
  },
  // ─── AI UTILITIES ───────────────────────────────────────────────────────────
  {
    title: "Prompt Engineering Playground",
    slug: "prompt-engineering-playground",
    category: "ai-utilities",
    difficulty: 2,
    overview: `Build a prompt engineering playground where users can write prompts, test them against multiple LLMs (OpenAI, Claude, Gemini, local models via Ollama), compare responses side-by-side, and iterate on prompt quality.

This is a developer tool for prompt engineers. Include features like prompt templates with variables, system prompt management, response history, token counting, and export. The comparison view should highlight differences between model responses.

Focus on the comparison experience — users should easily see which model and prompt variation produces the best result for their use case.`,
    requirements: [
      "Prompt editor with syntax highlighting for variables {{var}}",
      "Multi-model support (OpenAI, Claude, Gemini, Ollama)",
      "Side-by-side response comparison (2-4 models)",
      "Prompt template library with version history",
      "Token counter and cost estimator per model",
      "Response history with search and filtering",
      "System prompt configuration presets",
      "Export prompts and responses as markdown/JSON",
    ],
    constraints: [
      "API calls must be cancellable",
      "Support streaming responses where available",
      "Token counts must be accurate per model's tokenizer",
      "Prompt history stored locally and optionally synced",
    ],
    bonusFeatures: [
      "Prompt chaining (output of one prompt → input of next)",
      "A/B test results visualization",
      "Custom model endpoint configuration",
    ],
    deliverables: [
      "Git repository with full source code",
      "Live deployment URL",
      "ARCHITECTURE.md with multi-model integration",
      "AI declaration and prompts/ folder",
    ],
    evaluationCriteria: [
      "Multi-model integration quality",
      "Comparison UX and usefulness",
      "Prompt editor features and usability",
      "Token counting accuracy",
      "History management and search",
      "Code quality and testing",
    ],
    variantGroup: "ai-utilities-prompt",
  },
]

async function main() {
  console.log("Seeding...")

  // Clear existing data
  await prisma.assessmentQuestion.deleteMany()
  await prisma.problemTemplate.deleteMany()

  // Seed assessment questions
  for (const q of assessmentQuestions) {
    await prisma.assessmentQuestion.create({
      data: {
        category: q.category as any,
        questionType: q.questionType as any,
        questionText: q.questionText,
        options: q.options,
        weight: q.weight,
        displayOrder: q.displayOrder,
      },
    })
  }

  console.log(`Seeded ${assessmentQuestions.length} assessment questions`)

  // Seed problem templates
  for (const p of problemTemplates) {
    await prisma.problemTemplate.create({
      data: {
        title: p.title,
        slug: p.slug,
        category: p.category,
        difficulty: p.difficulty,
        overview: p.overview,
        requirements: p.requirements,
        constraints: p.constraints,
        bonusFeatures: p.bonusFeatures,
        deliverables: p.deliverables,
        evaluationCriteria: p.evaluationCriteria,
        isActive: true,
        variantGroup: p.variantGroup,
      },
    })
  }

  console.log(`Seeded ${problemTemplates.length} problem templates`)
}

main()
  .catch((e) => {
    console.error("Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
