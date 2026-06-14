import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import crypto from "crypto"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// Student data from the Excel (deduplicated by email)
const students = [
  { name: "Sanket Vitthal Magar", email: "sanketmagar2007@gmail.com" },
  { name: "Vaishnavi bandu katkade", email: "vaishnvikatkade690@gmail.com" },
  { name: "Siddhesh Shailesh Rathod", email: "siddheshrathod2008@gmail.com" },
  { name: "Anmol Kiran Jain", email: "anmoljain7722@gmail.com" },
  { name: "Aniket Sukhadev Devkar", email: "aniketdevkar205@gmail.com" },
  { name: "Amruta Vikas Chavan", email: "amrutavc19@gmail.com" },
  { name: "Shreya lakare", email: "shreyalakare20@gmail.com" },
  { name: "Jayesh", email: "jayeshkathale24@gmail.com" },
  { name: "Aditya Anande", email: "adityaanande126@gmail.com" },
  { name: "Vivek Devidas Bagul", email: "vivekbagul1587@gmail.com" },
  { name: "Janhvi sachin kamode", email: "kamodejanhvi@gmail.com" },
  { name: "Renuka Sanjay Kathar", email: "renukakathar70@gmail.com" },
  { name: "Atharva bodhekar", email: "atharvabodhekar@gmail.com" },
  { name: "Om Ratnakar Kshirsagar", email: "orkshirsagar11@gmail.com" },
  { name: "Sayali siddheshwar Surwase", email: "sayalisurwase2@gmail.com" },
  { name: "Aditya Narayan Jadhav", email: "adityajadhav1680@gmail.com" },
  { name: "Sharayu Sunil Thokal", email: "Sharayuthokal2811@gmail.com" },
  { name: "Yash Radhakisan Dagadghate", email: "yashdagadghate12@gmail.com" },
  { name: "Umesh ravindra kharge", email: "Khargeumesh97@gmail.com" },
  { name: "Shital Vishnubhagwan Tijare", email: "shitaltijare1028@gmail.com" },
  { name: "Pranav narayan Dangat", email: "pranav.n.dangat@gmail.com" },
  { name: "Prajakta sandip chavan", email: "chavanprajakta493@gmail.com" },
  { name: "Mukta Santosh Wankhede", email: "wankhedemukta53@gmail.com" },
  { name: "Harshal Sunil Bhoyalkar", email: "harshalbhoyalkar@gmail.com" },
  { name: "Aditya Dnyandev Nikam", email: "nikamaditya668@gmail.com" },
  { name: "Gayatri kulkarni", email: "gayatrikulkarni2006@gmail.com" },
  { name: "Prasit Sandeep Bankar", email: "bankarprasit7625gmail.com" },
  { name: "Tanvi Sunil pawar", email: "tp1852255@gmail.com" },
  { name: "Nikita sominath Bhutekar", email: "nikitabhutekar7@gmail.com" },
  { name: "Priyanka Anil Wahul", email: "priyankawahul345@gmail.com" },
  { name: "Sakshi Dhule", email: "sakshidhule4@gmail.com" },
  { name: "Radhika Govindrao Bhosle", email: "bhosleradhika120@gmail.com" },
  { name: "Shruti sambhaji kumthekar", email: "shrutikumthekar098@gmail.com" },
  { name: "Kunal Balu Dhayde", email: "kunaldhayde07@gmail.com" },
  { name: "Vaishnavi Sachin Deshmukh", email: "vaishnavideshmukh0074@gmail.com" },
  { name: "Ajinkya Sanjay Pathrikar", email: "ajinkyapathrikar28@gmail.com" },
  { name: "Rameshwar Santosh Jadhav", email: "jadhavram1107@gmail.com" },
  { name: "Nandini Umeshsing Hajari", email: "nandinihajari@email.com" },
  { name: "Divya shridhar Pujari", email: "divyapujari14102006@gmail.com" },
  { name: "Anushka Raghunath Fulzele", email: "afulzele106@gmail.com" },
]

// Fix: Prasit's email is missing the @ symbol
const studentsFixed = students.map(s => ({
  ...s,
  email: s.email === "bankarprasit7625gmail.com" ? "bankarprasit7625@gmail.com" : s.email
}))

function generateCode(): string {
  return crypto.randomUUID()
}

async function main() {
  // Find admin user (Adwait) to set as creator
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } })
  if (!admin) {
    console.error("No admin user found!")
    process.exit(1)
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30) // 30 days validity

  let created = 0
  let skipped = 0

  for (const student of studentsFixed) {
    // Check if invite already exists for this email
    const existing = await prisma.invite.findFirst({
      where: { candidateEmail: student.email }
    })
    if (existing) {
      console.log(`⚠ SKIP ${student.email} — invite already exists (${existing.code})`)
      skipped++
      continue
    }

    const invite = await prisma.invite.create({
      data: {
        code: generateCode(),
        candidateName: student.name,
        candidateEmail: student.email,
        maxUses: 1,
        expiresAt,
        createdBy: admin.id,
      }
    })
    console.log(`✅ ${student.email} → ${invite.code}`)
    created++
  }

  console.log(`\n=== SUMMARY ===`)
  console.log(`Created: ${created}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Total:   ${studentsFixed.length}`)
  console.log(`\nInvite URL format: https://eval.vitekar.com/register?code=INVITE_CODE`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
