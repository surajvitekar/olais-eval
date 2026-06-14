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
  const password = generatePassword()

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`User ${email} already exists (role: ${existing.role})`)
    console.log("Skipping creation. Use existing credentials.")
    process.exit(0)
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: "ADMIN",
      status: "REGISTERED",
    },
  })

  console.log(`\n✅ Admin user created!`)
  console.log(`   Name:     ${name}`)
  console.log(`   Email:    ${email}`)
  console.log(`   Password: ${password}`)
  console.log(`   Role:     ${user.role}`)
  console.log(`   URL:      https://eval.vitekar.com/login`)
}

main()
  .catch((e) => {
    console.error("Error:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
