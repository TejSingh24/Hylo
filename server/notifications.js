/**
 * Notification Service
 * 
 * Sends alerts via Telegram and cascading email providers (SendGrid → Mailgun → Resend).
 * All providers use plain fetch() REST calls — no external npm packages needed.
 * 
 * Environment variables required:
 *   TELEGRAM_BOT_TOKEN  - Bot token from @BotFather
 *   TELEGRAM_CHAT_ID    - Chat/group ID to send alerts to
 *   ALERT_EMAIL          - Recipient email address
 *   SENDGRID_API_KEY     - SendGrid API key (optional, first email provider tried)
 *   MAILGUN_API_KEY      - Mailgun API key (optional, second fallback)
 *   MAILGUN_DOMAIN       - Mailgun sending domain (required if MAILGUN_API_KEY set)
 *   RESEND_API_KEY       - Resend API key (optional, third fallback)
 *   ALERT_FROM_EMAIL     - Sender email address for email providers (default: alerts@hylo.app)
 */

const TELEGRAM_API = 'https://api.telegram.org';

// ─── Telegram ────────────────────────────────────────────────────────────────

/**
 * Send a Telegram message
 * @param {string} message - Message text (supports Markdown)
 * @param {object} options - Optional overrides { botToken, chatId }
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendTelegramAlert(message, options = {}) {
  const botToken = options.botToken || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = options.chatId || process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn('⚠️ Telegram not configured (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)');
    return { success: false, error: 'Telegram not configured' };
  }

  try {
    const url = `${TELEGRAM_API}/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('❌ Telegram API error:', data.description);
      return { success: false, error: data.description };
    }

    console.log('✅ Telegram alert sent successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Telegram send failed:', error.message);
    return { success: false, error: error.message };
  }
}

// ─── Email Providers ─────────────────────────────────────────────────────────

/**
 * Send email via SendGrid REST API
 */
async function sendViaSendGrid(to, subject, body) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return { success: false, error: 'SENDGRID_API_KEY not set' };

  const fromEmail = process.env.ALERT_FROM_EMAIL || 'alerts@hylo.app';

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail, name: 'Hylo Alerts' },
      subject,
      content: [
        { type: 'text/plain', value: body },
        { type: 'text/html', value: formatEmailHtml(subject, body) },
      ],
    }),
  });

  // SendGrid returns 202 on success (no body)
  if (response.status === 202 || response.status === 200) {
    return { success: true, provider: 'sendgrid' };
  }

  const errorText = await response.text();
  return { success: false, error: `SendGrid ${response.status}: ${errorText}` };
}

/**
 * Send email via Mailgun REST API
 */
async function sendViaMailgun(to, subject, body) {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  if (!apiKey || !domain) return { success: false, error: 'MAILGUN_API_KEY or MAILGUN_DOMAIN not set' };

  const fromEmail = process.env.ALERT_FROM_EMAIL || 'alerts@hylo.app';

  // Mailgun uses form-encoded data
  const formData = new URLSearchParams();
  formData.append('from', `Hylo Alerts <${fromEmail}>`);
  formData.append('to', to);
  formData.append('subject', subject);
  formData.append('text', body);
  formData.append('html', formatEmailHtml(subject, body));

  const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
    },
    body: formData,
  });

  if (response.ok) {
    return { success: true, provider: 'mailgun' };
  }

  const errorText = await response.text();
  return { success: false, error: `Mailgun ${response.status}: ${errorText}` };
}

/**
 * Send email via Resend REST API
 */
async function sendViaResend(to, subject, body) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: 'RESEND_API_KEY not set' };

  const fromEmail = process.env.ALERT_FROM_EMAIL || 'alerts@hylo.app';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Hylo Alerts <${fromEmail}>`,
      to: [to],
      subject,
      text: body,
      html: formatEmailHtml(subject, body),
    }),
  });

  if (response.ok) {
    return { success: true, provider: 'resend' };
  }

  const errorText = await response.text();
  return { success: false, error: `Resend ${response.status}: ${errorText}` };
}

/**
 * Send email with cascading fallback: SendGrid → Mailgun → Resend
 * Returns on first success. If all fail, returns the collected errors.
 * 
 * @param {string} subject - Email subject
 * @param {string} body - Email body (plain text)
 * @param {string} to - Recipient email (defaults to ALERT_EMAIL env var)
 * @returns {Promise<{success: boolean, provider?: string, errors?: string[]}>}
 */
export async function sendEmailWithFallback(subject, body, to) {
  const recipient = to || process.env.ALERT_EMAIL;

  if (!recipient) {
    console.warn('⚠️ Email not configured (missing ALERT_EMAIL)');
    return { success: false, errors: ['No recipient email configured'] };
  }

  const providers = [
    { name: 'SendGrid', fn: sendViaSendGrid },
    { name: 'Mailgun', fn: sendViaMailgun },
    { name: 'Resend', fn: sendViaResend },
  ];

  const errors = [];

  for (const provider of providers) {
    try {
      console.log(`📧 Trying ${provider.name}...`);
      const result = await provider.fn(recipient, subject, body);

      if (result.success) {
        console.log(`✅ Email sent via ${provider.name}`);
        return { success: true, provider: provider.name };
      }

      console.warn(`  ⚠️ ${provider.name} failed: ${result.error}`);
      errors.push(`${provider.name}: ${result.error}`);
    } catch (error) {
      console.warn(`  ⚠️ ${provider.name} threw: ${error.message}`);
      errors.push(`${provider.name}: ${error.message}`);
    }
  }

  console.error('❌ All email providers failed:', errors);
  return { success: false, errors };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Format plain text body into a simple HTML email
 */
function formatEmailHtml(subject, body) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: #0d0f17; color: #e0e0e0;">
  <div style="max-width: 600px; margin: 0 auto; background: #1a1d2e; border-radius: 12px; padding: 24px; border: 1px solid #2a2d3e;">
    <h2 style="color: #ff6b6b; margin-top: 0;">⚠️ ${subject}</h2>
    <p style="font-size: 16px; line-height: 1.6; color: #c0c0c0; white-space: pre-line;">${body}</p>
    <hr style="border: none; border-top: 1px solid #2a2d3e; margin: 20px 0;" />
    <p style="font-size: 12px; color: #666;">Sent by Hylo Alert System • ${new Date().toISOString()}</p>
  </div>
</body>
</html>`.trim();
}
