import { sendWhatsApp, type WhatsAppResult } from "./whatsapp"
import { sendEmail } from "@/lib/email/send"
import { logAudit } from "@/lib/audit"

export interface NotificationPayload {
  userId: string
  phone?: string | null
  email: string
  name?: string | null
  subject: string   // Used for email
  body: string      // Used for both WhatsApp and email (plain text)
  html?: string     // Used for email if provided, else wraps body in <p>
}

export interface NotificationResult {
  whatsapp?: WhatsAppResult
  email?: { success: boolean; id?: string; error?: string }
  channel: "whatsapp" | "email" | "both" | "none"
}

/**
 * Send a notification via WhatsApp (additive, when phone available) and email (always).
 * Logs the outcome to AuditLog as "notification.sent".
 */
export async function sendNotification(
  payload: NotificationPayload,
): Promise<NotificationResult> {
  const result: NotificationResult = { channel: "none" }

  // ── WhatsApp (additive — only when phone is available) ────────────────────
  if (payload.phone) {
    const waResult = await sendWhatsApp({ phone: payload.phone, body: payload.body })
    result.whatsapp = waResult
  }

  // ── Email (always sent — delivery guarantee) ──────────────────────────────
  const emailHtml = payload.html ?? `<p>${payload.body}</p>`
  const emailResult = await sendEmail({
    to: payload.email,
    subject: payload.subject,
    html: emailHtml,
    text: payload.body,
  })
  result.email = {
    success: emailResult.success,
    id: emailResult.id,
    error: emailResult.error,
  }

  // ── Determine channel ─────────────────────────────────────────────────────
  const waOk = result.whatsapp?.success === true
  const emailOk = result.email.success

  if (waOk && emailOk) {
    result.channel = "both"
  } else if (waOk) {
    result.channel = "whatsapp"
  } else if (emailOk) {
    result.channel = "email"
  } else {
    result.channel = "none"
  }

  // ── Audit log ─────────────────────────────────────────────────────────────
  await logAudit(
    "notification.sent",
    {
      channel: result.channel,
      email: payload.email,
      phone: payload.phone ?? null,
      subject: payload.subject,
      whatsappSuccess: result.whatsapp?.success ?? null,
      whatsappMessageId: result.whatsapp?.messageId ?? null,
      emailSuccess: result.email.success,
      emailId: result.email.id ?? null,
    },
    payload.userId,
  )

  return result
}
