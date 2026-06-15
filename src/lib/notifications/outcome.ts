import { prisma } from "@/lib/prisma"
import { sendNotification } from "@/lib/notifications/index"
import { logAudit } from "@/lib/audit"
import { renderOutcomeSelectedEmail } from "@/lib/email/templates/outcome-selected"
import { renderOutcomeRejectedEmail } from "@/lib/email/templates/outcome-rejected"

// ─── Types ────────────────────────────────────────────────────────────────────

export type OutcomeType = "SELECTED" | "REJECTED"

export interface OutcomeNotificationResult {
  sent: boolean
  channel: string
  error?: string
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

/**
 * Send an outcome notification (SELECTED or REJECTED) to a candidate.
 *
 * - Looks up user from DB to get their contact details.
 * - Renders the appropriate email template.
 * - Calls sendNotification() to dispatch via email (+ WhatsApp if phone available).
 * - Logs "notification.outcome.sent" to AuditLog.
 * - Returns { sent, channel } or { sent: false, error } if the user is not found.
 */
export async function sendOutcomeNotification(
  userId: string,
  outcome: OutcomeType,
  options?: { nextSteps?: string; feedback?: string; companyName?: string },
): Promise<OutcomeNotificationResult> {
  // ── Look up user ────────────────────────────────────────────────────────────
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone: true },
  })

  if (!user) {
    return { sent: false, channel: "none", error: "User not found" }
  }

  const candidateName = user.name || "Candidate"

  // ── Build notification content based on outcome ────────────────────────────
  let subject: string
  let html: string
  let body: string

  if (outcome === "SELECTED") {
    subject = "Congratulations — You've Been Selected"
    html = renderOutcomeSelectedEmail({
      candidateName,
      companyName: options?.companyName,
      nextSteps: options?.nextSteps,
    })
    const nextStepsText = options?.nextSteps
      ? ` Next steps: ${options.nextSteps}`
      : " Our team will be in touch soon with further details."
    body = `Congratulations, ${candidateName}! You have been selected.${nextStepsText}`
  } else {
    subject = "An Update on Your Application"
    html = renderOutcomeRejectedEmail({
      candidateName,
      companyName: options?.companyName,
      feedback: options?.feedback,
    })
    const feedbackText = options?.feedback ? ` Feedback: ${options.feedback}` : ""
    body = `Dear ${candidateName}, thank you for your time and effort. After careful consideration, we have decided to move forward with other candidates at this time.${feedbackText}`
  }

  // ── Send notification ───────────────────────────────────────────────────────
  const result = await sendNotification({
    userId: user.id,
    email: user.email,
    phone: user.phone ?? null,
    name: user.name,
    subject,
    body,
    html,
  })

  const sent = result.channel !== "none"

  // ── Audit log ───────────────────────────────────────────────────────────────
  await logAudit(
    "notification.outcome.sent",
    { userId, outcome, channel: result.channel },
    userId,
  )

  return { sent, channel: result.channel }
}
