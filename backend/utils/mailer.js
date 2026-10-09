import nodemailer from 'nodemailer';

function hasSmtpConfig() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.ADMIN_EMAIL
  );
}

export function isMailConfigured() {
  return hasSmtpConfig();
}

export function getAdminEmail() {
  return String(process.env.ADMIN_EMAIL || '').trim();
}

function createTransport() {
  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Send an access-request notification to the configured admin inbox.
 */
export async function sendAccessRequestEmail({ requesterEmail }) {
  if (!hasSmtpConfig()) {
    const err = new Error(
      'Email is not configured. Set ADMIN_EMAIL, SMTP_HOST, SMTP_USER, and SMTP_PASS.'
    );
    err.code = 'MAIL_NOT_CONFIGURED';
    throw err;
  }

  const adminEmail = getAdminEmail();
  const fromAddress =
    String(process.env.MAIL_FROM || '').trim() || process.env.SMTP_USER;
  const transport = createTransport();

  await transport.sendMail({
    from: `"The Learning Grove" <${fromAddress}>`,
    to: adminEmail,
    replyTo: requesterEmail,
    subject: 'Access request — The Learning Grove',
    text: [
      'A visitor requested access to The Learning Grove.',
      '',
      `Requester email: ${requesterEmail}`,
      `Submitted at: ${new Date().toISOString()}`,
      '',
      'Please review this request and create an account if appropriate.',
    ].join('\n'),
    html: `
      <p>A visitor requested access to <strong>The Learning Grove</strong>.</p>
      <p><strong>Requester email:</strong> ${requesterEmail}</p>
      <p><strong>Submitted at:</strong> ${new Date().toISOString()}</p>
      <p>Please review this request and create an account if appropriate.</p>
    `,
  });
}
