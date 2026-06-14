import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import crypto from "crypto"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const RESEND_API_KEY = process.env.RESEND_API_KEY || "re_LW9pEYPb_2sh5wxHVEZLhhBEeesXeZK7A"
const FROM_EMAIL = "Olais Eval <hello@olais.in>"
const APP_URL = "https://eval.vitekar.com"

const candidate = { name: "Abhi Bodhekar", email: "abhi.bodhekar@gmail.com" }

function buildHtml(name: string | null, code: string, expiresAt: Date, regUrl: string): string {
  const greeting = name ? `Dear ${name},` : "Dear Candidate,"
  const expiryDate = expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
  
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" width="100%"><tr><td align="center" style="padding:48px 24px">
  <table role="presentation" style="max-width:520px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
  <tr><td style="height:6px;background:linear-gradient(90deg,#6366f1,#8b5cf6,#a78bfa)"></td></tr>
  <tr><td style="padding:40px 40px 0;text-align:center">
  <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#1a1a2e">You're Invited to Olais Eval</h1>
  <p style="margin:0;font-size:15px;line-height:1.6;color:#64748b">${greeting}</p>
  </td></tr>
  <tr><td style="padding:24px 40px 0">
  <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#475569">We are pleased to invite you to participate in the Olais evaluation process. This platform allows you to demonstrate your skills through a series of thoughtfully designed challenges.</p>
  <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#475569">Use the invite code below to create your account and get started.</p>
  </td></tr>
  <tr><td style="padding:0 40px">
  <table role="presentation" width="100%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px"><tr><td style="padding:20px 24px;text-align:center">
  <p style="margin:0 0 8px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#94a3b8">Your Invite Code</p>
  <p style="margin:0;font-family:'SF Mono','Fira Code',monospace;font-size:20px;font-weight:700;letter-spacing:3px;color:#4f46e5;word-break:break-all">${code}</p>
  </td></tr></table>
  </td></tr>
  <tr><td style="padding:28px 40px 0;text-align:center">
  <table role="presentation" style="display:inline-block"><tr><td style="border-radius:10px" bgcolor="#4f46e5">
  <a href="${regUrl}" target="_blank" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#fff;text-decoration:none;border-radius:10px;background:#4f46e5">Register Now</a>
  </td></tr></table>
  </td></tr>
  <tr><td style="padding:16px 40px 0;text-align:center">
  <p style="margin:0;font-size:13px;color:#94a3b8">Or copy this link: <span style="color:#6366f1;word-break:break-all">${regUrl}</span></p>
  </td></tr>
  <tr><td style="padding:24px 40px 0">
  <table role="presentation" width="100%" style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px"><tr><td style="padding:14px 18px">
  <p style="margin:0;font-size:13px;line-height:1.5;color:#92400e">⏳ This invite code will expire on <strong>${expiryDate}</strong>. Please register before the deadline.</p>
  </td></tr></table>
  </td></tr>
  <tr><td style="padding:32px 40px 0"><hr style="margin:0;border:none;border-top:1px solid #e2e8f0"/></td></tr>
  <tr><td style="padding:24px 40px 32px;text-align:center">
  <p style="margin:0 0 4px;font-size:13px;color:#94a3b8">Olais Eval — Skills Assessment Platform</p>
  <p style="margin:0;font-size:12px;color:#cbd5e1">If you did not expect this invitation, you can safely ignore this email.</p>
  </td></tr>
  </table></td></tr></table></body></html>`
}

function buildText(name: string | null, code: string, expiresAt: Date, regUrl: string): string {
  const greeting = name ? `Dear ${name},` : "Dear Candidate,"
  const expiryDate = expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
  return `${greeting}\n\nWe are pleased to invite you to participate in the Olais evaluation process.\n\nYour invite code: ${code}\n\nRegister here: ${regUrl}\n\n⏳ This invite code will expire on ${expiryDate}.\n\n—\nOlais Eval — Skills Assessment Platform`
}

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html, text }),
  })
  const data = await res.json()
  if (!res.ok) {
    console.error(`  Resend error: ${data.message || res.status}`)
    return false
  }
  return true
}

async function main() {
  // Find admin user
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } })
  if (!admin) {
    console.error("No admin user found!")
    process.exit(1)
  }
  console.log(`Admin: ${admin.name} (${admin.email})`)

  // Check if invite exists
  const existing = await prisma.invite.findFirst({
    where: { candidateEmail: candidate.email }
  })

  let code: string
  let inviteId: string
  let expiresAt: Date
  let shouldSend = false

  if (existing) {
    console.log(`Found existing invite for ${candidate.email}: ${existing.code}`)
    if (existing.sentAt) {
      console.log(`  Already sent at ${existing.sentAt} — skipping send`)
      console.log(`  Registration URL: ${APP_URL}/register?code=${existing.code}`)
      process.exit(0)
    }
    code = existing.code
    inviteId = existing.id
    expiresAt = existing.expiresAt
    shouldSend = true
    console.log(`  Unsent — will send now`)
  } else {
    code = crypto.randomUUID()
    expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)
    
    const invite = await prisma.invite.create({
      data: {
        code,
        candidateName: candidate.name,
        candidateEmail: candidate.email,
        maxUses: 1,
        expiresAt,
        createdBy: admin.id,
      }
    })
    inviteId = invite.id
    shouldSend = true
    console.log(`Created invite for ${candidate.email} → ${code}`)
  }

  if (shouldSend) {
    const regUrl = `${APP_URL}/register?code=${code}`
    const subject = `You're Invited to Olais Eval, ${candidate.name}`
    const html = buildHtml(candidate.name, code, expiresAt, regUrl)
    const text = buildText(candidate.name, code, expiresAt, regUrl)

    console.log(`Sending email to ${candidate.email}...`)
    const ok = await sendEmail(candidate.email, subject, html, text)
    if (ok) {
      await prisma.invite.update({ where: { id: inviteId }, data: { sentAt: new Date() } })
      console.log(`Email sent successfully ✅`)
    } else {
      console.log(`Email sending failed ❌`)
    }
  }
}

main()
  .catch(e => { console.error("FATAL:", e); process.exit(1) })
  .finally(() => prisma.$disconnect())
