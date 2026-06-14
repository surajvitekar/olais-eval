import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const invites = await prisma.invite.findMany({
    where: { candidateEmail: { not: null } },
    orderBy: { createdAt: "asc" }
  })

  for (const i of invites) {
    const hasAt = i.candidateEmail!.includes("@")
    const validDomain = i.candidateEmail!.endsWith(".com") || i.candidateEmail!.endsWith(".in") || i.candidateEmail!.endsWith(".org")
    const sent = i.sentAt ? "✅" : "❌"
    const flag = (!hasAt || !validDomain) ? " ⚠️ BAD EMAIL" : ""
    console.log(`${sent} ${i.candidateEmail} | ${i.candidateName}${flag}`)
  }

  await prisma.$disconnect()
}

main()
