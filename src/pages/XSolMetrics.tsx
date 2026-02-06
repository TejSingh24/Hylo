import React, { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import '../App.css';
import '../components/Dashboard.css';
import { 
  fetchXSolMetricsFromGist, 
  calculateXSolBreakEvenPrice, 
  formatLargeNumber, 
  formatXSolPrice,
  type XSolMetrics as XSolMetricsData 
} from '../services/xsolMetricsApi';

const XSolMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<XSolMetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [xsolIconUrl, setXsolIconUrl] = useState<string | null>(null);
  
  const [xSOL_buy_p, setXSOL_buy_p] = useState<string>('0');
  const [breakEvenPrice, setBreakEvenPrice] = useState<number>(0);

  // Fetch metrics on mount
  useEffect(() => {
    const loadMetrics = async () => {
      setIsLoading(true);
      const data = await fetchXSolMetricsFromGist();
      
      if (data.metrics) {
        setMetrics(data.metrics);
        // Calculate initial break-even price with default purchase price (0)
        const bePrice = calculateXSolBreakEvenPrice(0, data.metrics);
        setBreakEvenPrice(bePrice);
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
    <div className="dashboard-container" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      paddingTop: '6rem',
      paddingBottom: '4rem',
    }}>
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
        }}>
          Real-time protocol metrics and break-even price calculator
        </p>
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
              fontSize: '0.7rem',
              fontWeight: '700',
              color: 'rgba(209, 213, 219, 0.85)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem',
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

          {/* xSOL Price */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '10px',
            padding: '1rem',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            borderLeft: '3px solid #06b6d4',
          }}>
            <div style={{
              fontSize: '0.7rem',
              fontWeight: '700',
              color: 'rgba(209, 213, 219, 0.85)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem',
            }}>
              xSOL PRICE
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#ffffff',
            }}>
              ${formatXSolPrice(metrics?.xSOL_price)}
            </div>
          </div>

          {/* SOL Price */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '10px',
            padding: '1rem',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            borderLeft: '3px solid #06b6d4',
          }}>
            <div style={{
              fontSize: '0.7rem',
              fontWeight: '700',
              color: 'rgba(209, 213, 219, 0.85)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem',
            }}>
              SOL PRICE
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#ffffff',
            }}>
              ${formatXSolPrice(metrics?.SOL_price)}
            </div>
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
              fontSize: '0.7rem',
              fontWeight: '700',
              color: 'rgba(209, 213, 219, 0.85)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem',
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
              fontSize: '0.7rem',
              fontWeight: '700',
              color: 'rgba(209, 213, 219, 0.85)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem',
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
          {/* xSOL Supply */}
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
              xSOL Supply
            </div>
            <div style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              color: '#e2e8f0',
            }}>
              {formatLargeNumber(metrics?.xSOL_supply ?? null)}
            </div>
          </div>

          {/* HYusd Supply */}
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
              HYusd Supply
            </div>
            <div style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              color: '#e2e8f0',
            }}>
              ${formatLargeNumber(metrics?.HYusd_supply ?? null)}
            </div>
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
              xSOL Break-Even Price (USD)
            </p>
            <p style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              background: 'linear-gradient(to right, rgb(139, 92, 246), rgb(6, 182, 212))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: '0.5rem 0',
            }}>
              {formatXSolPrice(breakEvenPrice)}
            </p>
            <p style={{
              fontSize: '0.75rem',
              color: 'rgba(226, 232, 240, 0.5)',
              marginTop: '0.75rem',
            }}>
              The xSOL price in USD at which you break even on your position
            </p>
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
            {metrics.source && ` • Source: ${metrics.source}`}
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
  );
};

export default XSolMetrics;
