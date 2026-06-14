import { APP_URL, FROM_NAME } from "../send"

interface InviteTemplateProps {
  candidateName?: string
  inviteCode: string
  expiresAt: Date
}

export function renderInviteHtml(props: InviteTemplateProps): string {
  const { candidateName, inviteCode, expiresAt } = props
  const regUrl = `${APP_URL}/register?code=${inviteCode}`
  const expiryDate = expiresAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const greeting = candidateName
    ? `Dear ${candidateName},`
    : "Dear Candidate,"

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're Invited to ${FROM_NAME}</title>
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
              ">You're Invited to ${FROM_NAME}</h1>
              <p style="
                margin: 0;
                font-size: 15px;
                line-height: 1.6;
                color: #64748b;
              ">
                ${greeting}
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
                We are pleased to invite you to participate in the ${FROM_NAME} evaluation process.
                This platform allows you to demonstrate your skills through a series of
                thoughtfully designed challenges.
              </p>
              <p style="
                margin: 0 0 20px 0;
                font-size: 15px;
                line-height: 1.7;
                color: #475569;
              ">
                Use the invite code below to create your account and get started.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="
                width: 100%;
                background-color: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
              ">
                <tr>
                  <td style="padding: 20px 24px; text-align: center;">
                    <p style="
                      margin: 0 0 8px 0;
                      font-size: 12px;
                      font-weight: 600;
                      text-transform: uppercase;
                      letter-spacing: 1px;
                      color: #94a3b8;
                    ">Your Invite Code</p>
                    <p style="
                      margin: 0;
                      font-family: 'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace;
                      font-size: 20px;
                      font-weight: 700;
                      letter-spacing: 3px;
                      color: #4f46e5;
                      word-break: break-all;
                    ">${inviteCode}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 40px 0 40px; text-align: center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="display: inline-block;">
                <tr>
                  <td style="border-radius: 10px;" bgcolor="#4f46e5">
                    <a href="${regUrl}" target="_blank" style="
                      display: inline-block;
                      padding: 14px 36px;
                      font-size: 15px;
                      font-weight: 600;
                      color: #ffffff;
                      text-decoration: none;
                      border-radius: 10px;
                      background-color: #4f46e5;
                    ">Register Now</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 40px 0 40px; text-align: center;">
              <p style="
                margin: 0;
                font-size: 13px;
                color: #94a3b8;
              ">
                Or copy this link into your browser:
              </p>
              <p style="
                margin: 6px 0 0 0;
                font-size: 13px;
                font-family: 'SF Mono', 'Fira Code', Menlo, Consolas, monospace;
                color: #6366f1;
                word-break: break-all;
              ">${regUrl}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px 0 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="
                width: 100%;
                background-color: #fffbeb;
                border: 1px solid #fde68a;
                border-radius: 10px;
              ">
                <tr>
                  <td style="padding: 14px 18px;">
                    <p style="
                      margin: 0;
                      font-size: 13px;
                      line-height: 1.5;
                      color: #92400e;
                    ">
                      ⏳ This invite code will expire on <strong>${expiryDate}</strong>.
                      Please register before the deadline.
                    </p>
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
                If you did not expect this invitation, you can safely ignore this email.
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

export function renderInviteText(props: InviteTemplateProps): string {
  const { candidateName, inviteCode, expiresAt } = props
  const regUrl = `${APP_URL}/register?code=${inviteCode}`
  const expiryDate = expiresAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const greeting = candidateName
    ? `Dear ${candidateName},`
    : "Dear Candidate,"

  return `${greeting}

We are pleased to invite you to participate in the ${FROM_NAME} evaluation process. This platform allows you to demonstrate your skills through a series of thoughtfully designed challenges.

Your invite code: ${inviteCode}

Register here: ${regUrl}

⏳ This invite code will expire on ${expiryDate}. Please register before the deadline.

—
${FROM_NAME} — Skills Assessment Platform`
}
