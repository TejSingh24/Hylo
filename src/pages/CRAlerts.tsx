import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Plus, Check, ExternalLink, Loader2 } from 'lucide-react';
import '../App.css';
import '../components/Dashboard.css';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3000' : '';

// Default threshold values (greyed placeholders)
const DEFAULT_THRESHOLDS = [140, 135, 130, 110];

type ConnectionStatus = 'idle' | 'generating' | 'waiting' | 'connected' | 'error';

const CRAlerts: React.FC = () => {
  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [refCode, setRefCode] = useState<string | null>(null);
  const [botLink, setBotLink] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Threshold state
  const [thresholds, setThresholds] = useState<(number | string)[]>([...DEFAULT_THRESHOLDS]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [initialThresholds, setInitialThresholds] = useState<number[]>([...DEFAULT_THRESHOLDS]);

  // Re-alert interval state
  const [reAlertValue, setReAlertValue] = useState<number | string>(24);
  const [reAlertUnit, setReAlertUnit] = useState<'hours' | 'days'>('hours');
  const [initialReAlertHours, setInitialReAlertHours] = useState<number>(24);

  // ─── Generate ref code and open bot link ────────────────────────────────────

  const handleSetupTelegram = async () => {
    setConnectionStatus('generating');
    setErrorMessage(null);

    try {
      const res = await fetch(`${API_BASE}/api/cr-subscribe?action=generate-ref`);
      const data = await res.json();

      if (!res.ok || !data.refCode) {
        throw new Error(data.error || 'Failed to generate link');
      }

      setRefCode(data.refCode);
      setBotLink(data.botLink);
      setConnectionStatus('waiting');

      // Open bot link in new tab
      window.open(data.botLink, '_blank');
    } catch (err: unknown) {
      setConnectionStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  // ─── Poll for connection status ─────────────────────────────────────────────

  const checkStatus = useCallback(async () => {
    if (!refCode) return;

    try {
      const res = await fetch(`${API_BASE}/api/cr-subscribe?action=check-status&refCode=${refCode}`);
      const data = await res.json();

      if (data.connected) {
        setConnectionStatus('connected');
        if (data.thresholds && Array.isArray(data.thresholds)) {
          setThresholds(data.thresholds);
          setInitialThresholds(data.thresholds);
        }
        // Populate re-alert interval from server
        const intervalHours = data.reAlertIntervalHours || 24;
        setInitialReAlertHours(intervalHours);
        if (intervalHours >= 24 && intervalHours % 24 === 0) {
          setReAlertValue(intervalHours / 24);
          setReAlertUnit('days');
        } else {
          setReAlertValue(intervalHours);
          setReAlertUnit('hours');
        }
      }
    } catch {
      // Silently retry
    }
  }, [refCode]);

  useEffect(() => {
    if (connectionStatus !== 'waiting' || !refCode) return;

    const interval = setInterval(checkStatus, 3000);
    // Stop polling after 5 minutes
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (connectionStatus === 'waiting') {
        setConnectionStatus('error');
        setErrorMessage('Connection timed out. Please try again.');
      }
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [connectionStatus, refCode, checkStatus]);

  // ─── Threshold management ──────────────────────────────────────────────────

  const updateThreshold = (index: number, value: string) => {
    const updated = [...thresholds];
    updated[index] = value === '' ? '' : Number(value) || value;
    setThresholds(updated);
  };

  const removeThreshold = (index: number) => {
    if (thresholds.length <= 1) return;
    setThresholds(thresholds.filter((_, i) => i !== index));
  };

  const addThreshold = () => {
    setThresholds([...thresholds, '']);
  };

  const saveThresholds = async () => {
    if (!refCode) return;

    const validThresholds = thresholds
      .map(t => Number(t))
      .filter(t => !isNaN(t) && t >= 100 && t <= 200);

    if (validThresholds.length === 0) {
      setErrorMessage('Please enter at least one valid threshold (100-200%)');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    // Convert re-alert to hours
    const reAlertHours = reAlertUnit === 'days' ? Number(reAlertValue) * 24 : Number(reAlertValue);
    if (isNaN(reAlertHours) || reAlertHours < 1 || reAlertHours > 720) {
      setErrorMessage('Re-alert interval must be between 1 hour and 30 days');
      setIsSaving(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/cr-subscribe?action=save-thresholds&refCode=${refCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thresholds: validThresholds, refCode, reAlertIntervalHours: reAlertHours }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save thresholds');
      }

      setThresholds(data.thresholds);
      setInitialThresholds(data.thresholds);
      setInitialReAlertHours(reAlertHours);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // Compute current re-alert interval in hours for comparison
  const currentReAlertHours = reAlertUnit === 'days' ? Number(reAlertValue) * 24 : Number(reAlertValue);

  const hasChanges = JSON.stringify(
    thresholds.map(t => Number(t)).filter(t => !isNaN(t)).sort((a, b) => b - a)
  ) !== JSON.stringify([...initialThresholds].sort((a, b) => b - a))
    || currentReAlertHours !== initialReAlertHours;

  // ─── Severity helpers ──────────────────────────────────────────────────────

  const getSeverityInfo = (pct: number) => {
    if (pct <= 110) return { emoji: '🚨', color: '#ef4444', label: 'Critical — HYUSD peg at risk' };
    if (pct <= 130) return { emoji: '🔴', color: '#f97316', label: 'High — sHYUSD price going to decrease' };
    if (pct <= 135) return { emoji: '🟠', color: '#eab308', label: 'Medium — sHYUSD price can decrease' };
    return { emoji: '🟡', color: '#a3e635', label: 'Low — Caution on sHYUSD loops' };
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="dashboard-page" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      paddingTop: '6rem',
      paddingBottom: '4rem',
    }}>
      <div className="dashboard-container">
        {/* Page Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
          }}>
            <Bell size={36} style={{ color: '#8b5cf6' }} />
            Hylo CR Alerts
          </h1>
          <p style={{
            color: 'rgba(203, 213, 225, 0.8)',
            fontSize: '1rem',
          }}>
            Get notified on Telegram when the Collateral Ratio drops below your thresholds
          </p>
        </div>

        {/* Main Card */}
        <div style={{
          maxWidth: '700px',
          margin: '0 auto',
          background: 'rgba(30, 41, 59, 0.6)',
          backdropFilter: 'blur(10px)',
          borderRadius: '1.5rem',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          padding: '2rem',
        }}>

          {/* ─── Section 1: Connect Telegram ─── */}
          <div style={{ marginBottom: connectionStatus === 'connected' ? '2rem' : '0' }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#e2e8f0',
              marginBottom: '0.75rem',
            }}>
              1. Connect Telegram
            </h2>

            <p style={{
              color: 'rgba(148, 163, 184, 0.9)',
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
              lineHeight: '1.5',
            }}>
              Click the button below to open our alert bot in Telegram. Press <strong>Start</strong> in&nbsp;the&nbsp;bot to continue.
            </p>

            {connectionStatus === 'idle' && (
              <button
                onClick={handleSetupTelegram}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.875rem 1.5rem',
                  background: 'linear-gradient(135deg, #0088cc 0%, #0077b5 100%)',
                  border: 'none',
                  borderRadius: '0.75rem',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(0, 136, 204, 0.3)',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                <div style={{ textAlign: 'left' }}>
                  <div>Set Up Telegram Alerts</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '400', opacity: 0.8 }}>
                    Opens the bot in Telegram — press Start in bot to Continue
                  </div>
                </div>
              </button>
            )}

            {connectionStatus === 'generating' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.875rem 1.5rem',
                background: 'rgba(0, 136, 204, 0.15)',
                borderRadius: '0.75rem',
                color: '#7dd3fc',
              }}>
                <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                Generating link...
              </div>
            )}

            {connectionStatus === 'waiting' && (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.875rem 1.5rem',
                  background: 'rgba(251, 191, 36, 0.15)',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  borderRadius: '0.75rem',
                  color: '#fbbf24',
                  marginBottom: '0.75rem',
                }}>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                  <div>
                    <div style={{ fontWeight: '600' }}>Waiting for you to press Start in the bot...</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>This page will update automatically</div>
                  </div>
                </div>
                {botLink && (
                  <a
                    href={botLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: '#7dd3fc',
                      fontSize: '0.875rem',
                      textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={14} />
                    Didn't open? Click here to open the bot
                  </a>
                )}
              </div>
            )}

            {connectionStatus === 'connected' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.875rem 1.5rem',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '0.75rem',
                color: '#34d399',
              }}>
                <Check size={20} />
                <div>
                  <div style={{ fontWeight: '600' }}>Connected ✓</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                    You'll receive CR alerts on Telegram
                  </div>
                </div>
              </div>
            )}

            {connectionStatus === 'error' && (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.875rem 1.5rem',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '0.75rem',
                  color: '#fca5a5',
                  marginBottom: '0.75rem',
                }}>
                  ⚠️ {errorMessage || 'Something went wrong'}
                </div>
                <button
                  onClick={() => { setConnectionStatus('idle'); setErrorMessage(null); }}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(148, 163, 184, 0.2)',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    borderRadius: '0.5rem',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  Try Again
                </button>
              </div>
            )}
          </div>

          {/* ─── Section 2: Configure Thresholds (revealed after connecting) ─── */}
          {connectionStatus === 'connected' && (
            <div>
              <div style={{
                height: '1px',
                background: 'rgba(148, 163, 184, 0.2)',
                marginBottom: '2rem',
              }} />

              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#e2e8f0',
                marginBottom: '0.75rem',
              }}>
                2. Configure Alert Thresholds
              </h2>

              <p style={{
                color: 'rgba(148, 163, 184, 0.9)',
                fontSize: '0.875rem',
                marginBottom: '1.25rem',
                lineHeight: '1.5',
              }}>
                You'll receive a Telegram alert when the Collateral Ratio drops below any of these levels.
                Alerts reset when CR recovers above 148%.
              </p>

              {/* Threshold Inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {thresholds.map((threshold, index) => {
                  const numValue = Number(threshold);
                  const isValid = !isNaN(numValue) && numValue >= 100 && numValue <= 200;
                  const severity = isValid ? getSeverityInfo(numValue) : null;
                  const defaultVal = DEFAULT_THRESHOLDS[index];

                  return (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'stretch',
                      gap: '0.75rem',
                    }}>
                      <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        background: 'rgba(15, 23, 42, 0.6)',
                        borderRadius: '0.5rem',
                        border: `1px solid ${isValid && threshold !== '' ? (severity?.color || 'rgba(148, 163, 184, 0.2)') + '40' : 'rgba(148, 163, 184, 0.2)'}`,
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          padding: '0.75rem',
                          color: 'rgba(148, 163, 184, 0.7)',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          whiteSpace: 'nowrap',
                          borderRight: '1px solid rgba(148, 163, 184, 0.15)',
                        }}>
                          Alert {index + 1}
                        </div>
                        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                          <input
                            type="number"
                            value={threshold}
                            onChange={(e) => updateThreshold(index, e.target.value)}
                            placeholder={defaultVal ? String(defaultVal) : '140'}
                            min={100}
                            max={200}
                            step={1}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              background: 'transparent',
                              border: 'none',
                              outline: 'none',
                              color: 'white',
                              fontSize: '1rem',
                              fontWeight: '600',
                            }}
                          />
                          <span style={{
                            paddingRight: '0.75rem',
                            color: 'rgba(148, 163, 184, 0.5)',
                            fontSize: '0.875rem',
                          }}>%</span>
                        </div>
                      </div>

                      {/* Severity indicator */}
                      <div style={{
                        fontSize: '0.75rem',
                        color: severity?.color || 'transparent',
                        whiteSpace: 'nowrap',
                        minWidth: '80px',
                        display: 'flex',
                        alignItems: 'center',
                        visibility: severity && threshold !== '' ? 'visible' : 'hidden',
                      }}>
                        {severity?.emoji || '🟡'} {numValue <= 110 ? 'Critical' : numValue <= 130 ? 'High' : numValue <= 135 ? 'Medium' : 'Low'}
                      </div>

                      {/* Remove button */}
                      {thresholds.length > 1 && (
                        <button
                          onClick={() => removeThreshold(index)}
                          title="Remove this threshold"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '36px',
                            margin: 0,
                            padding: 0,
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '0.375rem',
                            color: '#fca5a5',
                            cursor: 'pointer',
                            flexShrink: 0,
                            fontSize: '1rem',
                            fontWeight: '700',
                            lineHeight: 1,
                            boxSizing: 'border-box',
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add More Button */}
              <button
                onClick={addThreshold}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: 'rgba(139, 92, 246, 0.15)',
                  border: '1px dashed rgba(139, 92, 246, 0.4)',
                  borderRadius: '0.5rem',
                  color: '#a78bfa',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  marginBottom: '1.5rem',
                  transition: 'all 0.2s ease',
                }}
              >
                <Plus size={16} />
                Add Alert Level
              </button>

              {/* Re-alert Interval */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: 'rgba(148, 163, 184, 0.9)',
                  marginBottom: '0.5rem',
                }}>
                  Repeat alert every
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    overflow: 'hidden',
                    flex: 1,
                    maxWidth: '200px',
                  }}>
                    <input
                      type="number"
                      value={reAlertValue}
                      onChange={(e) => setReAlertValue(e.target.value === '' ? '' : Number(e.target.value))}
                      min={1}
                      max={reAlertUnit === 'days' ? 30 : 720}
                      step={1}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'white',
                        fontSize: '1rem',
                        fontWeight: '600',
                      }}
                    />
                  </div>
                  <select
                    value={reAlertUnit}
                    onChange={(e) => {
                      const newUnit = e.target.value as 'hours' | 'days';
                      const currentVal = Number(reAlertValue) || 1;
                      if (newUnit === 'days' && reAlertUnit === 'hours') {
                        setReAlertValue(Math.max(1, Math.round(currentVal / 24)));
                      } else if (newUnit === 'hours' && reAlertUnit === 'days') {
                        setReAlertValue(currentVal * 24);
                      }
                      setReAlertUnit(newUnit);
                    }}
                    style={{
                      padding: '0.75rem 1rem',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '0.5rem',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                  <span style={{
                    fontSize: '0.75rem',
                    color: 'rgba(148, 163, 184, 0.6)',
                    whiteSpace: 'nowrap',
                  }}>
                    while CR stays below
                  </span>
                </div>
              </div>

              {/* Save Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button
                  onClick={saveThresholds}
                  disabled={isSaving || !hasChanges}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    background: hasChanges
                      ? 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)'
                      : 'rgba(148, 163, 184, 0.2)',
                    border: 'none',
                    borderRadius: '0.75rem',
                    color: hasChanges ? 'white' : 'rgba(148, 163, 184, 0.5)',
                    fontSize: '0.9375rem',
                    fontWeight: '600',
                    cursor: hasChanges ? 'pointer' : 'default',
                    opacity: isSaving ? 0.7 : 1,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isSaving ? (
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Check size={18} />
                  )}
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </button>

                {saveSuccess && (
                  <span style={{ color: '#34d399', fontSize: '0.875rem' }}>
                    ✓ Saved successfully
                  </span>
                )}

                {errorMessage && connectionStatus === 'connected' && (
                  <span style={{ color: '#fca5a5', fontSize: '0.875rem' }}>
                    ⚠️ {errorMessage}
                  </span>
                )}
              </div>

              {/* Info Note */}
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: 'rgba(139, 92, 246, 0.08)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '0.75rem',
                fontSize: '0.8125rem',
                color: 'rgba(203, 213, 225, 0.8)',
                lineHeight: '1.6',
              }}>
                <div style={{ fontWeight: '600', color: '#c4b5fd', marginBottom: '0.5rem' }}>
                  How alerts work
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', listStyleType: 'disc' }}>
                  <li>CR is checked every 5–10 minutes or whenever you open the tool (free-tier limits)</li>
                  <li>Telegram: alert on first breach, then repeats at your chosen interval while CR stays below</li>
                  <li>All alerts reset when CR recovers above 148%</li>
                  <li>Email alerts coming soon (one-time per breach, resets on recovery)</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CRAlerts;
