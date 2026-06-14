import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const questions = await prisma.assessmentQuestion.findMany({
    orderBy: [{ category: "asc" }, { displayOrder: "asc" }]
  })

  console.log(`Total questions: ${questions.length}\n`)
  for (const q of questions) {
    console.log(`ID: ${q.id}`)
    console.log(`Category: ${q.category}`)
    console.log(`Type: ${q.questionType}`)
    console.log(`Order: ${q.displayOrder}`)
    console.log(`Weight: ${q.weight}`)
    console.log(`Text: ${q.questionText}`)
    console.log(`Options: ${JSON.stringify(q.options)}`)
    console.log("---")
  }
  await prisma.$disconnect()
}

main()
