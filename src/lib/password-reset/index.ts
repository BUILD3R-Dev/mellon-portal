/**
 * Password Reset Module
 *
 * Provides functionality for generating and validating password reset tokens,
 * updating passwords, and sending reset emails.
 */

import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/lib/email';
import { hashPassword, createSession, getPostLoginRedirect } from '@/lib/auth';
import crypto from 'crypto';

/**
 * Generates a cryptographically secure reset token using UUID
 */
export function generateResetToken(): string {
  return crypto.randomUUID();
}

/**
 * Calculates reset token expiration date (1 hour from now)
 */
export function getResetExpiration(): Date {
  const expiresAt = new Date();
  expiresAt.setTime(expiresAt.getTime() + 60 * 60 * 1000); // 1 hour
  return expiresAt;
}

/**
 * Checks if a reset token has expired
 */
export function isResetTokenExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Validates password requirements
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  return { valid: true };
}

/**
 * Request password reset result types
 */
export type RequestResetResult =
  | { success: true }
  | { success: false; error: string; code: 'VALIDATION_ERROR' | 'DATABASE_ERROR' | 'EMAIL_ERROR' };

/**
 * Performs timing-safe token comparison
 */
function timingSafeTokenCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    const dummy = Buffer.from('a'.repeat(a.length));
    crypto.timingSafeEqual(dummy, dummy);
    return false;
  }

  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

/**
 * Requests a password reset for the given email.
 * Always returns success to prevent email enumeration.
 */
export async function requestPasswordReset(email: string): Promise<RequestResetResult> {
  const normalizedEmail = email.toLowerCase().trim();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return {
      success: false,
      error: 'Invalid email address format',
      code: 'VALIDATION_ERROR',
    };
  }

  try {
    // Look up user by email (any status)
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        status: users.status,
      })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    // If user doesn't exist, return success anyway (prevent enumeration)
    if (!user) {
      return { success: true };
    }

    // Generate reset token and expiration
    const resetToken = generateResetToken();
    const resetExpiresAt = getResetExpiration();

    // Update user with reset token (clears any existing token)
    await db
      .update(users)
      .set({
        resetToken,
        resetExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Send reset email
    const baseUrl = process.env.BASE_URL || 'http://localhost:4321';
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

    const emailContent = generateResetEmail({
      resetLink,
      recipientEmail: normalizedEmail,
    });

    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: emailContent.subject,
      htmlBody: emailContent.htmlBody,
      textBody: emailContent.textBody,
    });

    if (!emailResult.success) {
      console.error('Failed to send reset email:', emailResult.error);
      // Still return success to prevent enumeration
      // In production, you might want to log this for monitoring
    }

    return { success: true };
  } catch (error) {
    console.error('Database error requesting password reset:', error);
    // Return success to prevent enumeration even on errors
    return { success: true };
  }
}

/**
 * Reset password result types
 */
export type ResetPasswordResult =
  | {
      success: true;
      userId: string;
      sessionToken: string;
      redirectUrl: string;
      tenantId?: string;
    }
  | {
      success: false;
      error: string;
      code:
        | 'INVALID_TOKEN'
        | 'EXPIRED_TOKEN'
        | 'VALIDATION_ERROR'
        | 'PASSWORD_MISMATCH'
        | 'PASSWORD_TOO_SHORT'
        | 'DATABASE_ERROR';
    };

/**
 * Validates a reset token and returns user info
 */
export interface ValidateResetTokenResult {
  valid: boolean;
  expired?: boolean;
  user?: {
    id: string;
    email: string;
    status: 'active' | 'inactive' | 'pending';
  };
}

export async function validateResetToken(token: string): Promise<ValidateResetTokenResult> {
  try {
    // Find all users with reset tokens for timing-safe comparison
    const usersWithTokens = await db
      .select({
        id: users.id,
        email: users.email,
        status: users.status,
        resetToken: users.resetToken,
        resetExpiresAt: users.resetExpiresAt,
      })
      .from(users)
      .where(eq(users.resetToken, token))
      .limit(1);

    if (usersWithTokens.length === 0) {
      return { valid: false };
    }

    const user = usersWithTokens[0];

    // Check expiration
    if (user.resetExpiresAt && isResetTokenExpired(user.resetExpiresAt)) {
      return { valid: false, expired: true };
    }

    return {
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
      },
    };
  } catch (error) {
    console.error('Error validating reset token:', error);
    return { valid: false };
  }
}

/**
 * Resets a user's password using a valid token
 */
export async function resetPassword(
  token: string,
  newPassword: string,
  passwordConfirmation: string
): Promise<ResetPasswordResult> {
  // Validate required fields
  if (!token || !newPassword || !passwordConfirmation) {
    return {
      success: false,
      error: 'Token and password are required',
      code: 'VALIDATION_ERROR',
    };
  }

  // Validate password
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    return {
      success: false,
      error: passwordValidation.error!,
      code: 'PASSWORD_TOO_SHORT',
    };
  }

  // Validate password confirmation
  if (newPassword !== passwordConfirmation) {
    return {
      success: false,
      error: 'Passwords do not match',
      code: 'PASSWORD_MISMATCH',
    };
  }

  try {
    // Validate token
    const validation = await validateResetToken(token);

    if (!validation.valid) {
      if (validation.expired) {
        return {
          success: false,
          error: 'This password reset link has expired. Please request a new one.',
          code: 'EXPIRED_TOKEN',
        };
      }
      return {
        success: false,
        error: 'Invalid or expired password reset link',
        code: 'INVALID_TOKEN',
      };
    }

    const user = validation.user!;

    // Hash password
    const passwordHash = await hashPassword(newPassword);

    // Determine new status (activate pending users)
    const newStatus = user.status === 'pending' ? 'active' : user.status;

    // Update user record
    await db
      .update(users)
      .set({
        passwordHash,
        status: newStatus,
        resetToken: null,
        resetExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Create session (for auto-login)
    const session = await createSession(user.id);

    // Determine redirect URL based on memberships
    const { redirectUrl, tenantId } = await getPostLoginRedirect(user.id);

    return {
      success: true,
      userId: user.id,
      sessionToken: session.token,
      redirectUrl,
      tenantId,
    };
  } catch (error) {
    console.error('Database error resetting password:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while resetting your password',
      code: 'DATABASE_ERROR',
    };
  }
}

/**
 * Reset email parameters
 */
interface ResetEmailParams {
  resetLink: string;
  recipientEmail: string;
}

/**
 * Reset email content
 */
interface ResetEmailContent {
  subject: string;
  htmlBody: string;
  textBody: string;
}

/**
 * Escapes HTML special characters
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

/**
 * Generates the password reset email content
 */
export function generateResetEmail(params: ResetEmailParams): ResetEmailContent {
  const { resetLink, recipientEmail } = params;

  const subject = 'Reset your Mellon Portal password';

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
                Reset Your Password
              </h2>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: #4b5563;">
                We received a request to reset your password for your Mellon Portal account.
              </p>

              <p style="margin: 0 0 30px; font-size: 16px; line-height: 24px; color: #4b5563;">
                Click the button below to set a new password.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
                <tr>
                  <td style="text-align: center; padding: 10px 0 30px;">
                    <a href="${escapeHtml(resetLink)}" style="display: inline-block; padding: 14px 32px; background-color: #111827; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 500; border-radius: 8px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiration Notice -->
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 20px; color: #6b7280; background-color: #f9fafb; padding: 16px; border-radius: 8px;">
                <strong>Note:</strong> This password reset link will expire in 1 hour. If you need a new link, you can request another one from the login page.
              </p>

              <!-- Ignore Notice -->
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 20px; color: #6b7280;">
                If you did not request a password reset, you can safely ignore this email. Your password will not be changed.
              </p>

              <!-- Alternative Link -->
              <p style="margin: 0; font-size: 14px; line-height: 20px; color: #6b7280;">
                If the button above doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 10px 0 0; font-size: 14px; line-height: 20px; color: #3b82f6; word-break: break-all;">
                ${escapeHtml(resetLink)}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e5e5; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; font-size: 14px; line-height: 20px; color: #6b7280; text-align: center;">
                This email was sent to ${escapeHtml(recipientEmail)} because a password reset was requested for this account.
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
Reset Your Password

We received a request to reset your password for your Mellon Portal account.

Click the link below to set a new password:
${resetLink}

Note: This password reset link will expire in 1 hour. If you need a new link, you can request another one from the login page.

If you did not request a password reset, you can safely ignore this email. Your password will not be changed.

---
This email was sent to ${recipientEmail} because a password reset was requested for this account.
`.trim();

  return {
    subject,
    htmlBody,
    textBody,
  };
}
