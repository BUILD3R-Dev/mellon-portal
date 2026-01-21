/**
 * AWS SES Email Service
 *
 * Provides email sending functionality using AWS Simple Email Service (SES).
 * Configure via environment variables:
 * - AWS_SES_REGION
 * - AWS_SES_ACCESS_KEY
 * - AWS_SES_SECRET_KEY
 * - AWS_SES_FROM_EMAIL
 */

import { SESClient, SendEmailCommand, type SendEmailCommandInput } from '@aws-sdk/client-ses';

/**
 * Email sending parameters
 */
export interface SendEmailParams {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
}

/**
 * Email service result types
 */
export type SendEmailResult =
  | { success: true; messageId: string }
  | { success: false; error: string; code: 'CONFIGURATION_ERROR' | 'SEND_ERROR' | 'VALIDATION_ERROR' };

/**
 * Validates that all required SES environment variables are set
 */
function validateSESConfiguration(): { valid: true } | { valid: false; error: string } {
  const requiredVars = ['AWS_SES_REGION', 'AWS_SES_ACCESS_KEY', 'AWS_SES_SECRET_KEY', 'AWS_SES_FROM_EMAIL'];
  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing required environment variables: ${missing.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Creates and returns an SES client configured with environment credentials
 */
export function createSESClient(): SESClient | null {
  const config = validateSESConfiguration();
  if (!config.valid) {
    console.error('SES Configuration Error:', config.error);
    return null;
  }

  return new SESClient({
    region: process.env.AWS_SES_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_SES_ACCESS_KEY!,
      secretAccessKey: process.env.AWS_SES_SECRET_KEY!,
    },
  });
}

// Lazy-initialized SES client singleton
let sesClient: SESClient | null = null;

function getSESClient(): SESClient | null {
  if (!sesClient) {
    sesClient = createSESClient();
  }
  return sesClient;
}

/**
 * Validates email address format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sends an email using AWS SES
 *
 * @param params - Email parameters including recipient, subject, and body
 * @returns Result object indicating success or failure
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { to, subject, htmlBody, textBody } = params;

  // Validate email address
  if (!isValidEmail(to)) {
    return {
      success: false,
      error: 'Invalid recipient email address',
      code: 'VALIDATION_ERROR',
    };
  }

  // Validate required fields
  if (!subject || !htmlBody || !textBody) {
    return {
      success: false,
      error: 'Subject, HTML body, and text body are required',
      code: 'VALIDATION_ERROR',
    };
  }

  // Get SES client
  const client = getSESClient();
  if (!client) {
    return {
      success: false,
      error: 'Email service is not configured properly',
      code: 'CONFIGURATION_ERROR',
    };
  }

  const fromEmail = process.env.AWS_SES_FROM_EMAIL!;

  const emailParams: SendEmailCommandInput = {
    Source: fromEmail,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8',
        },
        Text: {
          Data: textBody,
          Charset: 'UTF-8',
        },
      },
    },
  };

  try {
    const command = new SendEmailCommand(emailParams);
    const response = await client.send(command);

    return {
      success: true,
      messageId: response.MessageId || 'unknown',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('SES Send Error:', errorMessage);

    return {
      success: false,
      error: `Failed to send email: ${errorMessage}`,
      code: 'SEND_ERROR',
    };
  }
}

/**
 * Resets the SES client (useful for testing)
 */
export function resetSESClient(): void {
  sesClient = null;
}
