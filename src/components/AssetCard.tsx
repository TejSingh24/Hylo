import React from 'react';
import { Info, Check } from 'lucide-react';
import type { AssetData } from '../services/ratexApi';
import Timer from './Timer';
import { RateXIcon, AssetBoostIcon } from './Icons';
import './Dashboard.css';

interface AssetCardProps {
  asset: AssetData;
}

// Helper to format large numbers (K, M, B)
const formatLargeNumber = (num: number | null): string => {
  if (num === null || num === undefined) return 'N/A';
  
  if (num < 1000) {
    return num.toFixed(2);
  } else if (num < 1000000) {
    return (num / 1000).toFixed(1) + 'K';
  } else if (num < 1000000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else {
    return (num / 1000000000).toFixed(1) + 'B';
  }
};

// Helper to format percentage
const formatPercent = (num: number | null, decimals: number = 2): string => {
  if (num === null || num === undefined) return 'N/A';
  return `${num.toFixed(decimals)}%`;
};

// Helper to get asset icon letter (first letter of baseAsset)
const getAssetIconLetter = (assetName: string): string => {
  if (!assetName) return 'A';
  return assetName.charAt(0).toUpperCase();
};

const AssetCard: React.FC<AssetCardProps> = ({ asset }) => {
  // Calculate Expected Recovery Yield (net yield = gross × 0.995)
  const calculateExpectedRecoveryYield = (): number | null => {
    if (asset.expectedRecoveryYield !== null) {
      return asset.expectedRecoveryYield;
    }
    
    // Fallback calculation if not provided by backend
    const { leverage, apy, maturityDays } = asset;
    if (leverage && apy && maturityDays) {
      const apyDecimal = apy / 100;
      const grossYield = leverage * (Math.pow(1 + apyDecimal, 1 / 365) - 1) * 365 * (maturityDays / 365) * 100;
      return grossYield * 0.995; // Net yield after 0.5% platform fee
    }
    
    return null;
  };

  const expectedRecoveryYield = calculateExpectedRecoveryYield();

  // Calculate implied yield range display
  const impliedYieldRange = asset.rangeLower !== null && asset.rangeUpper !== null
    ? `Range: ${formatPercent(asset.rangeLower, 1)} - ${formatPercent(asset.rangeUpper, 1)}`
    : null;

  // Helper function to format price with appropriate decimals
  const formatPrice = (price: number): string => {
    if (price < 0.01) return price.toFixed(4);  // 0.0012 → "0.0012"
    if (price < 0.1) return price.toFixed(3);   // 0.012 → "0.012"
    return price.toFixed(2);                     // 1.234 → "1.23"
  };

  // Calculate price range (without $ symbol)
  const priceRange = asset.ytPriceLower !== null && asset.ytPriceUpper !== null
    ? `${formatPrice(asset.ytPriceLower)} - ${formatPrice(asset.ytPriceUpper)}`
    : 'N/A';

  return (
    <div 
      className="asset-card"
      style={{
        backgroundImage: asset.projectBackgroundImage 
          ? `linear-gradient(rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0.2)), url("${asset.projectBackgroundImage}")`
          : undefined,
        backgroundSize: 'auto 100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right top'
      }}
    >
      {/* Header Section */}
      <div className="asset-card-header">
        <div className="asset-info">
          <div className="asset-icon">
            {asset.assetSymbolImage ? (
              <img 
                src={asset.assetSymbolImage} 
                alt={asset.asset} 
                width="24" 
                height="24"
                style={{ borderRadius: '50%' }}
              />
            ) : (
              getAssetIconLetter(asset.baseAsset || asset.asset)
            )}
          </div>
          <div className="asset-name-section">
            <h3 className="asset-name">{asset.asset}</h3>
            <Timer 
              maturesIn={asset.maturesIn}
              maturityDate={asset.maturity}
              maturityDays={asset.maturityDays}
            />
          </div>
        </div>
        
        <div className="asset-badges">
          {asset.assetBoost !== null && (
            <div className="badge badge-asset">
              <AssetBoostIcon size={14} />
              <span>{asset.assetBoost}×</span>
              <span className="badge-label">Asset</span>
            </div>
          )}
          {asset.ratexBoost !== null && (
            <div className="badge badge-ratex">
              <RateXIcon size={14} />
              <span>{asset.ratexBoost}×</span>
              <span className="badge-label">RateX</span>
            </div>
          )}
        </div>
      </div>

      {/* Row 1: Three Main Metrics */}
      <div className="metrics-row-main">
        <div className="metric-box metric-leverage">
          <div className="metric-label">LEVERAGE</div>
          <div className="metric-value metric-value-large">
            {asset.leverage !== null ? `${asset.leverage}×` : 'N/A'}
          </div>
        </div>

        <div className="metric-box metric-implied-yield">
          <div className="metric-label">IMPLIED YIELD</div>
          <div className="metric-value metric-value-large">
            {formatPercent(asset.impliedYield)}
          </div>
          {impliedYieldRange && (
            <div className="metric-subtext">{impliedYieldRange}</div>
          )}
        </div>

        <div className="metric-box metric-apy">
          <div className="metric-label">UNDERLYING APY</div>
          <div className="metric-value metric-value-large">
            {formatPercent(asset.apy)}
          </div>
          <div className="metric-subtext">7-day average</div>
        </div>
      </div>

      {/* Row 2: Expected Recovery & Last Day YT Value */}
      <div className="metrics-row-secondary">
        <div className="metric-box-secondary metric-recovery">
          <div className="metric-label-small">Expected Recovery Yield</div>
          <div className="metric-value-secondary">
            {formatPercent(expectedRecoveryYield)}
            {expectedRecoveryYield !== null && expectedRecoveryYield > 0 && (
              <Check className="metric-icon-success" size={18} />
            )}
          </div>
        </div>

        <div className="metric-box-secondary metric-lastday">
          <div className="metric-label-small">Last Day YT Value</div>
          <div className="lastday-split">
            <div className="lastday-item">
              <div className="metric-value-secondary metric-value-danger">
                {formatPercent(asset.endDayCurrentYield)}
              </div>
              <div className="lastday-sublabel">Current Implied Yield</div>
            </div>
            
            <div className="lastday-divider"></div>
            
            <div className="lastday-item">
              <div className="metric-value-secondary metric-value-danger">
                {formatPercent(asset.endDayLowerYield)}
              </div>
              <div className="lastday-sublabel">Yield's Lower Range</div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Today's Analysis */}
      <div className="analysis-section">
        <div className="analysis-header">
          <span className="analysis-title">TODAY'S ANALYSIS</span>
          <div className="analysis-info-tooltip">
            <Info size={14} className="info-icon" />
            <div className="tooltip-content">
              Values are valid for today, when maturity days change - values will change
            </div>
          </div>
        </div>

        <div className="metrics-row-analysis">
          <div className="metric-box-analysis metric-upside">
            <div className="metric-label-analysis">UPSIDE POTENTIAL</div>
            <div className="metric-value-analysis metric-value-success">
              {asset.upsidePotential !== null ? `+${formatPercent(asset.upsidePotential, 1)}` : 'N/A'}
            </div>
          </div>

          <div className="metric-box-analysis metric-downside">
            <div className="metric-label-analysis">DOWNSIDE RISK</div>
            <div className="metric-value-analysis metric-value-danger">
              {formatPercent(asset.downsideRisk, 1)}
            </div>
          </div>

          <div className="metric-box-analysis metric-pricerange">
            <div className="metric-label-analysis">PRICE RANGE</div>
            <div className="metric-value-analysis metric-value-purple">
              {priceRange}
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Points Section */}
      <div className="points-section">
        <div className="points-grid">
          <div className="points-metric">
            <div className="points-label">EXPECTED POINTS/DAY</div>
            <div className="points-value">
              {formatLargeNumber(asset.expectedPointsPerDay)}
            </div>
          </div>

          <div className="points-divider"></div>

          <div className="points-metric">
            <div className="points-label">
              TOTAL EXPECTED POINTS
              <div className="points-info-tooltip">
                <Info size={12} className="info-icon-small" />
                <div className="tooltip-content-small">
                  Expected Total Points calculation uses $1 deposit and can change with asset price fluctuations
                </div>
              </div>
            </div>
            <div className="points-value">
              {formatLargeNumber(asset.totalExpectedPoints)}
            </div>
          </div>
        </div>
        <div className="points-footer">Projected Points</div>
      </div>
    </div>
  );
};

export default AssetCard;
