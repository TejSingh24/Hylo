/**
 * CR Alert Checker for Vercel Serverless Functions
 * 
 * Lightweight version of CR monitoring that runs when the xSOL metrics
 * page is loaded. Reads alert state from Gist, checks thresholds,
 * sends Telegram + email alerts if needed, and writes state back.
 * 
 * This is a standalone module — does NOT import from server/ folder
 * (Vercel deploys api/ separately from server/).
 */

const TELEGRAM_API = 'https://api.telegram.org';
const GIST_RAW_URL = 'https://gist.githubusercontent.com/TejSingh24/d3a1db6fc79e168cf5dff8d3a2c11706/raw/ratex-assets.json';

const CR_THRESHOLDS = [
  {
    key: 'cr_110', value: 1.10, label: '110%', severity: 'critical',
    message: (cr) => `Hylo projects Collateral Ratio (CR) is ${(cr*100).toFixed(1)}% which is below 110%, Be cautious on HYUSD peg`,
  },
  {
    key: 'cr_130', value: 1.30, label: '130%', severity: 'high',
    message: (cr) => `Hylo projects Collateral Ratio (CR) is ${(cr*100).toFixed(1)}% which is below 130%, Be cautious on sHYUSD loops, sHYUSD price is going to decrease`,
  },
  {
    key: 'cr_135', value: 1.35, label: '135%', severity: 'medium',
    message: (cr) => `Hylo projects Collateral Ratio (CR) is ${(cr*100).toFixed(1)}% which is below 135%, Be cautious on sHYUSD loops, sHYUSD price can decrease anytime`,
  },
  {
    key: 'cr_140', value: 1.40, label: '140%', severity: 'low',
    message: (cr) => `Hylo projects Collateral Ratio (CR) is ${(cr*100).toFixed(1)}% which is below 140%, Be cautious on sHYUSD loops`,
  },
];

const TELEGRAM_REALERT_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours

function defaultAlertState() {
  const state = {};
  for (const t of CR_THRESHOLDS) {
    state[t.key] = { active: false, lastTelegram: null, lastEmail: null };
  }
  return state;
}

// ─── Notification senders ────────────────────────────────────────────────────

async function sendTelegram(message) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return;

  try {
    await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId, text: message,
        parse_mode: 'Markdown', disable_web_page_preview: true,
      }),
    });
  } catch (e) {
    console.warn('Telegram send failed:', e.message);
  }
}

async function sendEmail(subject, body) {
  const to = process.env.ALERT_EMAIL;
  if (!to) return;

  // Try SendGrid
  const sgKey = process.env.SENDGRID_API_KEY;
  if (sgKey) {
    try {
      const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sgKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: process.env.ALERT_FROM_EMAIL || 'alerts@hylo.app', name: 'Hylo Alerts' },
          subject,
          content: [{ type: 'text/plain', value: body }],
        }),
      });
      if (r.status === 202 || r.ok) return;
    } catch {}
  }

  // Try Mailgun
  const mgKey = process.env.MAILGUN_API_KEY;
  const mgDom = process.env.MAILGUN_DOMAIN;
  if (mgKey && mgDom) {
    try {
      const form = new URLSearchParams();
      form.append('from', `Hylo Alerts <${process.env.ALERT_FROM_EMAIL || 'alerts@hylo.app'}>`);
      form.append('to', to); form.append('subject', subject); form.append('text', body);
      const r = await fetch(`https://api.mailgun.net/v3/${mgDom}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${Buffer.from(`api:${mgKey}`).toString('base64')}` },
        body: form,
      });
      if (r.ok) return;
    } catch {}
  }

  // Try Resend
  const rsKey = process.env.RESEND_API_KEY;
  if (rsKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${rsKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `Hylo Alerts <${process.env.ALERT_FROM_EMAIL || 'alerts@hylo.app'}>`,
          to: [to], subject, text: body,
        }),
      });
    } catch {}
  }
}

// ─── Core ────────────────────────────────────────────────────────────────────

/**
 * Check CR thresholds and send alerts. Non-blocking — errors are caught internally.
 * @param {number} cr - CollateralRatio from Hylo API
 */
export async function checkCRThresholdsVercel(cr) {
  if (cr == null) return;

  const gistId = process.env.GIST_ID;
  const gistToken = process.env.GIST_TOKEN;

  try {
    // Read existing alert state from Gist
    let gistData = null;
    try {
      const r = await fetch(GIST_RAW_URL, { cache: 'no-cache' });
      if (r.ok) gistData = await r.json();
    } catch {}

    const state = gistData?.alertState
      ? { ...defaultAlertState(), ...JSON.parse(JSON.stringify(gistData.alertState)) }
      : defaultAlertState();

    const now = new Date();
    let stateChanged = false;

    for (const threshold of CR_THRESHOLDS) {
      const entry = state[threshold.key];

      if (cr < threshold.value) {
        const msg = threshold.message(cr);
        const isFirstBreach = !entry.active;
        const telegramDue = isFirstBreach ||
          (entry.lastTelegram && (now - new Date(entry.lastTelegram)) >= TELEGRAM_REALERT_INTERVAL);
        const emailDue = isFirstBreach;

        if (telegramDue) {
          const emoji = { critical: '🚨', high: '🔴', medium: '🟠', low: '🟡' }[threshold.severity];
          await sendTelegram(`${emoji} *CR ALERT — Below ${threshold.label}*\n\n${msg}\n\n📊 Current CR: *${(cr*100).toFixed(1)}%*\n⏰ ${now.toISOString()}`);
          entry.lastTelegram = now.toISOString();
          stateChanged = true;
        }

        if (emailDue) {
          await sendEmail(`⚠️ Hylo CR Alert — Below ${threshold.label}`, msg);
          entry.lastEmail = now.toISOString();
          stateChanged = true;
        }

        if (!entry.active) { entry.active = true; stateChanged = true; }
      } else {
        if (entry.active) {
          entry.active = false;
          entry.lastTelegram = null;
          entry.lastEmail = null;
          stateChanged = true;
        }
      }
    }

    // Persist updated state if changed
    if (stateChanged && gistId && gistToken && gistData) {
      gistData.alertState = state;
      await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${gistToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Hylo-CR-Monitor-Vercel',
        },
        body: JSON.stringify({
          files: { 'ratex-assets.json': { content: JSON.stringify(gistData, null, 2) } },
        }),
      });
    }
  } catch (err) {
    console.warn('CR check failed (non-blocking):', err.message);
  }
}
