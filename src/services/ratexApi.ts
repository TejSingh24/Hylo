// GitHub Gist URL - Public, no authentication needed
const GIST_RAW_URL = 'https://gist.githubusercontent.com/TejSingh24/d3a1db6fc79e168cf5dff8d3a2c11706/raw/ratex-assets.json';

console.log('Fetching RateX data from GitHub Gist'); // Debug log

export interface AssetData {
  asset: string;
  leverage: number | null;
  apy: number | null;
  maturityDays: number | null;
  assetBoost: number | null;
  ratexBoost: number | null;
}

export interface GistResponse {
  lastUpdated: string;
  assetsCount: number;
  assets: AssetData[];
}

/**
 * Fetch all available assets from Rate-X (via GitHub Gist)
 */
export async function fetchAllAssets(): Promise<AssetData[]> {
  try {
    // Add timestamp to bypass cache
    const response = await fetch(`${GIST_RAW_URL}?t=${Date.now()}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from Gist: ${response.status}`);
    }
    
    const result: GistResponse = await response.json();
    
    return result.assets || [];
  } catch (error) {
    console.error('Error fetching all assets from Gist:', error);
    throw error;
  }
}

/**
 * Fetch specific asset data from Rate-X (via GitHub Gist)
 */
export async function fetchAssetData(assetName: string): Promise<AssetData> {
  try {
    // Fetch all assets and find the specific one
    const assets = await fetchAllAssets();
    const asset = assets.find(a => a.asset.toLowerCase() === assetName.toLowerCase());
    
    if (!asset) {
      throw new Error(`Asset ${assetName} not found`);
    }
    
    return asset;
  } catch (error) {
    console.error(`Error fetching asset ${assetName}:`, error);
    throw error;
  }
}

/**
 * Get last update timestamp
 */
export async function getLastUpdated(): Promise<string> {
  try {
    const response = await fetch(`${GIST_RAW_URL}?t=${Date.now()}`);
    const result: GistResponse = await response.json();
    return result.lastUpdated || 'Unknown';
  } catch (error) {
    console.error('Error getting last updated time:', error);
    return 'Unknown';
  }
}

/**
 * Force refresh - not needed with Gist approach
 * Kept for compatibility, but returns current data
 */
export async function refreshCache(): Promise<AssetData[]> {
  console.log('Note: Data is automatically updated by GitHub Actions every 6 hours');
  return fetchAllAssets();
}

/**
 * Check if Gist data is available
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${GIST_RAW_URL}?t=${Date.now()}`);
    return response.ok;
  } catch (error) {
    console.error('Gist health check failed:', error);
    return false;
  }
}
