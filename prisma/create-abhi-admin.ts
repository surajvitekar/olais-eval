import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const email = "abhi@olais.in"
  const name = "Abhi"
  const password = "abhi5899"

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`User ${email} already exists (role: ${existing.role})`)
    console.log("Updating password and setting role to ADMIN...")
    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.user.update({
      where: { email },
      data: { role: "ADMIN", passwordHash, name: name },
    })
    console.log("Updated successfully!")
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

  console.log(`Admin user created!`)
  console.log(`Name:     ${name}`)
  console.log(`Email:    ${email}`)
  console.log(`Role:     ${user.role}`)
  console.log(`URL:      https://eval.vitekar.com/login`)
}

main()
  .catch((e) => {
    console.error("Error:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
