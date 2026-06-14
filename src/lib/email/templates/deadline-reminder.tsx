import { APP_URL, FROM_NAME } from "../send"

interface DeadlineReminderTemplateProps {
  candidateName: string
  problemTitle: string
  deadline: Date
  daysRemaining: number
  dashboardUrl?: string
}

export function renderDeadlineReminderHtml(
  props: DeadlineReminderTemplateProps
): string {
  const { candidateName, problemTitle, deadline, daysRemaining, dashboardUrl } =
    props
  const deadlineDate = deadline.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const url = dashboardUrl || `${APP_URL}/dashboard`

  const urgencyColor = daysRemaining <= 1 ? "#dc2626" : "#92400e"
  const urgencyBg = daysRemaining <= 1 ? "#fef2f2" : "#fffbeb"
  const urgencyBorder = daysRemaining <= 1 ? "#fca5a5" : "#fde68a"

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Deadline Reminder — ${FROM_NAME}</title>
</head>
<body style="
  margin: 0;
  padding: 0;
  background-color: #f4f5f7;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; min-width: 100%;">
    <tr>
      <td align="center" style="padding: 48px 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="
          max-width: 520px;
          width: 100%;
          background-color: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
        ">
          <tr>
            <td style="
              height: 6px;
              background: linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa);
            "></td>
          </tr>
          <tr>
            <td style="padding: 40px 40px 0 40px; text-align: center;">
              <div style="
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 56px;
                height: 56px;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                border-radius: 14px;
                margin-bottom: 20px;
              ">
                <span style="
                  font-size: 24px;
                  font-weight: 700;
                  color: #ffffff;
                  letter-spacing: -0.5px;
                ">O</span>
              </div>
              <h1 style="
                margin: 0 0 8px 0;
                font-size: 24px;
                font-weight: 700;
                color: #1a1a2e;
                letter-spacing: -0.3px;
              ">Deadline Reminder</h1>
              <p style="
                margin: 0;
                font-size: 15px;
                line-height: 1.6;
                color: #64748b;
              ">
                Dear ${candidateName},
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px 0 40px;">
              <p style="
                margin: 0 0 20px 0;
                font-size: 15px;
                line-height: 1.7;
                color: #475569;
              ">
                This is a reminder that your assessment on ${FROM_NAME} is due soon.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" style="
                width: 100%;
                background-color: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                margin-bottom: 20px;
              ">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="
                      margin: 0 0 4px 0;
                      font-size: 12px;
                      font-weight: 600;
                      text-transform: uppercase;
                      letter-spacing: 1px;
                      color: #94a3b8;
                    ">Problem</p>
                    <p style="
                      margin: 0;
                      font-size: 16px;
                      font-weight: 600;
                      color: #1a1a2e;
                    ">${problemTitle}</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" style="
                width: 100%;
                background-color: ${urgencyBg};
                border: 1px solid ${urgencyBorder};
                border-radius: 10px;
                margin-bottom: 20px;
              ">
                <tr>
                  <td style="padding: 14px 18px;">
                    <p style="
                      margin: 0;
                      font-size: 13px;
                      line-height: 1.5;
                      color: ${urgencyColor};
                    ">
                      ${daysRemaining <= 0 ? "🚨 This assessment was due on" : "⏳"} <strong>${deadlineDate}</strong>.
                      ${daysRemaining > 0
                        ? `You have ${daysRemaining} day${daysRemaining > 1 ? "s" : ""} remaining.`
                        : "Please submit as soon as possible."}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px; text-align: center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="display: inline-block;">
                <tr>
                  <td style="border-radius: 10px;" bgcolor="#4f46e5">
                    <a href="${url}" target="_blank" style="
                      display: inline-block;
                      padding: 14px 36px;
                      font-size: 15px;
                      font-weight: 600;
                      color: #ffffff;
                      text-decoration: none;
                      border-radius: 10px;
                      background-color: #4f46e5;
                    ">Submit Now</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <hr style="
                margin: 0 0 24px 0;
                border: none;
                border-top: 1px solid #e2e8f0;
              " />
              <p style="
                margin: 0;
                font-size: 13px;
                color: #94a3b8;
                text-align: center;
              ">
                ${FROM_NAME} &mdash; Skills Assessment Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function renderDeadlineReminderText(
  props: DeadlineReminderTemplateProps
): string {
  const { candidateName, problemTitle, deadline, daysRemaining, dashboardUrl } =
    props
  const deadlineDate = deadline.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const url = dashboardUrl || `${APP_URL}/dashboard`

  const urgencyPrefix = daysRemaining <= 0 ? "🚨 OVERDUE" : "⏳ Reminder"

  return `${urgencyPrefix} — Dear ${candidateName},

This is a reminder that your assessment on ${FROM_NAME} is due soon.

Problem: ${problemTitle}

Deadline: ${deadlineDate}
${daysRemaining > 0 ? `Days remaining: ${daysRemaining}` : "This assessment is overdue. Please submit as soon as possible."}

Submit here: ${url}

—
${FROM_NAME} — Skills Assessment Platform`
}
