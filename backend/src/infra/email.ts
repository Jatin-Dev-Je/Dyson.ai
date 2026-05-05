import { env } from '@/config/env.js'

export type EmailPayload = {
  to:      string
  subject: string
  html:    string
  text?:   string
}

// Sends via Resend REST API — no SDK dependency.
// Silently no-ops in dev when RESEND_API_KEY is not set (logs a warning instead).
export async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = env.RESEND_API_KEY
  const from   = env.RESEND_FROM_EMAIL

  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping email send to', payload.to)
    console.warn('[email] Subject:', payload.subject)
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:    from,
      to:      [payload.to],
      subject: payload.subject,
      html:    payload.html,
      ...(payload.text ? { text: payload.text } : {}),
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Resend API error ${res.status}: ${body}`)
  }
}

// ─── Transactional email templates ────────────────────────────────────────

export async function sendInviteEmail(opts: {
  to:             string
  inviterName:    string
  workspaceName:  string
  inviteToken:    string
  appUrl:         string
}): Promise<void> {
  const link = `${opts.appUrl}/accept-invite?token=${opts.inviteToken}`

  await sendEmail({
    to:      opts.to,
    subject: `${opts.inviterName} invited you to ${opts.workspaceName} on Dyson`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#e8e8f0;">
        <h2 style="font-size:20px;font-weight:600;margin-bottom:8px;">
          You've been invited to ${opts.workspaceName}
        </h2>
        <p style="color:#888;font-size:14px;line-height:1.6;margin-bottom:24px;">
          ${opts.inviterName} has invited you to join the <strong>${opts.workspaceName}</strong> workspace on Dyson — context infrastructure for engineering teams.
        </p>
        <a href="${link}"
           style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">
          Accept invitation →
        </a>
        <p style="color:#555;font-size:12px;margin-top:24px;">
          This link expires in 7 days. If you didn't expect this invitation, you can ignore this email.
        </p>
      </div>
    `,
    text: `You've been invited to join ${opts.workspaceName} on Dyson.\n\nAccept your invitation: ${link}\n\nThis link expires in 7 days.`,
  })
}

export async function sendPasswordResetEmail(opts: {
  to:         string
  name:       string
  resetToken: string
  appUrl:     string
}): Promise<void> {
  const link = `${opts.appUrl}/reset-password?token=${opts.resetToken}`

  await sendEmail({
    to:      opts.to,
    subject: 'Reset your Dyson password',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#e8e8f0;">
        <h2 style="font-size:20px;font-weight:600;margin-bottom:8px;">
          Reset your password
        </h2>
        <p style="color:#888;font-size:14px;line-height:1.6;margin-bottom:24px;">
          Hi ${opts.name}, we received a request to reset your Dyson password. Click the button below to set a new password. This link expires in 30 minutes.
        </p>
        <a href="${link}"
           style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;">
          Reset password →
        </a>
        <p style="color:#555;font-size:12px;margin-top:24px;">
          If you didn't request a password reset, you can safely ignore this email. Your password won't change.
        </p>
      </div>
    `,
    text: `Reset your Dyson password: ${link}\n\nThis link expires in 30 minutes. If you didn't request this, ignore this email.`,
  })
}

export async function sendVerificationEmail(opts: {
  to:     string
  name:   string
  token:  string
  appUrl: string
}): Promise<void> {
  const link = `${opts.appUrl}/verify-email?token=${opts.token}`

  await sendEmail({
    to:      opts.to,
    subject: 'Verify your Dyson email address',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a;">
        <h2 style="font-size:20px;font-weight:600;margin-bottom:8px;">Verify your email</h2>
        <p style="color:#6b6b6b;font-size:14px;line-height:1.6;margin-bottom:24px;">
          Hi ${opts.name}, click below to verify your email address and activate your Dyson account.
          This link expires in 24 hours.
        </p>
        <a href="${link}"
           style="display:inline-block;background:#5B5BD6;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
          Verify email →
        </a>
        <p style="color:#9b9b9b;font-size:12px;margin-top:24px;">
          If you didn't create a Dyson account, you can safely ignore this email.
        </p>
      </div>
    `,
    text: `Verify your Dyson email: ${link}\n\nThis link expires in 24 hours.`,
  })
}
