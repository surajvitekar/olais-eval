import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = await bcrypt.hash("Admin@olais123!", 12);
  const admin = await prisma.user.create({
    data: {
      email: "admin@olais.in",
      name: "Admin",
      passwordHash: hash,
      role: "ADMIN",
      status: "REGISTERED",
    },
  });
  console.log("Admin created:", admin.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
