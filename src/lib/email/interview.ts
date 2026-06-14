/**
 * ─── Interview Email Service ─────────────────────────────────────────────────
 * Builds and sends interview-related emails using the existing email infrastructure.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { sendEmail, FROM_EMAIL, FROM_NAME, APP_URL } from "./send"

// ── Types ───────────────────────────────────────────────────────────────────

export interface InterviewEmailInfo {
  candidateName: string | null
  candidateEmail: string
  evaluatorName: string | null
  scheduledAt: Date
  duration: number
  timezone: string
  meetingLink: string | null
  notes: string | null
  interviewId: string
}

// ── Template Builders ───────────────────────────────────────────────────────

function formatDateTime(date: Date, tz: string): string {
  return date.toLocaleString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
    timeZoneName: "short",
  })
}

function buildBaseHtml(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="border-bottom: 2px solid #10b981; padding-bottom: 16px; margin-bottom: 24px;">
    <h1 style="color: #10b981; margin: 0; font-size: 24px;">Olais Eval</h1>
  </div>
  ${content}
  <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 24px; font-size: 12px; color: #9ca3af;">
    <p>Olais Eval — AI-Assisted Engineering Assessment</p>
    <p><a href="${APP_URL}" style="color: #10b981;">${APP_URL}</a></p>
  </div>
</body>
</html>`
}

function buildInterviewDetails(info: InterviewEmailInfo): string {
  const dateTime = formatDateTime(info.scheduledAt, info.timezone)
  const meetingHtml = info.meetingLink
    ? `<p style="margin: 4px 0;"><strong>Meeting Link:</strong> <a href="${info.meetingLink}" style="color: #10b981;">${info.meetingLink}</a></p>`
    : ""
  const notesHtml = info.notes
    ? `<p style="margin: 4px 0;"><strong>Notes:</strong> ${info.notes}</p>`
    : ""

  return `
    <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 4px 0;"><strong>Date & Time:</strong> ${dateTime}</p>
      <p style="margin: 4px 0;"><strong>Duration:</strong> ${info.duration} minutes</p>
      <p style="margin: 4px 0;"><strong>Timezone:</strong> ${info.timezone}</p>
      <p style="margin: 4px 0;"><strong>Interviewer:</strong> ${info.evaluatorName || "To be assigned"}</p>
      ${meetingHtml}
      ${notesHtml}
    </div>`
}

// ── Email Builders ──────────────────────────────────────────────────────────

export function buildInterviewScheduledCandidateEmail(info: InterviewEmailInfo): { subject: string; html: string } {
  const greeting = info.candidateName ? `Hi ${info.candidateName},` : "Hi there,"
  return {
    subject: `Interview Scheduled — Olais Eval`,
    html: buildBaseHtml(`
      <h2 style="color: #111; margin: 0 0 8px;">Interview Scheduled</h2>
      <p>${greeting}</p>
      <p>Your interview has been scheduled. Here are the details:</p>
      ${buildInterviewDetails(info)}
      <p style="margin-top: 16px;">
        Please ensure you have a stable internet connection and a quiet environment for the interview.
      </p>
    `),
  }
}

export function buildInterviewScheduledEvaluatorEmail(
  info: InterviewEmailInfo
): { subject: string; html: string } {
  return {
    subject: `Interview Assignment — ${info.candidateName || "Candidate"}`,
    html: buildBaseHtml(`
      <h2 style="color: #111; margin: 0 0 8px;">Interview Assigned</h2>
      <p>Hi ${info.evaluatorName || "Evaluator"},</p>
      <p>You have been assigned to conduct an interview with <strong>${info.candidateName || "a candidate"}</strong>.</p>
      ${buildInterviewDetails(info)}
      <p style="margin-top: 16px;">
        <a href="${APP_URL}/admin/interviews/${info.interviewId}"
           style="display: inline-block; background: #10b981; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">
          View Interview Details
        </a>
      </p>
    `),
  }
}

export function buildInterviewReminderEmail(
  info: InterviewEmailInfo,
  hoursBefore: number
): { subject: string; html: string } {
  const greeting = info.candidateName ? `Hi ${info.candidateName},` : "Hi there,"
  const timeLabel = hoursBefore >= 24 ? "24 hours" : "1 hour"
  return {
    subject: `Reminder: Interview in ${timeLabel} — Olais Eval`,
    html: buildBaseHtml(`
      <h2 style="color: #111; margin: 0 0 8px;">Interview Reminder</h2>
      <p>${greeting}</p>
      <p>This is a <strong>${timeLabel}</strong> reminder about your upcoming interview.</p>
      ${buildInterviewDetails(info)}
      ${info.meetingLink ? `<p style="margin-top: 16px;"><a href="${info.meetingLink}" style="display: inline-block; background: #10b981; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">Join Interview</a></p>` : ""}
    `),
  }
}

export function buildInterviewScorePublishedEmail(
  candidateName: string | null,
  candidateEmail: string
): { subject: string; html: string } {
  const greeting = candidateName ? `Hi ${candidateName},` : "Hi there,"
  return {
    subject: `Interview Results Available — Olais Eval`,
    html: buildBaseHtml(`
      <h2 style="color: #111; margin: 0 0 8px;">Interview Results</h2>
      <p>${greeting}</p>
      <p>Your interview has been evaluated. You can view the results in your dashboard.</p>
      <p style="margin-top: 16px;">
        <a href="${APP_URL}/interviews"
           style="display: inline-block; background: #10b981; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">
          View Results
        </a>
      </p>
    `),
  }
}

export function buildInterviewCancellationEmail(
  candidateName: string | null,
  candidateEmail: string,
  reason: string | null
): { subject: string; html: string } {
  const greeting = candidateName ? `Hi ${candidateName},` : "Hi there,"
  const reasonHtml = reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""
  return {
    subject: `Interview Cancelled — Olais Eval`,
    html: buildBaseHtml(`
      <h2 style="color: #111; margin: 0 0 8px;">Interview Cancelled</h2>
      <p>${greeting}</p>
      <p>Your scheduled interview has been cancelled.</p>
      ${reasonHtml}
      <p>You will be notified if it is rescheduled.</p>
    `),
  }
}

// ── Send Functions ──────────────────────────────────────────────────────────

export async function sendInterviewScheduledEmail(
  info: InterviewEmailInfo,
  evaluatorEmail?: string
): Promise<void> {
  const { subject, html } = buildInterviewScheduledCandidateEmail(info)
  await sendEmail({ to: info.candidateEmail, subject, html })

  // Also notify the evaluator if we have their email
  if (evaluatorEmail) {
    const evalEmail = buildInterviewScheduledEvaluatorEmail(info)
    await sendEmail({ to: evaluatorEmail, subject: evalEmail.subject, html: evalEmail.html })
  }
}

export async function sendInterviewReminder(info: InterviewEmailInfo, hoursBefore: number): Promise<void> {
  const { subject, html } = buildInterviewReminderEmail(info, hoursBefore)
  await sendEmail({ to: info.candidateEmail, subject, html })
}

export async function sendScorePublishedNotification(
  candidateName: string | null,
  candidateEmail: string
): Promise<void> {
  const { subject, html } = buildInterviewScorePublishedEmail(candidateName, candidateEmail)
  await sendEmail({ to: candidateEmail, subject, html })
}

export async function sendInterviewCancellation(
  candidateEmail: string,
  candidateName: string | null,
  reason: string | null
): Promise<void> {
  const { subject, html } = buildInterviewCancellationEmail(candidateName, candidateEmail, reason)
  await sendEmail({ to: candidateEmail, subject, html })
}
