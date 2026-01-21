# Spec Requirements: Password Reset Flow

## Initial Description
Password Reset Flow — Implement forgot password request, reset token validation, and password update functionality

**Size:** S
**From Roadmap:** Milestone 1, Item #4

## Requirements Discussion

### First Round Questions

**Q1:** Should the reset token be stored in the users table (similar to invite tokens) or in a separate password_reset_tokens table?
**Answer:** Use same pattern as invite tokens - add `resetToken` and `resetExpiresAt` columns to users table

**Q2:** What should the token expiration time be?
**Answer:** 1 hour

**Q3:** What email template structure/styling should be used?
**Answer:** Follow same structure/styling as User Invite Flow using AWS SES (reset link, expiration notice, "ignore if not requested" message)

**Q4:** What URL/page should the forgot password form live on?
**Answer:** `/forgot-password` - show same success message regardless of whether email exists in system (prevent email enumeration attacks)

**Q5:** What are the password requirements for the new password?
**Answer:** Same as User Invite Flow (minimum 8 characters)

**Q6:** Should pending users (who haven't completed invite flow) be allowed to reset their password?
**Answer:** ALLOW them to reset password (provides alternative path when invite emails don't arrive)

**Q7:** After successful password reset, what should happen?
**Answer:** Automatically log in and redirect to dashboard

**Q8:** What is explicitly out of scope?
**Answer:**
- Rate limiting
- Security questions
- Email notification after successful reset

### Existing Code to Reference

**Similar Features Identified:**
- Feature: User Invite Flow - Path: `agent-os/specs/2026-01-20-user-invite-flow/` (AWS SES email patterns, token generation)
- Feature: Authentication System - Path: `agent-os/specs/2026-01-20-authentication-system/` (Better Auth, session creation, login page)
- Database schema: `src/lib/db/schema.ts`
- Login page: `src/pages/login.astro`

### Follow-up Questions
None required - all requirements clearly specified.

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
N/A

## Requirements Summary

### Functional Requirements
- Forgot password page at `/forgot-password` with email input form
- Token generation using same pattern as invite tokens (stored in users table)
- Reset token valid for 1 hour
- Email sent via AWS SES with reset link, expiration notice, and "ignore if not requested" message
- Reset password page at `/reset-password` (with token parameter)
- Password validation: minimum 8 characters (same as User Invite Flow)
- Pending users CAN reset their password
- Same success message shown regardless of email existence (prevent enumeration)
- Automatic login and redirect to dashboard after successful reset

### Reusability Opportunities
- User Invite Flow email template structure and AWS SES integration
- Token generation pattern from invite flow
- Password validation logic from invite flow
- Session creation logic from authentication system
- Login page styling/layout for forgot password and reset password pages

### Scope Boundaries
**In Scope:**
- Forgot password request form and page
- Reset token generation and storage in users table
- Password reset email via AWS SES
- Reset password page with token validation
- Password update with minimum 8 character requirement
- Support for pending users
- Auto-login after successful reset
- Redirect to dashboard

**Out of Scope:**
- Rate limiting on forgot password requests
- Security questions
- Email notification after successful password reset
- Account lockout policies

### Technical Considerations
- Add `resetToken` and `resetExpiresAt` columns to users table (migration required)
- Use AWS SES for email delivery (same as User Invite Flow)
- Use Better Auth for session creation after reset
- Follow existing authentication patterns from `agent-os/specs/2026-01-20-authentication-system/`
- Token should be cryptographically secure (same generation method as invite tokens)
