/**
 * Vercel Serverless Function for xSOL Metrics
 * Proxies Hylo API to bypass CORS
 */

import { checkCRThresholdsVercel } from './cr-check.js';

const HYLO_API = 'https://api.hylo.so/stats';
const HYLO_TOKEN_METADATA = 'https://hylo.so/api/token-metadata/batch';
const JUPITER_API = 'https://lite-api.jup.ag/price/v3';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const XSOL_MINT = '4sWNB8zGWHkh6UnmwiEtzNxL4XrN7uK9tosbESbJFfVs';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=60');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Fetch from Hylo API
    const hyloResponse = await fetch(HYLO_API);
    
    if (!hyloResponse.ok) {
      throw new Error(`Hylo API returned ${hyloResponse.status}`);
    }
    
    const hyloData = await hyloResponse.json();
    const stats = hyloData.exchangeStats;
    const stabilityPoolStats = hyloData.stabilityPoolStats || {};
    
    // Fetch SOL price from Jupiter
    const jupiterResponse = await fetch(`${JUPITER_API}?ids=${SOL_MINT}&vsToken=${USDC_MINT}`);
    const jupiterData = await jupiterResponse.json();
    const SOL_price = jupiterData?.[SOL_MINT]?.usdPrice || 0;
    
    // Fetch xSOL icon from Hylo token metadata
    let xSOL_icon_url = null;
    try {
      const metadataResponse = await fetch(`${HYLO_TOKEN_METADATA}?mints=${XSOL_MINT}`);
      const metadataData = await metadataResponse.json();
      const iconPath = metadataData?.metadata?.[XSOL_MINT]?.image;
      if (iconPath) {
        // Convert relative path to full URL
        xSOL_icon_url = iconPath.startsWith('http') ? iconPath : `https://hylo.so${iconPath}`;
      }
    } catch (e) {
      console.warn('Failed to fetch xSOL icon:', e);
    }
    
    // Extract metrics
    const HYusd_supply = stats.stablecoinSupply;
    const xSOL_price = stats.levercoinNav;
    const xSOL_supply = stats.levercoinSupply;
    const CollateralRatio = stats.collateralRatio;
    const StabilityMode = stats.stabilityMode || {};
    
    // Extract Stability Pool xSOL (levercoinInPool)
    const xSOL_sp = stabilityPoolStats.levercoinInPool || 0;
    
    // Calculate derived values
    const Collateral_TVL = HYusd_supply + (xSOL_price * xSOL_supply);
    const Collateral_TVL_SOL = SOL_price > 0 ? Collateral_TVL / SOL_price : 0;
    const Effective_Leverage = (xSOL_price * xSOL_supply) > 0 
      ? Collateral_TVL / (xSOL_price * xSOL_supply) 
      : 0;
    
    const metrics = {
      HYusd_supply,
      xSOL_price,
      xSOL_supply,
      CollateralRatio,
      SOL_price,
      StabilityMode,
      xSOL_sp,
      Collateral_TVL,
      Collateral_TVL_SOL,
      Effective_Leverage,
      xSOL_icon_url,
      lastFetched: new Date().toISOString(),
      source: 'hylo-api'
    };
    
    // Non-blocking CR threshold check (don't delay API response)
    checkCRThresholdsVercel(CollateralRatio).catch(e =>
      console.warn('CR check background error:', e.message)
    );
    
    return res.status(200).json(metrics);
    
  } catch (error) {
    console.error('Error fetching Hylo API:', error);
    
    // Return error with suggestion to use Gist fallback
    return res.status(500).json({
      error: error.message,
      message: 'Failed to fetch xSOL metrics from Hylo API',
      suggestion: 'Frontend will fallback to Gist data'
    });
  }
}
