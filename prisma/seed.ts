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

async function main() {
  console.log("Seeding assessment questions...")

  // Clear existing questions
  await prisma.assessmentQuestion.deleteMany()

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
}

main()
  .catch((e) => {
    console.error("Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
