import { APP_URL, FROM_NAME } from "../send"

export function renderOutcomeRejectedEmail(data: {
  candidateName: string
  companyName?: string
  feedback?: string
}): string {
  const { candidateName, companyName, feedback } = data
  const org = companyName || FROM_NAME

  const feedbackContent = feedback
    ? `<div style="
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 16px 20px;
        margin: 16px 0;
      ">
        <p style="
          margin: 0 0 6px 0;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #94a3b8;
        ">Feedback</p>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #475569;">${feedback}</p>
      </div>`
    : ""

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>An Update on Your Application — ${org}</title>
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
              ">An Update on Your Application</h1>
              <p style="
                margin: 0;
                font-size: 15px;
                line-height: 1.6;
                color: #64748b;
              ">
                From <strong>${org}</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px 0 40px;">
              <p style="
                margin: 0 0 16px 0;
                font-size: 15px;
                line-height: 1.7;
                color: #475569;
              ">
                Dear ${candidateName},
              </p>
              <p style="
                margin: 0 0 16px 0;
                font-size: 15px;
                line-height: 1.7;
                color: #475569;
              ">
                Thank you sincerely for the time and effort you invested in the ${org} evaluation process. We genuinely appreciate your participation and the quality of your work.
              </p>
              <p style="
                margin: 0 0 16px 0;
                font-size: 15px;
                line-height: 1.7;
                color: #475569;
              ">
                After careful consideration, we have decided to move forward with other candidates at this time. This was a difficult decision, as we had many strong applicants.
              </p>
              ${feedbackContent}
              <p style="
                margin: 0 0 16px 0;
                font-size: 15px;
                line-height: 1.7;
                color: #475569;
              ">
                We encourage you to keep developing your skills and wish you the very best in your career. Future opportunities may arise, and we hope to see you again.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 40px 0 40px;">
              <hr style="
                margin: 0;
                border: none;
                border-top: 1px solid #e2e8f0;
              " />
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px 32px 40px; text-align: center;">
              <p style="
                margin: 0 0 4px 0;
                font-size: 13px;
                color: #94a3b8;
              ">
                ${FROM_NAME} &mdash; Skills Assessment Platform
              </p>
              <p style="
                margin: 0;
                font-size: 12px;
                color: #cbd5e1;
              ">
                <a href="${APP_URL}" style="color: #6366f1;">${APP_URL}</a>
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
