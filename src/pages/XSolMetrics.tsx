import React, { useState, useEffect } from 'react';
import { TrendingUp, Pencil, Check, X, RefreshCw } from 'lucide-react';
import '../App.css';
import '../components/Dashboard.css';
import { 
  fetchXSolMetrics, 
  calculateXSolBreakEvenPrice,
  calculateXSolBreakEvenPriceWithSP,
  formatLargeNumber, 
  formatXSolPrice,
  type XSolMetrics as XSolMetricsData,
  type BreakEvenResult,
} from '../services/xsolMetricsApi';

// Editable field type
type EditableField = 'xSOL_price' | 'SOL_price' | 'xSOL_supply' | 'HYusd_supply' | null;

const XSolMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<XSolMetricsData | null>(null);
  const [originalMetrics, setOriginalMetrics] = useState<XSolMetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [xsolIconUrl, setXsolIconUrl] = useState<string | null>(null);
  
  const [xSOL_buy_p, setXSOL_buy_p] = useState<string>('0');
  const [breakEvenPrice, setBreakEvenPrice] = useState<number>(0);
  const [breakEvenResult, setBreakEvenResult] = useState<BreakEvenResult | null>(null);

  // Editable fields state
  const [editingField, setEditingField] = useState<EditableField>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isCustomValues, setIsCustomValues] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Format time ago
  const formatTimeAgo = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  // Recalculate derived metrics when base values change
  const recalculateMetrics = (updatedMetrics: XSolMetricsData): XSolMetricsData => {
    const { xSOL_supply, HYusd_supply, xSOL_price, SOL_price } = updatedMetrics;
    
    const Collateral_TVL = HYusd_supply + (xSOL_price * xSOL_supply);
    const Collateral_TVL_SOL = SOL_price > 0 ? Collateral_TVL / SOL_price : 0;
    const Effective_Leverage = (xSOL_price * xSOL_supply) > 0 ? Collateral_TVL / (xSOL_price * xSOL_supply) : 0;
    const CollateralRatio = HYusd_supply > 0 ? Collateral_TVL / HYusd_supply : 0;

    return {
      ...updatedMetrics,
      Collateral_TVL,
      Collateral_TVL_SOL,
      Effective_Leverage,
      CollateralRatio,
    };
  };

  // Format number with commas (e.g., 18000000 -> 18,000,000)
  const formatWithCommas = (num: number): string => {
    return Math.round(num).toLocaleString('en-US');
  };

  // Parse number string that may contain commas
  const parseWithCommas = (str: string): number => {
    return parseFloat(str.replace(/,/g, '')) || 0;
  };

  // Format value for editing based on field type
  const formatValueForEdit = (field: EditableField, value: number | undefined): string => {
    if (value === undefined || value === null) return '0';
    
    // For supply fields, show as integer with commas (e.g., 18,000,000)
    if (field === 'xSOL_supply' || field === 'HYusd_supply') {
      return formatWithCommas(value);
    }
    
    // For price fields, show 3 significant decimal digits
    // Find first non-zero decimal position and show 3 digits from there
    if (value === 0) return '0';
    
    const absValue = Math.abs(value);
    if (absValue >= 1) {
      // For values >= 1, just use 3 decimal places
      return value.toFixed(3);
    } else {
      // For values < 1, find first non-zero decimal and show 3 digits from there
      const str = value.toFixed(10);
      const decimalIndex = str.indexOf('.');
      let firstNonZero = -1;
      
      for (let i = decimalIndex + 1; i < str.length; i++) {
        if (str[i] !== '0') {
          firstNonZero = i - decimalIndex;
          break;
        }
      }
      
      if (firstNonZero === -1) return '0';
      
      // Show from first non-zero digit plus 2 more (3 total)
      const precision = firstNonZero + 2;
      return value.toFixed(precision);
    }
  };

  // Handle starting edit
  const startEdit = (field: EditableField, currentValue: number | undefined) => {
    setEditingField(field);
    setEditValue(formatValueForEdit(field, currentValue));
  };

  // Handle canceling edit
  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  // Handle confirming edit
  const confirmEdit = () => {
    if (!metrics || !editingField) return;

    // Parse value - handle commas for supply fields
    const isSupplyField = editingField === 'xSOL_supply' || editingField === 'HYusd_supply';
    const newValue = isSupplyField ? parseWithCommas(editValue) : (parseFloat(editValue) || 0);
    const updatedMetrics = { ...metrics, [editingField]: newValue };
    const recalculated = recalculateMetrics(updatedMetrics);
    
    setMetrics(recalculated);
    setIsCustomValues(true);
    
    // Recalculate break-even price
    const purchasePrice = parseFloat(xSOL_buy_p) || 0;
    const bePrice = calculateXSolBreakEvenPrice(purchasePrice, recalculated);
    setBreakEvenPrice(bePrice);
    setBreakEvenResult(calculateXSolBreakEvenPriceWithSP(purchasePrice, recalculated));
    
    setEditingField(null);
    setEditValue('');
  };

  // Handle key press in edit input
  const handleEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      confirmEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  // Reset to original values from Gist
  const resetToOriginal = () => {
    if (originalMetrics) {
      setMetrics(originalMetrics);
      setIsCustomValues(false);
      const purchasePrice = parseFloat(xSOL_buy_p) || 0;
      const bePrice = calculateXSolBreakEvenPrice(purchasePrice, originalMetrics);
      setBreakEvenPrice(bePrice);
      setBreakEvenResult(calculateXSolBreakEvenPriceWithSP(purchasePrice, originalMetrics));
    }
  };

  // Fetch metrics on mount
  useEffect(() => {
    const loadMetrics = async () => {
      setIsLoading(true);
      const data = await fetchXSolMetrics();
      
      if (data.metrics) {
        setMetrics(data.metrics);
        setOriginalMetrics(data.metrics);
        setLastUpdated(data.metrics.lastFetched || '');
        // Calculate initial break-even price with default purchase price (0)
        const bePrice = calculateXSolBreakEvenPrice(0, data.metrics);
        setBreakEvenPrice(bePrice);
        setBreakEvenResult(calculateXSolBreakEvenPriceWithSP(0, data.metrics));
      }
      
      setXsolIconUrl(data.xsolIconUrl);
      setError(data.error);
      setIsLoading(false);
    };

    loadMetrics();
  }, []);

  // Calculate break-even price whenever purchase price changes
  const handlePurchasePriceChange = (value: string) => {
    setXSOL_buy_p(value);
    
    if (metrics) {
      const purchasePrice = parseFloat(value) || 0;
      const bePrice = calculateXSolBreakEvenPrice(purchasePrice, metrics);
      setBreakEvenPrice(bePrice);
      setBreakEvenResult(calculateXSolBreakEvenPriceWithSP(purchasePrice, metrics));
    }
  };

  // Calculate dynamic step based on xSOL price
  const getInputStep = (): string => {
    if (!metrics) return '0.01';
    if (metrics.xSOL_price < 0.01) return '0.0001';
    if (metrics.xSOL_price < 0.1) return '0.001';
    return '0.01';
  };

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
          {xsolIconUrl ? (
            <img 
              src={xsolIconUrl} 
              alt="xSOL" 
              style={{ width: 36, height: 36, borderRadius: '50%' }} 
            />
          ) : (
            <TrendingUp size={36} style={{ color: '#8b5cf6' }} />
          )}
          xSOL Metrics
        </h1>
        <p style={{
          color: 'rgba(203, 213, 225, 0.8)',
          fontSize: '1rem',
          marginBottom: '0.75rem',
        }}>
          Real-time protocol metrics and break-even price calculator
        </p>
        
        {/* Last Updated / Custom Values Banner */}
        {isCustomValues ? (
          <div 
            onClick={resetToOriginal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'rgba(251, 191, 36, 0.15)',
              border: '1px solid rgba(251, 191, 36, 0.4)',
              borderRadius: '0.5rem',
              color: '#fbbf24',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            ⚠️ Using custom values. Click to reset
            <RefreshCw size={16} />
          </div>
        ) : (
          <div style={{
            color: 'rgba(148, 163, 184, 0.7)',
            fontSize: '0.875rem',
          }}>
            Last updated: {formatTimeAgo(lastUpdated)}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          maxWidth: '600px',
          margin: '0 auto 2rem',
          padding: '1rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '0.75rem',
          color: '#fca5a5',
          textAlign: 'center',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Main Card */}
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        background: 'rgba(30, 41, 59, 0.6)',
        backdropFilter: 'blur(10px)',
        borderRadius: '1.5rem',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        padding: '2rem',
      }}>
        {/* Metrics Grid - Row 1: 3 boxes */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          marginBottom: '1rem',
          opacity: isLoading ? 0.5 : 1,
          transition: 'opacity 0.3s ease',
        }}>
          {/* Effective Leverage */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '10px',
            padding: '1rem',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            borderLeft: '3px solid #10b981',
          }}>
            <div style={{
              fontSize: '0.65rem',
              fontWeight: '700',
              color: 'rgba(209, 213, 219, 0.85)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
            }}>
              EFFECTIVE LEVERAGE
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#ffffff',
            }}>
              {metrics?.Effective_Leverage ? `${metrics.Effective_Leverage.toFixed(2)}×` : '—'}
            </div>
          </div>

          {/* xSOL Price - Editable */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '10px',
            padding: '1rem',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            borderLeft: '3px solid #06b6d4',
          }}>
            <div style={{
              fontSize: '0.65rem',
              fontWeight: '700',
              color: 'rgba(209, 213, 219, 0.85)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              xSOL PRICE
              {editingField !== 'xSOL_price' && (
                <Pencil 
                  size={12} 
                  style={{ cursor: 'pointer', opacity: 0.6 }}
                  onClick={() => startEdit('xSOL_price', metrics?.xSOL_price)}
                />
              )}
            </div>
            {editingField === 'xSOL_price' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleEditKeyPress}
                  autoFocus
                  style={{
                    flex: 1,
                    padding: '0.25rem 0.5rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(6, 182, 212, 0.5)',
                    borderRadius: '4px',
                    color: 'white',
                    fontSize: '1.25rem',
                    fontWeight: '700',
                  }}
                />
                <Check size={18} style={{ color: '#10b981', cursor: 'pointer' }} onClick={confirmEdit} />
                <X size={18} style={{ color: '#ef4444', cursor: 'pointer' }} onClick={cancelEdit} />
              </div>
            ) : (
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#ffffff',
              }}>
                ${formatXSolPrice(metrics?.xSOL_price)}
              </div>
            )}
          </div>

          {/* SOL Price - Editable */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '10px',
            padding: '1rem',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            borderLeft: '3px solid #06b6d4',
          }}>
            <div style={{
              fontSize: '0.65rem',
              fontWeight: '700',
              color: 'rgba(209, 213, 219, 0.85)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              SOL PRICE
              {editingField !== 'SOL_price' && (
                <Pencil 
                  size={12} 
                  style={{ cursor: 'pointer', opacity: 0.6 }}
                  onClick={() => startEdit('SOL_price', metrics?.SOL_price)}
                />
              )}
            </div>
            {editingField === 'SOL_price' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleEditKeyPress}
                  autoFocus
                  style={{
                    flex: 1,
                    padding: '0.25rem 0.5rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(6, 182, 212, 0.5)',
                    borderRadius: '4px',
                    color: 'white',
                    fontSize: '1.25rem',
                    fontWeight: '700',
                  }}
                />
                <Check size={18} style={{ color: '#10b981', cursor: 'pointer' }} onClick={confirmEdit} />
                <X size={18} style={{ color: '#ef4444', cursor: 'pointer' }} onClick={cancelEdit} />
              </div>
            ) : (
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#ffffff',
              }}>
                ${formatXSolPrice(metrics?.SOL_price)}
              </div>
            )}
          </div>
        </div>

        {/* Metrics Grid - Row 2: 2 boxes */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1rem',
          marginBottom: '2rem',
          opacity: isLoading ? 0.5 : 1,
          transition: 'opacity 0.3s ease',
        }}>
          {/* Collateral TVL (SOL) */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '10px',
            padding: '1rem',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            borderLeft: '3px solid #8b5cf6',
          }}>
            <div style={{
              fontSize: '0.65rem',
              fontWeight: '700',
              color: 'rgba(209, 213, 219, 0.85)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
            }}>
              COLLATERAL TVL (SOL)
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#ffffff',
            }}>
              {formatLargeNumber(metrics?.Collateral_TVL_SOL ?? null)}
            </div>
          </div>

          {/* Collateral Ratio */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '10px',
            padding: '1rem',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            borderLeft: '3px solid #f59e0b',
          }}>
            <div style={{
              fontSize: '0.65rem',
              fontWeight: '700',
              color: 'rgba(209, 213, 219, 0.85)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
            }}>
              COLLATERAL RATIO
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#ffffff',
            }}>
              {metrics?.CollateralRatio ? `${(metrics.CollateralRatio * 100).toFixed(1)}%` : '—'}
            </div>
          </div>
        </div>

        {/* Additional Metrics Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
          opacity: isLoading ? 0.5 : 1,
        }}>
          {/* xSOL Supply - Editable */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.4)',
            borderRadius: '8px',
            padding: '0.875rem',
            border: '1px solid rgba(148, 163, 184, 0.08)',
          }}>
            <div style={{
              fontSize: '0.65rem',
              color: 'rgba(209, 213, 219, 0.7)',
              textTransform: 'uppercase',
              marginBottom: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              xSOL Supply
              {editingField !== 'xSOL_supply' && (
                <Pencil 
                  size={10} 
                  style={{ cursor: 'pointer', opacity: 0.6 }}
                  onClick={() => startEdit('xSOL_supply', metrics?.xSOL_supply)}
                />
              )}
            </div>
            {editingField === 'xSOL_supply' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => {
                    // Allow only digits and commas, then reformat
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    if (raw) {
                      setEditValue(parseInt(raw, 10).toLocaleString('en-US'));
                    } else {
                      setEditValue('');
                    }
                  }}
                  onKeyDown={handleEditKeyPress}
                  autoFocus
                  placeholder="e.g., 18,000,000"
                  style={{
                    flex: 1,
                    padding: '0.25rem 0.5rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(6, 182, 212, 0.5)',
                    borderRadius: '4px',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: '600',
                  }}
                />
                <Check size={16} style={{ color: '#10b981', cursor: 'pointer' }} onClick={confirmEdit} />
                <X size={16} style={{ color: '#ef4444', cursor: 'pointer' }} onClick={cancelEdit} />
              </div>
            ) : (
              <div style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                color: '#e2e8f0',
              }}>
                {formatLargeNumber(metrics?.xSOL_supply ?? null)}
              </div>
            )}
          </div>

          {/* HYusd Supply - Editable */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.4)',
            borderRadius: '8px',
            padding: '0.875rem',
            border: '1px solid rgba(148, 163, 184, 0.08)',
          }}>
            <div style={{
              fontSize: '0.65rem',
              color: 'rgba(209, 213, 219, 0.7)',
              textTransform: 'uppercase',
              marginBottom: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              HYusd Supply
              {editingField !== 'HYusd_supply' && (
                <Pencil 
                  size={10} 
                  style={{ cursor: 'pointer', opacity: 0.6 }}
                  onClick={() => startEdit('HYusd_supply', metrics?.HYusd_supply)}
                />
              )}
            </div>
            {editingField === 'HYusd_supply' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => {
                    // Allow only digits and commas, then reformat
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    if (raw) {
                      setEditValue(parseInt(raw, 10).toLocaleString('en-US'));
                    } else {
                      setEditValue('');
                    }
                  }}
                  onKeyDown={handleEditKeyPress}
                  autoFocus
                  placeholder="Enter full number"
                  style={{
                    flex: 1,
                    padding: '0.25rem 0.5rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(6, 182, 212, 0.5)',
                    borderRadius: '4px',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: '600',
                  }}
                />
                <Check size={16} style={{ color: '#10b981', cursor: 'pointer' }} onClick={confirmEdit} />
                <X size={16} style={{ color: '#ef4444', cursor: 'pointer' }} onClick={cancelEdit} />
              </div>
            ) : (
              <div style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                color: '#e2e8f0',
              }}>
                {formatLargeNumber(metrics?.HYusd_supply ?? null)}
              </div>
            )}
          </div>

          {/* Collateral TVL (USD) */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.4)',
            borderRadius: '8px',
            padding: '0.875rem',
            border: '1px solid rgba(148, 163, 184, 0.08)',
          }}>
            <div style={{
              fontSize: '0.65rem',
              color: 'rgba(209, 213, 219, 0.7)',
              textTransform: 'uppercase',
              marginBottom: '0.25rem',
            }}>
              Collateral TVL (USD)
            </div>
            <div style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              color: '#e2e8f0',
            }}>
              ${formatLargeNumber(metrics?.Collateral_TVL ?? null)}
            </div>
          </div>

          {/* Stability Pool xSOL */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.4)',
            borderRadius: '8px',
            padding: '0.875rem',
            border: '1px solid rgba(148, 163, 184, 0.08)',
          }}>
            <div style={{
              fontSize: '0.65rem',
              color: 'rgba(209, 213, 219, 0.7)',
              textTransform: 'uppercase',
              marginBottom: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}>
              Stability Pool xSOL
              <span title="xSOL tokens held in the stability pool. When CR reaches 150%, these convert to HYusd to cap CR." style={{ cursor: 'help', opacity: 0.5 }}>ⓘ</span>
            </div>
            <div style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              color: '#e2e8f0',
            }}>
              {formatLargeNumber(metrics?.xSOL_sp ?? null)}
            </div>
            {metrics && metrics.xSOL_sp > 0 && metrics.xSOL_supply > 0 && (
              <div style={{
                fontSize: '0.65rem',
                color: 'rgba(148, 163, 184, 0.6)',
                marginTop: '0.25rem',
              }}>
                {((metrics.xSOL_sp / metrics.xSOL_supply) * 100).toFixed(1)}% of total supply
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{
          height: '1px',
          background: 'rgba(255, 255, 255, 0.1)',
          margin: '2rem 0',
        }} />

        {/* Calculator Section */}
        <div style={{
          maxWidth: '500px',
          margin: '0 auto',
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#ffffff',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}>
            Break-Even Calculator
          </h2>

          {/* Input Section */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="xsol-purchase-price" style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'rgba(226, 232, 240, 0.9)',
              marginBottom: '0.5rem',
            }}>
              xSOL Purchase Price (USD)
            </label>
            <input
              id="xsol-purchase-price"
              type="number"
              value={xSOL_buy_p}
              onChange={(e) => handlePurchasePriceChange(e.target.value)}
              step={getInputStep()}
              min="0"
              placeholder="0.00"
              disabled={!metrics}
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '0.75rem',
                color: 'white',
                fontSize: '1.1rem',
                transition: 'all 0.3s',
                boxSizing: 'border-box',
              }}
            />
            <p style={{
              fontSize: '0.75rem',
              fontStyle: 'italic',
              color: 'rgba(226, 232, 240, 0.5)',
              marginTop: '0.5rem',
            }}>
              💡 Enter the price you paid for xSOL in USD
            </p>
          </div>

          {/* Result Card */}
          <div style={{
            background: 'linear-gradient(to bottom right, rgba(139, 92, 246, 0.15), rgba(6, 182, 212, 0.15))',
            borderRadius: '1rem',
            padding: '1.5rem',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            textAlign: 'center',
          }}>
            <p style={{
              color: 'rgb(226, 232, 240)',
              fontSize: '0.875rem',
              fontWeight: '500',
              marginBottom: '0.5rem',
            }}>
              xSOL Break-Even SOL Price (USD)
              {breakEvenResult && breakEvenResult.phase === 'phase-B' && (
                <span style={{ 
                  marginLeft: '0.5rem',
                  fontSize: '0.7rem',
                  padding: '0.15rem 0.4rem',
                  background: 'rgba(249, 115, 22, 0.2)',
                  border: '1px solid rgba(249, 115, 22, 0.4)',
                  borderRadius: '4px',
                  color: '#fb923c',
                }}>
                  SP Adjusted
                </span>
              )}
            </p>
            <p style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              background: 'linear-gradient(to right, rgb(139, 92, 246), rgb(6, 182, 212))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: '0.5rem 0',
            }}>
              ${breakEvenResult ? formatXSolPrice(breakEvenResult.breakEvenPrice) : formatXSolPrice(breakEvenPrice)}
            </p>

            {/* Phase badge */}
            {breakEvenResult && breakEvenResult.phase !== 'error' && parseFloat(xSOL_buy_p) > 0 && (
              <div style={{
                display: 'inline-block',
                fontSize: '0.7rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                marginBottom: '0.75rem',
                background: breakEvenResult.phase === 'phase-0' ? 'rgba(16, 185, 129, 0.15)' :
                           breakEvenResult.phase === 'phase-A' ? 'rgba(251, 191, 36, 0.15)' :
                           breakEvenResult.phase === 'phase-B' ? 'rgba(249, 115, 22, 0.15)' :
                           'rgba(148, 163, 184, 0.15)',
                color: breakEvenResult.phase === 'phase-0' ? '#34d399' :
                       breakEvenResult.phase === 'phase-A' ? '#fbbf24' :
                       breakEvenResult.phase === 'phase-B' ? '#fb923c' :
                       '#94a3b8',
                border: `1px solid ${
                  breakEvenResult.phase === 'phase-0' ? 'rgba(16, 185, 129, 0.3)' :
                  breakEvenResult.phase === 'phase-A' ? 'rgba(251, 191, 36, 0.3)' :
                  breakEvenResult.phase === 'phase-B' ? 'rgba(249, 115, 22, 0.3)' :
                  'rgba(148, 163, 184, 0.3)'
                }`,
              }}>
                {breakEvenResult.phase === 'phase-0' && 'Normal (CR < 150%)'}
                {breakEvenResult.phase === 'phase-A' && 'During SP Conversion (CR = 150%)'}
                {breakEvenResult.phase === 'phase-B' && 'After SP Exhaustion'}
                {breakEvenResult.phase === 'normal' && 'Normal — No Stability Pool'}
              </div>
            )}

            <p style={{
              fontSize: '0.75rem',
              color: 'rgba(226, 232, 240, 0.5)',
              marginTop: '0.5rem',
            }}>
              The SOL price in USD at which you break even on your xSOL position
            </p>

            {/* SP-adjusted details — only show when there's actual improvement */}
            {breakEvenResult && breakEvenResult.phase === 'phase-B' && breakEvenResult.improvement > 0 && parseFloat(xSOL_buy_p) > 0 && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                textAlign: 'left',
              }}>
                <div style={{ 
                  fontWeight: '600', 
                  color: '#fb923c', 
                  marginBottom: '0.5rem',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Stability Pool Impact
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(226, 232, 240, 0.6)' }}>
                    <span>Without SP adjustment:</span>
                    <span style={{ color: '#94a3b8' }}>${formatXSolPrice(breakEvenResult.naiveBreakEvenPrice)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(226, 232, 240, 0.6)' }}>
                    <span>With SP adjustment:</span>
                    <span style={{ color: '#34d399', fontWeight: '600' }}>${formatXSolPrice(breakEvenResult.breakEvenPrice)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(226, 232, 240, 0.6)' }}>
                    <span>Improvement:</span>
                    <span style={{ color: '#34d399' }}>-${formatXSolPrice(breakEvenResult.improvement)} lower</span>
                  </div>
                  {breakEvenResult.poolExhaustionSolPrice && (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      color: 'rgba(226, 232, 240, 0.6)',
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      paddingTop: '0.35rem',
                      marginTop: '0.15rem',
                    }}>
                      <span>SP deactivation exhausts at:</span>
                      <span style={{ color: '#fbbf24' }}>${formatXSolPrice(breakEvenResult.poolExhaustionSolPrice)}</span>
                    </div>
                  )}
                  {breakEvenResult.activationSolPrice && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(226, 232, 240, 0.6)' }}>
                      <span>SP deactivation starts at:</span>
                      <span style={{ color: '#94a3b8' }}>${formatXSolPrice(breakEvenResult.activationSolPrice)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Show activation/exhaustion info even in Phase 0/A if pool exists */}
            {breakEvenResult && (breakEvenResult.phase === 'phase-0' || breakEvenResult.phase === 'phase-A') && breakEvenResult.activationSolPrice && parseFloat(xSOL_buy_p) > 0 && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                textAlign: 'left',
              }}>
                <div style={{ 
                  fontWeight: '600', 
                  color: '#94a3b8', 
                  marginBottom: '0.5rem',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Stability Pool Info
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {breakEvenResult.activationSolPrice && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(226, 232, 240, 0.6)' }}>
                      <span>SP deactivation starts at:</span>
                      <span style={{ color: '#94a3b8' }}>${formatXSolPrice(breakEvenResult.activationSolPrice)}</span>
                    </div>
                  )}
                  {breakEvenResult.poolExhaustionSolPrice && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(226, 232, 240, 0.6)' }}>
                      <span>SP deactivation exhausts at:</span>
                      <span style={{ color: '#fbbf24' }}>${formatXSolPrice(breakEvenResult.poolExhaustionSolPrice)}</span>
                    </div>
                  )}
                  <div style={{ 
                    color: 'rgba(148, 163, 184, 0.5)', 
                    fontSize: '0.65rem',
                    fontStyle: 'italic',
                    marginTop: '0.15rem',
                  }}>
                    Break-even is reached before pool exhausts — no SP adjustment needed.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Last Updated */}
        {metrics?.lastFetched && (
          <div style={{
            textAlign: 'center',
            marginTop: '2rem',
            fontSize: '0.75rem',
            color: 'rgba(148, 163, 184, 0.6)',
          }}>
            Last updated: {new Date(metrics.lastFetched).toLocaleString()}
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div style={{
            textAlign: 'center',
            marginTop: '1rem',
            fontSize: '0.875rem',
            color: 'rgba(148, 163, 184, 0.8)',
          }}>
            Loading metrics...
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default XSolMetrics;
