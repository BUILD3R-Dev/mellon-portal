/**
 * Invite Email Template
 *
 * Generates HTML and plain text email content for user invitations.
 */

export interface InviteEmailParams {
  inviteLink: string;
  tenantName?: string;
  recipientEmail: string;
  expirationDays: number;
}

export interface InviteEmailContent {
  subject: string;
  htmlBody: string;
  textBody: string;
}

/**
 * Generates the invite email content with HTML and plain text versions
 */
export function generateInviteEmail(params: InviteEmailParams): InviteEmailContent {
  const { inviteLink, tenantName, recipientEmail, expirationDays } = params;

  const subject = "You've been invited to Mellon Portal";

  const organizationText = tenantName
    ? `You have been invited to join <strong>${escapeHtml(tenantName)}</strong> on Mellon Portal.`
    : 'You have been invited to join Mellon Portal as an administrator.';

  const organizationTextPlain = tenantName
    ? `You have been invited to join ${tenantName} on Mellon Portal.`
    : 'You have been invited to join Mellon Portal as an administrator.';

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #111827;">
                Mellon Portal
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600; color: #111827;">
                You're Invited!
              </h2>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: #4b5563;">
                ${organizationText}
              </p>

              <p style="margin: 0 0 30px; font-size: 16px; line-height: 24px; color: #4b5563;">
                Click the button below to create your account and get started.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
                <tr>
                  <td style="text-align: center; padding: 10px 0 30px;">
                    <a href="${escapeHtml(inviteLink)}" style="display: inline-block; padding: 14px 32px; background-color: #111827; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 500; border-radius: 8px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiration Notice -->
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 20px; color: #6b7280; background-color: #f9fafb; padding: 16px; border-radius: 8px;">
                <strong>Note:</strong> This invitation link will expire in ${expirationDays} days. If you need a new invitation, please contact your administrator.
              </p>

              <!-- Alternative Link -->
              <p style="margin: 0; font-size: 14px; line-height: 20px; color: #6b7280;">
                If the button above doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 10px 0 0; font-size: 14px; line-height: 20px; color: #3b82f6; word-break: break-all;">
                ${escapeHtml(inviteLink)}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e5e5; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; font-size: 14px; line-height: 20px; color: #6b7280; text-align: center;">
                This email was sent to ${escapeHtml(recipientEmail)} because someone invited you to Mellon Portal.
              </p>
              <p style="margin: 10px 0 0; font-size: 14px; line-height: 20px; color: #6b7280; text-align: center;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  const textBody = `
You're Invited to Mellon Portal!

${organizationTextPlain}

Click the link below to create your account and get started:
${inviteLink}

Note: This invitation link will expire in ${expirationDays} days. If you need a new invitation, please contact your administrator.

---
This email was sent to ${recipientEmail} because someone invited you to Mellon Portal.
If you didn't expect this invitation, you can safely ignore this email.
`.trim();

  return {
    subject,
    htmlBody,
    textBody,
  };
}

/**
 * Escapes HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}
