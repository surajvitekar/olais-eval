import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function update(id: string, data: Record<string, any>) {
  await prisma.assessmentQuestion.update({ where: { id }, data })
  console.log(`✅ Updated ${id}`)
}

async function main() {
  // ─── 1. WIDEN 2 AI/ML QUESTIONS ─────────────────────────────────
  // Q9: AI_USAGE — from advanced tooling list to general AI awareness
  await update("cmpnnyham0008qypd69nnlskd", {
    questionText: "Which AI tools or assistants have you used in your workflow?",
    options: {
      tools: [
        "ChatGPT / OpenAI",
        "GitHub Copilot",
        "Google Gemini",
        "Claude by Anthropic",
        "Microsoft Copilot",
        "Perplexity AI",
        "AI code assistants (Cursor, Codeium, etc.)",
        "I haven't used any AI tools yet"
      ]
    }
  })

  // Q10: SELF_RATING — from "integrating AI/ML APIs" to general AI familiarity
  await update("cmpnnyhax0009qypd8ox14exs", {
    questionText: "Rate your familiarity with using AI tools for coding and problem-solving",
    options: { max: 10, min: 1, labels: { low: "Just getting started", high: "I use AI daily" } }
  })

  // ─── 2. SIMPLIFY 3 PROJECT FAMILIARITY QUESTIONS ────────────────
  // Q6: BACKEND PROJECT_FAMILIARITY — simplified
  await update("cmpnnyh9o0005qypdscdwrsxq", {
    questionText: "Have you built a backend API before?",
    options: { values: ["yes", "no", "maybe"] }
  })

  // Q13: API PROJECT_FAMILIARITY — simplified
  await update("cmpnnyhbu000cqypdb83oo5me", {
    questionText: "Have you created or consumed APIs in a project?",
    options: { values: ["yes", "no", "maybe"] }
  })

  // Q16: DATABASE PROJECT_FAMILIARITY — simplified
  await update("cmpnnyhcr000fqypduaocpl7f", {
    questionText: "Have you worked with databases in any project?",
    options: { values: ["yes", "no", "maybe"] }
  })

  // ─── 3. REPLACE 2 SYSTEM DESIGN → WEB LITERACY ─────────────────
  // Q19: SYSTEM_DESIGN SELF_RATING → web literacy self-rating
  await update("cmpnnyhdo000iqypdno5gpjon", {
    category: "SYSTEM_DESIGN",
    questionText: "Rate your understanding of how websites and web applications work",
    options: { max: 10, min: 1, labels: { low: "Beginner", high: "Very comfortable" } }
  })

  // Q20: SYSTEM_DESIGN MULTIPLE_CHOICE → web literacy MCQ
  await update("cmpnnyhdz000jqypd78fnsvao", {
    category: "SYSTEM_DESIGN",
    questionText: "What best describes your experience with the web?",
    options: {
      choices: [
        "I browse the web and use online tools",
        "I can create simple web pages with HTML/CSS",
        "I've built websites or web apps with frameworks",
        "I understand how the internet, servers, and browsers work",
        "I've deployed and managed web applications"
      ]
    }
  })

  console.log("\nAll 7 updates applied successfully!")
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
