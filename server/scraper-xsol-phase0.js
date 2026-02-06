/**
 * Phase 0: xSOL Metrics Fetcher
 * 
 * Fetches xSOL break-even metrics from Solana blockchain + Jupiter API
 * This runs BEFORE Phase 1 and Phase 2 to provide real-time xSOL data
 * 
 * Data Sources:
 * - Solana RPC: xSOL supply, HYusd supply
 * - Jupiter API: SOL price, xSOL price
 * 
 * Formulas:
 * - Collateral_TVL = HYusd_supply + (xSOL_price × xSOL_supply)
 * - Collateral_TVL_SOL = Collateral_TVL / SOL_price
 * - Effective_Leverage = Collateral_TVL / (xSOL_price × xSOL_supply)
 */

// Token mint addresses on Solana
const XSOL_MINT = '4sWNB8zGWHkh6UnmwiEtzNxL4XrN7uK9tosbESbJFfVs';
const HYUSD_MINT = '5YMkXAYccHSGnHn9nob9xEvv6Pvka9DZWH7nTbotTu9E';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

const JUPITER_PRICE_API = 'https://lite-api.jup.ag/price/v3';

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
    const url = `${JUPITER_PRICE_API}?ids=${ids}&vsToken=${USDC_MINT}`;
    
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
 * Main Phase 0 function - fetch xSOL metrics
 * @returns {Promise<Object|null>} xSOL metrics object or null on failure
 */
export async function fetchXSolMetricsPhase0() {
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 0: Fetching xSOL Metrics');
  console.log('='.repeat(80));
  
  try {
    // Step 1: Fetch xSOL supply from blockchain
    console.log('\n  📊 Fetching xSOL supply from Solana...');
    const xSOL_supply = await fetchTokenSupplyFromRPC(XSOL_MINT);
    if (xSOL_supply === null) {
      throw new Error('Failed to fetch xSOL supply from blockchain');
    }
    console.log(`    ✓ xSOL supply: ${xSOL_supply.toLocaleString()}`);

    // Step 2: Fetch HYusd supply from blockchain
    console.log('  📊 Fetching HYusd supply from Solana...');
    const HYusd_supply = await fetchTokenSupplyFromRPC(HYUSD_MINT);
    if (HYusd_supply === null) {
      throw new Error('Failed to fetch HYusd supply from blockchain');
    }
    console.log(`    ✓ HYusd supply: ${HYusd_supply.toLocaleString()}`);

    // Step 3: Fetch prices from Jupiter
    console.log('  📊 Fetching prices from Jupiter API...');
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

    // Step 4: Calculate derived metrics
    console.log('  🧮 Calculating derived metrics...');

    // Collateral_TVL = HYusd_supply + (xSOL_price × xSOL_supply)
    const Collateral_TVL = HYusd_supply + (xSOL_price * xSOL_supply);

    // Collateral_TVL_SOL = Collateral_TVL / SOL_price
    const Collateral_TVL_SOL = Collateral_TVL / SOL_price;

    // Effective_Leverage = Collateral_TVL / (xSOL_price × xSOL_supply)
    const Effective_Leverage = Collateral_TVL / (xSOL_price * xSOL_supply);

    // CollateralRatio - approximate (not available from blockchain directly)
    // Using formula: CollateralRatio ≈ Collateral_TVL / HYusd_supply
    const CollateralRatio = Collateral_TVL / HYusd_supply;

    console.log(`    ✓ Collateral TVL: $${Collateral_TVL.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
    console.log(`    ✓ Collateral TVL (SOL): ${Collateral_TVL_SOL.toLocaleString(undefined, { maximumFractionDigits: 2 })} SOL`);
    console.log(`    ✓ Effective Leverage: ${Effective_Leverage.toFixed(4)}x`);
    console.log(`    ✓ Collateral Ratio: ${(CollateralRatio * 100).toFixed(2)}%`);

    // Build metrics object
    const metrics = {
      HYusd_supply,
      xSOL_price,
      xSOL_supply,
      CollateralRatio,
      SOL_price,
      StabilityMode: {},
      Collateral_TVL,
      Collateral_TVL_SOL,
      Effective_Leverage,
      xSOL_icon_url: null,
      lastFetched: new Date().toISOString(),
      source: 'blockchain-jupiter'
    };

    console.log('\n✅ Phase 0 SUCCESS: xSOL metrics fetched from blockchain!');
    return metrics;

  } catch (error) {
    console.error('\n❌ Phase 0 FAILED:', error.message);
    return null;
  }
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
