import { Resend } from "resend"

// ─── Configuration ──────────────────────────────────────────────────────────

export const FROM_EMAIL = "hello@olais.in"
export const FROM_NAME = "Olais Eval"
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://eval.olais.in"

// ─── Initialization ─────────────────────────────────────────────────────────

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not configured. Set it in your environment variables."
    )
  }
  return new Resend(apiKey)
}

// ─── Send Function with Fallback ────────────────────────────────────────────

export interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export interface SendEmailResult {
  success: boolean
  id?: string
  provider: "resend" | "log"
  error?: string
}

/**
 * Send an email via Resend. Falls back to console logging if:
 * - RESEND_API_KEY is missing
 * - The API call fails
 * This ensures no email is silently lost in development.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { to, subject, html, text } = params
  const recipients = Array.isArray(to) ? to : [to]

  // ── Try sending via Resend ──────────────────────────────────────────────
  const apiKey = process.env.RESEND_API_KEY
  if (apiKey) {
    try {
      const resend = getResend()
      const { data, error } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: recipients,
        subject,
        html,
        text,
      })

      if (error) {
        console.error("[Email] Resend API error:", error)
        // Fall through to log fallback
      } else {
        console.log(`[Email] Sent via Resend: id=${data?.id}, to=${recipients.join(",")}, subject="${subject}"`)
        return { success: true, id: data?.id, provider: "resend" }
      }
    } catch (err) {
      console.error("[Email] Resend send exception:", err)
      // Fall through to log fallback
    }
  } else {
    console.warn("[Email] RESEND_API_KEY not configured — falling back to log")
  }

  // ── Fallback: log to console ─────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════")
  console.log(`📧 [EMAIL FALLBACK] To: ${recipients.join(", ")}`)
  console.log(`📧 Subject: ${subject}`)
  console.log(`📧 Body (text): ${text || html.replace(/<[^>]*>/g, "").substring(0, 500)}...`)
  console.log("═══════════════════════════════════════════════")

  return {
    success: true,
    provider: "log",
  }
}

// ─── Template-based Senders ─────────────────────────────────────────────────

export async function sendTemplatedEmail(
  templateName: string,
  params: {
    to: string | string[]
    subject: string
    html: string
    text?: string
  }
): Promise<SendEmailResult> {
  console.log(`[Email] Sending template "${templateName}" to ${Array.isArray(params.to) ? params.to.join(", ") : params.to}`)
  return sendEmail({
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  })
}
