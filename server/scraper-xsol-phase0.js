/**
 * Phase 0: xSOL Metrics Fetcher
 * 
 * Fetches xSOL break-even metrics from Hylo API + Jupiter API
 * Falls back to Solana blockchain if Hylo API fails
 * 
 * Primary: Hylo API (accurate CollateralRatio)
 * Fallback: Solana blockchain + Jupiter API
 * 
 * Formulas:
 * - Collateral_TVL = HYusd_supply + (xSOL_price × xSOL_supply)
 * - Collateral_TVL_SOL = Collateral_TVL / SOL_price
 * - Effective_Leverage = Collateral_TVL / (xSOL_price × xSOL_supply)
 */

const HYLO_STATS_API = 'https://api.hylo.so/stats';
const HYLO_METADATA_API = 'https://hylo.so/api/token-metadata/batch';
const JUPITER_PRICE_API = 'https://lite-api.jup.ag/price/v3';

// Token mint addresses on Solana
const XSOL_MINT = '4sWNB8zGWHkh6UnmwiEtzNxL4XrN7uK9tosbESbJFfVs';
const HYUSD_MINT = '5YMkXAYccHSGnHn9nob9xEvv6Pvka9DZWH7nTbotTu9E';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// Free Solana RPC endpoints
const RPC_ENDPOINTS = [
  'https://api.mainnet-beta.solana.com',
  'https://rpc.ankr.com/solana',
];

/**
 * Fetch token supply from Solana blockchain using RPC
 * @param {string} mintAddress - Token mint address
 * @returns {Promise<number|null>} Token supply or null on error
 */
async function fetchTokenSupplyFromRPC(mintAddress) {
  for (const rpcUrl of RPC_ENDPOINTS) {
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTokenSupply',
          params: [mintAddress]
        })
      });

      if (!response.ok) continue;

      const data = await response.json();
      if (data.result && data.result.value) {
        return parseFloat(data.result.value.uiAmount);
      }
    } catch (error) {
      console.warn(`  ⚠️ RPC ${rpcUrl} failed:`, error.message);
      continue;
    }
  }
  return null;
}

/**
 * Fetch prices from Jupiter API
 * @param {string[]} mintAddresses - Array of token mint addresses
 * @returns {Promise<Object>} Price data object
 */
async function fetchPricesFromJupiter(mintAddresses) {
  try {
    const ids = mintAddresses.join(',');
    const url = `${JUPITER_PRICE_API}?ids=${ids}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Jupiter API returned ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('  ❌ Jupiter API error:', error.message);
    return null;
  }
}

/**
 * Fetch xSOL icon from Hylo metadata API
 * @returns {Promise<string|null>} Icon URL or null
 */
async function fetchXSolIcon() {
  try {
    console.log('    Fetching xSOL icon from metadata API...');
    const response = await fetch(`${HYLO_METADATA_API}?mints=${XSOL_MINT}`);
    
    if (!response.ok) {
      console.warn(`    ⚠️ Metadata API returned ${response.status}`);
      return 'https://hylo.so/icons/xsol.svg'; // Fallback to known URL
    }
    
    const data = await response.json();
    console.log('    Metadata response:', JSON.stringify(data).substring(0, 200));
    
    const iconPath = data?.metadata?.[XSOL_MINT]?.image;
    if (iconPath) {
      const fullUrl = iconPath.startsWith('http') ? iconPath : `https://hylo.so${iconPath}`;
      console.log(`    ✓ Icon URL: ${fullUrl}`);
      return fullUrl;
    }
    
    console.warn('    ⚠️ No icon path in metadata, using fallback');
    return 'https://hylo.so/icons/xsol.svg'; // Fallback
  } catch (error) {
    console.warn(`    ⚠️ Could not fetch xSOL icon: ${error.message}`);
    return 'https://hylo.so/icons/xsol.svg'; // Fallback to known URL
  }
}

/**
 * PRIMARY: Fetch metrics from Hylo API
 * @returns {Promise<Object|null>} Metrics object or null on failure
 */
async function fetchFromHyloAPI() {
  console.log('\n  📊 [PRIMARY] Fetching from Hylo API...');
  
  const hyloResponse = await fetch(HYLO_STATS_API);
  
  if (!hyloResponse.ok) {
    throw new Error(`Hylo API returned ${hyloResponse.status}: ${hyloResponse.statusText}`);
  }
  
  const hyloData = await hyloResponse.json();
  const stats = hyloData.exchangeStats;
  const stabilityPoolStats = hyloData.stabilityPoolStats || {};
  
  // Extract values from Hylo API
  const HYusd_supply = stats.stablecoinSupply;
  const xSOL_price = stats.levercoinNav;
  const xSOL_supply = stats.levercoinSupply;
  const CollateralRatio = stats.collateralRatio;
  const StabilityMode = stats.stabilityMode || {};
  const xSOL_sp = stabilityPoolStats.levercoinInPool || 0;
  
  console.log(`    ✓ HYusd supply: ${HYusd_supply?.toLocaleString() || 'N/A'}`);
  console.log(`    ✓ xSOL price: $${xSOL_price?.toFixed(6) || 'N/A'}`);
  console.log(`    ✓ xSOL supply: ${xSOL_supply?.toLocaleString() || 'N/A'}`);
  console.log(`    ✓ Collateral ratio: ${CollateralRatio}`);
  console.log(`    ✓ Stability Pool xSOL: ${xSOL_sp?.toLocaleString() || '0'}`);
  
  // Fetch SOL price from Jupiter
  console.log('  📊 Fetching SOL price from Jupiter...');
  const priceData = await fetchPricesFromJupiter([SOL_MINT]);
  const SOL_price = priceData?.[SOL_MINT]?.usdPrice || 0;
  console.log(`    ✓ SOL price: $${SOL_price.toFixed(2)}`);
  
  // Fetch xSOL icon
  const xSOL_icon_url = await fetchXSolIcon();
  console.log(`    ✓ xSOL icon: ${xSOL_icon_url || 'not found'}`);
  
  // Calculate derived metrics
  const Collateral_TVL = HYusd_supply + (xSOL_price * xSOL_supply);
  const Collateral_TVL_SOL = SOL_price > 0 ? Collateral_TVL / SOL_price : 0;
  const Effective_Leverage = (xSOL_price * xSOL_supply) > 0 
    ? Collateral_TVL / (xSOL_price * xSOL_supply) 
    : 0;
  
  return {
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
}

/**
 * FALLBACK: Fetch metrics from blockchain + Jupiter
 * @returns {Promise<Object|null>} Metrics object or null on failure
 */
async function fetchFromBlockchain() {
  console.log('\n  📊 [FALLBACK] Fetching from blockchain...');
  
  // Fetch xSOL supply from blockchain
  console.log('    Fetching xSOL supply from Solana...');
  const xSOL_supply = await fetchTokenSupplyFromRPC(XSOL_MINT);
  if (xSOL_supply === null) {
    throw new Error('Failed to fetch xSOL supply from blockchain');
  }
  console.log(`    ✓ xSOL supply: ${xSOL_supply.toLocaleString()}`);

  // Fetch HYusd supply from blockchain
  console.log('    Fetching HYusd supply from Solana...');
  const HYusd_supply = await fetchTokenSupplyFromRPC(HYUSD_MINT);
  if (HYusd_supply === null) {
    throw new Error('Failed to fetch HYusd supply from blockchain');
  }
  console.log(`    ✓ HYusd supply: ${HYusd_supply.toLocaleString()}`);

  // Fetch prices from Jupiter
  console.log('    Fetching prices from Jupiter API...');
  const priceData = await fetchPricesFromJupiter([SOL_MINT, XSOL_MINT]);
  if (!priceData) {
    throw new Error('Failed to fetch prices from Jupiter');
  }

  const SOL_price = priceData[SOL_MINT]?.usdPrice || 0;
  const xSOL_price = priceData[XSOL_MINT]?.usdPrice || 0;

  if (SOL_price === 0 || xSOL_price === 0) {
    throw new Error('Invalid price data from Jupiter');
  }

  console.log(`    ✓ SOL price: $${SOL_price.toFixed(2)}`);
  console.log(`    ✓ xSOL price: $${xSOL_price.toFixed(6)}`);

  // Calculate derived metrics
  const Collateral_TVL = HYusd_supply + (xSOL_price * xSOL_supply);
  const Collateral_TVL_SOL = Collateral_TVL / SOL_price;
  const Effective_Leverage = Collateral_TVL / (xSOL_price * xSOL_supply);
  const CollateralRatio = Collateral_TVL / HYusd_supply;

  // Fetch xSOL icon
  const xSOL_icon_url = await fetchXSolIcon();

  return {
    HYusd_supply,
    xSOL_price,
    xSOL_supply,
    CollateralRatio,
    SOL_price,
    StabilityMode: {},
    xSOL_sp: 0,
    Collateral_TVL,
    Collateral_TVL_SOL,
    Effective_Leverage,
    xSOL_icon_url,
    lastFetched: new Date().toISOString(),
    source: 'blockchain-jupiter'
  };
}

/**
 * Main Phase 0 function - fetch xSOL metrics
 * @returns {Promise<Object|null>} xSOL metrics object or null on failure
 */
export async function fetchXSolMetricsPhase0() {
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 0: Fetching xSOL Metrics');
  console.log('='.repeat(80));
  
  let metrics = null;
  
  // Try Hylo API first (primary)
  try {
    metrics = await fetchFromHyloAPI();
    console.log('\n  ✅ Hylo API succeeded!');
  } catch (hyloError) {
    console.warn(`\n  ⚠️ Hylo API failed: ${hyloError.message}`);
    console.log('  🔄 Falling back to blockchain...');
    
    // Fallback to blockchain
    try {
      metrics = await fetchFromBlockchain();
      console.log('\n  ✅ Blockchain fallback succeeded!');
    } catch (blockchainError) {
      console.error(`\n  ❌ Blockchain fallback also failed: ${blockchainError.message}`);
      return null;
    }
  }
  
  if (metrics) {
    console.log('\n  🧮 Final calculated metrics:');
    console.log(`    ✓ Collateral TVL: $${metrics.Collateral_TVL.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
    console.log(`    ✓ Collateral TVL (SOL): ${metrics.Collateral_TVL_SOL.toLocaleString(undefined, { maximumFractionDigits: 2 })} SOL`);
    console.log(`    ✓ Effective Leverage: ${metrics.Effective_Leverage.toFixed(4)}x`);
    console.log(`    ✓ Source: ${metrics.source}`);
    
    console.log('\n✅ Phase 0 SUCCESS: xSOL metrics fetched!');
  }
  
  console.log('='.repeat(80) + '\n');
  return metrics;
}

// For standalone testing
const isMainModule = import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`;
if (isMainModule) {
  console.log('🧪 Testing Phase 0 xSOL Metrics Fetcher...\n');
  fetchXSolMetricsPhase0()
    .then(metrics => {
      if (metrics) {
        console.log('\n📊 Final Metrics Object:');
        console.log(JSON.stringify(metrics, null, 2));
      }
    })
    .catch(error => {
      console.error('\n💥 Unhandled error:', error);
    });
}
