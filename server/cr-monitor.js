/**
 * CR (Collateral Ratio) Monitor
 * 
 * Checks xSOL metrics CollateralRatio against defined thresholds and
 * triggers Telegram + email alerts when breached.
 * 
 * Alert state is persisted in the GitHub Gist JSON under the `alertState` key
 * so that duplicate alerts are not sent across scraper runs / API calls.
 * 
 * Thresholds (descending severity):
 *   CR < 1.40 (140%) — caution on sHYUSD loops
 *   CR < 1.35 (135%) — sHYUSD price can decrease anytime
 *   CR < 1.30 (130%) — sHYUSD price is going to decrease
 *   CR < 1.10 (110%) — caution on HYUSD peg
 * 
 * Re-alert policy:
 *   Email  — once per threshold breach (until CR recovers above and drops again)
 *   Telegram — once per breach + repeat every 12 hours while still below
 */

import { sendTelegramAlert, sendEmailWithFallback } from './notifications.js';

// ─── Gist helpers ────────────────────────────────────────────────────────────

const GIST_RAW_URL = 'https://gist.githubusercontent.com/TejSingh24/d3a1db6fc79e168cf5dff8d3a2c11706/raw/ratex-assets.json';

/**
 * Fetch the full raw Gist JSON (includes alertState if previously written)
 */
async function fetchGistRaw() {
  try {
    const res = await fetch(GIST_RAW_URL, { cache: 'no-cache' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Update only the alertState key in the Gist without touching anything else.
 * Reads existing Gist content, patches alertState, writes back.
 */
async function persistAlertState(alertState, gistId, gistToken) {
  if (!gistId || !gistToken) {
    console.warn('⚠️ Cannot persist alert state — GIST_ID or GIST_TOKEN missing');
    return;
  }

  try {
    // Read current Gist
    const existing = await fetchGistRaw();
    if (!existing) {
      console.warn('⚠️ Could not read existing Gist to persist alert state');
      return;
    }

    // Patch in the alert state
    existing.alertState = alertState;

    // Write back
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${gistToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Hylo-CR-Monitor',
      },
      body: JSON.stringify({
        files: {
          'ratex-assets.json': {
            content: JSON.stringify(existing, null, 2),
          },
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('❌ Failed to persist alert state:', response.status, errText);
    } else {
      console.log('✅ Alert state persisted to Gist');
    }
  } catch (err) {
    console.error('❌ Error persisting alert state:', err.message);
  }
}

// ─── Threshold definitions ──────────────────────────────────────────────────

const CR_THRESHOLDS = [
  {
    key: 'cr_110',
    value: 1.10,
    label: '110%',
    message: (cr) =>
      `Hylo projects Collateral Ratio (CR) is ${(cr * 100).toFixed(1)}% which is below 110%, Be cautious on HYUSD peg`,
    severity: 'critical',
  },
  {
    key: 'cr_130',
    value: 1.30,
    label: '130%',
    message: (cr) =>
      `Hylo projects Collateral Ratio (CR) is ${(cr * 100).toFixed(1)}% which is below 130%, Be cautious on sHYUSD loops, sHYUSD price is going to decrease`,
    severity: 'high',
  },
  {
    key: 'cr_135',
    value: 1.35,
    label: '135%',
    message: (cr) =>
      `Hylo projects Collateral Ratio (CR) is ${(cr * 100).toFixed(1)}% which is below 135%, Be cautious on sHYUSD loops, sHYUSD price can decrease anytime`,
    severity: 'medium',
  },
  {
    key: 'cr_140',
    value: 1.40,
    label: '140%',
    message: (cr) =>
      `Hylo projects Collateral Ratio (CR) is ${(cr * 100).toFixed(1)}% which is below 140%, Be cautious on sHYUSD loops`,
    severity: 'low',
  },
];

// 12-hour interval in ms for Telegram re-alerts
const TELEGRAM_REALERT_INTERVAL = 12 * 60 * 60 * 1000;

// ─── Core logic ─────────────────────────────────────────────────────────────

/**
 * Build a default (clean) alert state object
 */
function defaultAlertState() {
  const state = {};
  for (const t of CR_THRESHOLDS) {
    state[t.key] = {
      active: false,        // currently breached?
      lastTelegram: null,    // ISO timestamp of last Telegram alert
      lastEmail: null,       // ISO timestamp of last email alert
    };
  }
  return state;
}

/**
 * Check CR against all thresholds and send notifications as needed.
 * 
 * @param {number} currentCR - Current CollateralRatio (e.g., 1.38)
 * @param {object|null} existingAlertState - Previously persisted alertState (or null)
 * @returns {object} Updated alertState to persist
 */
async function evaluateThresholds(currentCR, existingAlertState) {
  const state = existingAlertState
    ? { ...defaultAlertState(), ...JSON.parse(JSON.stringify(existingAlertState)) }
    : defaultAlertState();
  const now = new Date();

  for (const threshold of CR_THRESHOLDS) {
    const entry = state[threshold.key];

    if (currentCR < threshold.value) {
      // ── Threshold breached ──
      const msg = threshold.message(currentCR);

      // Determine if we need to send alerts
      const isFirstBreach = !entry.active;
      const telegramDue = isFirstBreach ||
        (entry.lastTelegram && (now - new Date(entry.lastTelegram)) >= TELEGRAM_REALERT_INTERVAL);
      const emailDue = isFirstBreach; // email only on first breach

      if (telegramDue) {
        const emoji =
          threshold.severity === 'critical' ? '🚨' :
          threshold.severity === 'high' ? '🔴' :
          threshold.severity === 'medium' ? '🟠' : '🟡';
        const telegramMsg = `${emoji} *CR ALERT — Below ${threshold.label}*\n\n${msg}\n\n📊 Current CR: *${(currentCR * 100).toFixed(1)}%*\n⏰ ${now.toISOString()}`;
        await sendTelegramAlert(telegramMsg);
        entry.lastTelegram = now.toISOString();
      }

      if (emailDue) {
        const subject = `⚠️ Hylo CR Alert — Below ${threshold.label}`;
        await sendEmailWithFallback(subject, msg);
        entry.lastEmail = now.toISOString();
      }

      entry.active = true;
    } else {
      // ── CR is above this threshold — reset if it was active ──
      if (entry.active) {
        console.log(`✅ CR recovered above ${threshold.label} — resetting alert state for ${threshold.key}`);
        entry.active = false;
        entry.lastTelegram = null;
        entry.lastEmail = null;
      }
    }
  }

  return state;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Main entry point: check CR thresholds and send alerts.
 * Reads alert state from Gist, evaluates, sends notifications, writes state back.
 * 
 * @param {number} collateralRatio - Current CR from xSOL metrics
 * @param {object} opts
 * @param {string} opts.gistId - GitHub Gist ID (for persisting state)
 * @param {string} opts.gistToken - GitHub PAT (for writing to Gist)
 * @param {object|null} opts.alertState - Pre-fetched alert state (if available, avoids extra Gist read)
 * @returns {Promise<object>} Updated alert state
 */
export async function checkCRAndAlert(collateralRatio, opts = {}) {
  const gistId = opts.gistId || process.env.GIST_ID;
  const gistToken = opts.gistToken || process.env.GIST_TOKEN;

  if (collateralRatio === null || collateralRatio === undefined) {
    console.warn('⚠️ CR monitor: collateralRatio is null/undefined, skipping');
    return opts.alertState || defaultAlertState();
  }

  console.log(`\n🔍 CR Monitor: Checking CR = ${(collateralRatio * 100).toFixed(1)}%`);

  // Get existing alert state
  let alertState = opts.alertState || null;
  if (!alertState) {
    const gistData = await fetchGistRaw();
    alertState = gistData?.alertState || null;
  }

  // Evaluate thresholds and send alerts
  const updatedState = await evaluateThresholds(collateralRatio, alertState);

  // Persist updated state to Gist
  if (gistId && gistToken) {
    await persistAlertState(updatedState, gistId, gistToken);
  }

  return updatedState;
}

/**
 * Get a human-readable CR status string (used by Telegram /cr command)
 * @param {number} cr - Current CollateralRatio
 * @returns {string} Formatted status
 */
export function formatCRStatus(cr) {
  const percent = (cr * 100).toFixed(1);
  let status = '🟢 Healthy';
  let detail = 'All clear — no threshold breached.';

  if (cr < 1.10) {
    status = '🚨 CRITICAL';
    detail = 'Below 110% — HYUSD peg at risk!';
  } else if (cr < 1.30) {
    status = '🔴 DANGER';
    detail = 'Below 130% — sHYUSD price is going to decrease.';
  } else if (cr < 1.35) {
    status = '🟠 WARNING';
    detail = 'Below 135% — sHYUSD price can decrease anytime.';
  } else if (cr < 1.40) {
    status = '🟡 CAUTION';
    detail = 'Below 140% — Be cautious on sHYUSD loops.';
  }

  return `📊 *Collateral Ratio: ${percent}%*\n\nStatus: ${status}\n${detail}`;
}

export { defaultAlertState, CR_THRESHOLDS };
