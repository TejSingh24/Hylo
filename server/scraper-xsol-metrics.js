/**
 * Phase 0: xSOL Metrics Scraper
 * 
 * Fetches xSOL break-even metrics directly from Hylo and Jupiter APIs
 * No Puppeteer needed - direct Node.js fetch calls
 * 
 * Output structure:
 * {
 *   HYusd_supply: number,      // HYusd total supply (stablecoinSupply)
 *   xSOL_price: number,         // xSOL price in USD (levercoinNav)
 *   xSOL_supply: number,        // xSOL total supply (levercoinSupply)
 *   CollateralRatio: number,    // Collateral ratio from API
 *   SOL_price: number,          // SOL price in USD from Jupiter
 *   StabilityMode: object,      // Stability mode from API
 *   Collateral_TVL: number,     // Calculated: HYusd_supply + (xSOL_price × xSOL_supply)
 *   Collateral_TVL_SOL: number, // Calculated: Collateral_TVL / SOL_price
 *   Effective_Leverage: number, // Calculated: Collateral_TVL / (xSOL_price × xSOL_supply)
 *   xSOL_icon_url: string       // xSOL icon URL from Hylo metadata
 * }
 */

const HYLO_STATS_API = 'https://api.hylo.so/stats';
const JUPITER_PRICE_API = 'https://lite-api.jup.ag/price/v3';
const HYLO_METADATA_API = 'https://hylo.so/api/token-metadata/batch';

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const XSOL_MINT = '4sWNB8zGWHkh6UnmwiEtzNxL4XrN7uK9tosbESbJFfVs';

/**
 * Fetch xSOL metrics from Hylo and Jupiter APIs (no browser needed)
 * @returns {Promise<Object>} xSOL metrics object
 */
export async function scrapeXSolMetrics() {
  console.log('\n🔷 PHASE 0: Fetching xSOL metrics (direct API calls)...');
  
  try {
    // Step 1: Fetch Hylo stats API
    console.log('  📊 Fetching Hylo stats API...');
    const hyloResponse = await fetch(HYLO_STATS_API);
    
    if (!hyloResponse.ok) {
      throw new Error(`Hylo API returned ${hyloResponse.status}: ${hyloResponse.statusText}`);
    }
    
    const hyloData = await hyloResponse.json();
    const stats = hyloData.exchangeStats;
    const stabilityPoolStats = hyloData.stabilityPoolStats || {};
    
    // Extract values from Hylo API (correct field names)
    const HYusd_supply = stats.stablecoinSupply;
    const xSOL_price = stats.levercoinNav;
    const xSOL_supply = stats.levercoinSupply;
    const CollateralRatio = stats.collateralRatio;
    const StabilityMode = stats.stabilityMode || {};
    const xSOL_sp = stabilityPoolStats.levercoinInPool || 0;
    
    console.log(`    ✓ HYusd supply: ${HYusd_supply.toLocaleString()}`);
    console.log(`    ✓ Collateral ratio: ${CollateralRatio}`);
    console.log(`    ✓ xSOL price: $${xSOL_price.toFixed(6)}`);
    console.log(`    ✓ xSOL supply: ${xSOL_supply.toLocaleString()}`);
    
    // Step 2: Fetch SOL price from Jupiter
    console.log('  📊 Fetching SOL price from Jupiter...');
    const jupiterResponse = await fetch(`${JUPITER_PRICE_API}?ids=${SOL_MINT}`);
    const jupiterData = await jupiterResponse.json();
    const SOL_price = jupiterData?.[SOL_MINT]?.usdPrice || 0;
    console.log(`    ✓ SOL price: $${SOL_price.toFixed(2)}`);
    
    // Step 3: Fetch xSOL icon from Hylo metadata
    console.log('  📊 Fetching xSOL icon from metadata...');
    let xSOL_icon_url = null;
    try {
      const metadataResponse = await fetch(`${HYLO_METADATA_API}?mints=${XSOL_MINT}`);
      const metadataData = await metadataResponse.json();
      const iconPath = metadataData?.metadata?.[XSOL_MINT]?.image;
      if (iconPath) {
        xSOL_icon_url = iconPath.startsWith('http') ? iconPath : `https://hylo.so${iconPath}`;
      }
      console.log(`    ✓ xSOL icon: ${xSOL_icon_url || 'not found'}`);
    } catch (error) {
      console.warn(`    ⚠️ Could not fetch xSOL icon: ${error.message} (non-critical)`);
    }
    
    // Step 4: Calculate derived metrics
    console.log('  🧮 Calculating derived metrics...');
    const Collateral_TVL = HYusd_supply + (xSOL_price * xSOL_supply);
    const Collateral_TVL_SOL = SOL_price > 0 ? Collateral_TVL / SOL_price : 0;
    const Effective_Leverage = (xSOL_price * xSOL_supply) > 0 
      ? Collateral_TVL / (xSOL_price * xSOL_supply) 
      : 0;
    
    console.log(`    ✓ Collateral TVL: $${Collateral_TVL.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
    console.log(`    ✓ Collateral TVL (SOL): ${Collateral_TVL_SOL.toLocaleString(undefined, { maximumFractionDigits: 2 })} SOL`);
    console.log(`    ✓ Effective Leverage: ${Effective_Leverage.toFixed(4)}x`);
    
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
    
    console.log('✅ Phase 0 complete: xSOL metrics fetched successfully');
    return metrics;
    
  } catch (error) {
    console.error('❌ Error in Phase 0 (xSOL metrics):', error.message);
    console.error(error);
    
    // Return null to indicate failure - the main scraper will handle gracefully
    return null;
  }
}
