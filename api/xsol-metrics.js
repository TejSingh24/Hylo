/**
 * Vercel Serverless Function for xSOL Metrics
 * Proxies Hylo API to bypass CORS
 */

const HYLO_API = 'https://api.hylo.so/stats';
const JUPITER_API = 'https://lite-api.jup.ag/price/v3';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

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
    
    // Fetch SOL price from Jupiter
    const jupiterResponse = await fetch(`${JUPITER_API}?ids=${SOL_MINT}&vsToken=${USDC_MINT}`);
    const jupiterData = await jupiterResponse.json();
    const SOL_price = jupiterData?.data?.[SOL_MINT]?.price || 0;
    
    // Extract metrics
    const HYusd_supply = stats.stablecoinSupply;
    const xSOL_price = stats.levercoinNav;
    const xSOL_supply = stats.levercoinSupply;
    const CollateralRatio = stats.collateralRatio;
    const StabilityMode = stats.stabilityMode || {};
    
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
      Collateral_TVL,
      Collateral_TVL_SOL,
      Effective_Leverage,
      xSOL_icon_url: null,
      lastFetched: new Date().toISOString(),
      source: 'hylo-api'
    };
    
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
