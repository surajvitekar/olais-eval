// Admin creation script
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('./src/generated/prisma/client.js');
const bcrypt = require('bcryptjs');

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  
  const hash = await bcrypt.hash('Admin@olais123!', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@olais.in',
      name: 'Admin',
      passwordHash: hash,
      role: 'ADMIN',
      status: 'REGISTERED',
    },
  });
  console.log('Admin created:', admin.email);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
