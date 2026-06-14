import { PrismaClient } from "/app/src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Resend } from "resend"

const connectionString = process.env.DATABASE_URL || "postgresql://olais:olais_dev_pass@db:5432/olais_eval"
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const RESEND_API_KEY = process.env.RESEND_API_KEY || "re_LW9pEYPb_2sh5wxHVEZLhhBEeesXeZK7A"
const resend = new Resend(RESEND_API_KEY)

const FROM_EMAIL = "hello@olais.in"
const FROM_NAME = "Olais Eval"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://eval.olais.in"

function buildHtml(name: string | null, code: string, regUrl: string): string {
  const greeting = name ? `Dear ${name},` : "Dear Candidate,"
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>You're Invited to Olais Eval</title></head><body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;min-width:100%;"><tr><td align="center" style="padding:48px 24px;"><table role="presentation" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04);"><tr><td style="height:6px;background:linear-gradient(90deg,#6366f1,#8b5cf6,#a78bfa);"></td></tr><tr><td style="padding:40px 40px 0 40px;text-align:center;"><h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:#1a1a2e;letter-spacing:-0.3px;">You're Invited to Olais Eval</h1><p style="margin:0;font-size:15px;line-height:1.6;color:#64748b;">${greeting}</p></td></tr><tr><td style="padding:24px 40px 0 40px;"><p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#475569;">We are pleased to invite you to participate in the Olais evaluation process.</p><p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#475569;">Use the invite code below to create your account and get started.</p></td></tr><tr><td style="padding:0 40px;"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;"><tr><td style="padding:20px 24px;text-align:center;"><p style="margin:0 0 8px 0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">Your Invite Code</p><p style="margin:0;font-family:'SF Mono','Fira Code','Fira Mono',Menlo,Consolas,monospace;font-size:20px;font-weight:700;letter-spacing:3px;color:#4f46e5;word-break:break-all;">${code}</p></td></tr></table></td></tr><tr><td style="padding:28px 40px 0 40px;text-align:center;"><a href="${regUrl}" target="_blank" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;background-color:#4f46e5;">Register Now</a></td></tr></table></td></tr></table></body></html>`
}

function buildText(name: string | null, code: string, regUrl: string): string {
  const greeting = name ? `Dear ${name},` : "Dear Candidate,"
  return `${greeting}\n\nWe are pleased to invite you to participate in the Olais evaluation process.\n\nYour invite code: ${code}\n\nRegister here: ${regUrl}\n\n—\nOlais Eval — Skills Assessment Platform`
}

async function main() {
  const invites = await prisma.invite.findMany({
    where: { candidateEmail: { not: null }, sentAt: null, usedCount: 0 },
    orderBy: { createdAt: "asc" },
  })

  console.log(`Found ${invites.length} unsent invites\n`)

  let sent = 0
  let failed = 0

  for (const invite of invites) {
    const regUrl = `${APP_URL}/register?code=${invite.code}`
    const name = invite.candidateName
    const email = invite.candidateEmail!

    const subject = name ? `You're Invited to Olais Eval, ${name}` : "You're Invited to Olais Eval"
    const html = buildHtml(name, invite.code, regUrl)
    const text = buildText(name, invite.code, regUrl)

    process.stdout.write(`📧 ${email}... `)

    try {
      const { data, error } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [email],
        subject,
        html,
        text,
      })

      if (error) {
        console.log(`❌ ${error.message}`)
        failed++
      } else {
        await prisma.invite.update({ where: { id: invite.id }, data: { sentAt: new Date() } })
        console.log(`✅ sent`)
        sent++
      }
    } catch (err) {
      console.log(`❌ ${err instanceof Error ? err.message : err}`)
      failed++
    }

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 600))
  }

  console.log(`\n=== SUMMARY ===`)
  console.log(`Sent:   ${sent}`)
  console.log(`Failed: ${failed}`)
  console.log(`Total:  ${invites.length}`)
}

main()
  .catch(e => { console.error("FATAL:", e); process.exit(1) })
  .finally(() => prisma.$disconnect())
