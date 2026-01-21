/**
 * Email module exports
 *
 * This module provides email functionality including:
 * - AWS SES integration for sending emails
 * - Email templates for various use cases
 */

// SES email service
export { sendEmail, createSESClient, resetSESClient } from './ses';
export type { SendEmailParams, SendEmailResult } from './ses';

// Email templates
export { generateInviteEmail } from './templates/invite';
export type { InviteEmailParams, InviteEmailContent } from './templates/invite';
