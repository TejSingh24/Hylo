/**
 * API service for xSOL Break-Even Calculator
 * 
 * Data source: GitHub Gist (xsolMetrics field)
 * Updated every 5 minutes via GitHub Actions scraper
 */

const GIST_RAW_URL = 'https://gist.githubusercontent.com/TejSingh24/d3a1db6fc79e168cf5dff8d3a2c11706/raw/ratex-assets.json';

export interface XSolMetrics {
  HYusd_supply: number;
  xSOL_price: number;
  xSOL_supply: number;
  CollateralRatio: number;
  SOL_price: number;
  StabilityMode: object;
  Collateral_TVL: number;
  Collateral_TVL_SOL: number;
  Effective_Leverage: number;
  xSOL_icon_url: string | null;
  lastFetched: string;
  source: string;
}

export interface GistDataWithXSol {
  lastUpdated: string;
  phase: number;
  phaseStatus?: string;
  assetsCount: number;
  assets: unknown[];
  xsolMetrics?: XSolMetrics;
}

export interface BreakEvenData {
  metrics: XSolMetrics | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetch xSOL metrics from GitHub Gist
 */
export async function fetchXSolMetricsFromGist(): Promise<BreakEvenData> {
  try {
    console.log('🔍 Fetching xSOL metrics from GitHub Gist...');
    
    const response = await fetch(GIST_RAW_URL, {
      cache: 'no-cache',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const gistData: GistDataWithXSol = await response.json();
    console.log('✅ Gist data loaded. Last updated:', gistData.lastUpdated);
    
    if (!gistData.xsolMetrics) {
      console.warn('⚠️ xsolMetrics not found in Gist - Phase 0 may not have run yet');
      return {
        metrics: null,
        isLoading: false,
        error: 'xSOL metrics not available. Please try again later.',
      };
    }

    console.log('✅ xSOL metrics extracted:', gistData.xsolMetrics);
    
    return {
      metrics: gistData.xsolMetrics,
      isLoading: false,
      error: null,
    };
  } catch (error) {
    console.error('❌ Failed to fetch xSOL metrics:', error);
    return {
      metrics: null,
      isLoading: false,
      error: error instanceof Error ? error.message : 'Failed to load xSOL metrics',
    };
  }
}

/**
 * Calculate xSOL break-even price
 * 
 * Formula: xSOL_be_p = ((xSOL_buy_p × xSOL_supply) + HYusd_supply) / Collateral_TVL_SOL
 * 
 * @param xSOL_buy_p - User's xSOL purchase price (in SOL)
 * @param metrics - xSOL metrics from Gist
 * @returns Break-even price in SOL
 */
export function calculateXSolBreakEvenPrice(
  xSOL_buy_p: number,
  metrics: XSolMetrics
): number {
  const { xSOL_supply, HYusd_supply, Collateral_TVL_SOL } = metrics;
  
  if (Collateral_TVL_SOL === 0) return 0;
  
  const xSOL_be_p = ((xSOL_buy_p * xSOL_supply) + HYusd_supply) / Collateral_TVL_SOL;
  
  return xSOL_be_p;
}

/**
 * Format large numbers with K, M, B suffix
 */
export function formatLargeNumber(num: number | null): string {
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
}

/**
 * Format price with appropriate decimals
 */
export function formatXSolPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return 'N/A';
  if (price < 0.01) return price.toFixed(6);
  if (price < 0.1) return price.toFixed(4);
  if (price < 1) return price.toFixed(3);
  return price.toFixed(2);
}
