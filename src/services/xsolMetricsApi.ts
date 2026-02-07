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

export interface Asset {
  baseAsset?: string;
  assetSymbolImage?: string;
  [key: string]: unknown;
}

export interface GistDataWithXSol {
  lastUpdated: string;
  phase: number;
  phaseStatus?: string;
  assetsCount: number;
  assets: Asset[];
  xsolMetrics?: XSolMetrics;
}

export interface BreakEvenData {
  metrics: XSolMetrics | null;
  isLoading: boolean;
  error: string | null;
  xsolIconUrl: string | null;
}

/**
 * Fetch xSOL metrics from Vercel API endpoint (with Gist fallback)
 * Primary: /api/xsol-metrics (Hylo API via serverless function)
 * Fallback: GitHub Gist
 */
export async function fetchXSolMetrics(): Promise<BreakEvenData> {
  try {
    console.log('🔍 Fetching xSOL metrics from /api/xsol-metrics...');
    
    const response = await fetch('/api/xsol-metrics', {
      cache: 'no-cache',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const metrics: XSolMetrics = await response.json();
    console.log('✅ xSOL metrics from API:', metrics);
    
    // Get xSOL icon from Gist (API doesn't return it)
    const gistData = await fetchGistForIcon();
    
    return {
      metrics,
      isLoading: false,
      error: null,
      xsolIconUrl: gistData.xsolIconUrl,
    };
  } catch (error) {
    console.warn('⚠️ API failed, falling back to Gist:', error);
    return fetchXSolMetricsFromGist();
  }
}

/**
 * Fetch just the xSOL icon URL from Gist
 */
async function fetchGistForIcon(): Promise<{ xsolIconUrl: string | null }> {
  try {
    const response = await fetch(GIST_RAW_URL, { cache: 'no-cache' });
    const gistData: GistDataWithXSol = await response.json();
    const xsolAsset = gistData.assets.find(a => a.baseAsset === 'xSOL');
    return { xsolIconUrl: xsolAsset?.assetSymbolImage || null };
  } catch {
    return { xsolIconUrl: null };
  }
}

/**
 * Fetch xSOL metrics from GitHub Gist (fallback)
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
    
    // Find xSOL icon from any asset with baseAsset === 'xSOL'
    const xsolAsset = gistData.assets.find(a => a.baseAsset === 'xSOL');
    const xsolIconUrl = xsolAsset?.assetSymbolImage || null;
    console.log('🖼️ xSOL icon URL:', xsolIconUrl || 'Not found, will use fallback');
    
    if (!gistData.xsolMetrics) {
      console.warn('⚠️ xsolMetrics not found in Gist - Phase 0 may not have run yet');
      return {
        metrics: null,
        isLoading: false,
        error: 'xSOL metrics not available. Please try again later.',
        xsolIconUrl,
      };
    }

    console.log('✅ xSOL metrics extracted:', gistData.xsolMetrics);
    
    return {
      metrics: gistData.xsolMetrics,
      isLoading: false,
      error: null,
      xsolIconUrl,
    };
  } catch (error) {
    console.error('❌ Failed to fetch xSOL metrics:', error);
    return {
      metrics: null,
      isLoading: false,
      error: error instanceof Error ? error.message : 'Failed to load xSOL metrics',
      xsolIconUrl: null,
    };
  }
}

/**
 * Calculate xSOL break-even price
 * 
 * Formula: xSOL_be_p = ((xSOL_buy_p × xSOL_supply) + HYusd_supply) / Collateral_TVL_SOL
 * 
 * @param xSOL_buy_p - User's xSOL purchase price (in USD)
 * @param metrics - xSOL metrics from Gist
 * @returns Break-even price in USD
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
