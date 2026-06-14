import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$"
  let pw = ""
  for (let i = 0; i < 16; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return pw
}

async function main() {
  const email = "adwait@olais.in"
  const name = "Adwait"
  const password = "Adwait@" + Math.random().toString(36).slice(2, 10) + "Vitekar"

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role: "ADMIN",
    },
    create: {
      email,
      name,
      passwordHash,
      role: "ADMIN",
      status: "REGISTERED",
    },
  })

  console.log("---CREDENTIALS_BELOW---")
  console.log("EMAIL: " + email)
  console.log("PASS: " + password)
  console.log("URL: https://eval.vitekar.com/login")
  console.log("ROLE: " + user.role)
  console.log("---CREDENTIALS_ABOVE---")
}

main()
  .catch((e) => {
    console.error("Error:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
