import { APP_URL, FROM_NAME } from "../send"

export function renderOutcomeSelectedEmail(data: {
  candidateName: string
  companyName?: string
  nextSteps?: string
}): string {
  const { candidateName, companyName, nextSteps } = data
  const org = companyName || FROM_NAME

  const nextStepsContent = nextSteps
    ? `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.7; color: #475569;">
        <strong>Next Steps:</strong> ${nextSteps}
      </p>`
    : `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.7; color: #475569;">
        Our team will be in touch soon with further details about the next steps. Please check your email regularly.
      </p>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Congratulations from ${org}</title>
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
              background: linear-gradient(90deg, #10b981, #059669, #34d399);
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
                background: linear-gradient(135deg, #10b981, #059669);
                border-radius: 14px;
                margin-bottom: 20px;
              ">
                <span style="
                  font-size: 28px;
                ">&#10003;</span>
              </div>
              <h1 style="
                margin: 0 0 8px 0;
                font-size: 24px;
                font-weight: 700;
                color: #1a1a2e;
                letter-spacing: -0.3px;
              ">Congratulations, ${candidateName}!</h1>
              <p style="
                margin: 0;
                font-size: 15px;
                line-height: 1.6;
                color: #64748b;
              ">
                You have been selected by <strong>${org}</strong>.
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
                We are delighted to inform you that you have been selected following your evaluation on the ${org} platform. Your performance stood out, and we look forward to working with you.
              </p>
              ${nextStepsContent}
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 40px 0 40px; text-align: center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="display: inline-block;">
                <tr>
                  <td style="border-radius: 10px;" bgcolor="#10b981">
                    <a href="${APP_URL}" target="_blank" style="
                      display: inline-block;
                      padding: 14px 36px;
                      font-size: 15px;
                      font-weight: 600;
                      color: #ffffff;
                      text-decoration: none;
                      border-radius: 10px;
                      background-color: #10b981;
                    ">Visit Your Dashboard</a>
                  </td>
                </tr>
              </table>
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
                <a href="${APP_URL}" style="color: #10b981;">${APP_URL}</a>
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
