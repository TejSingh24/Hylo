// API Base URL - configure based on environment
// For local development: http://localhost:3001
// For production: set VITE_API_URL environment variable in Vercel
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

console.log('API Base URL:', API_BASE_URL); // Debug log to verify URL

export interface AssetData {
  asset: string;
  leverage: number | null;
  apy: number | null;
  maturityDays: number | null;
  assetBoost: number | null;
  ratexBoost: number | null;
}

export interface ApiResponse<T> {
  success: boolean;
  cached?: boolean;
  timestamp?: number;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Fetch all available assets from Rate-X
 */
export async function fetchAllAssets(): Promise<AssetData[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/assets`);
    const result: ApiResponse<AssetData[]> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch assets');
    }
    
    return result.data || [];
  } catch (error) {
    console.error('Error fetching all assets:', error);
    throw error;
  }
}

/**
 * Fetch specific asset data from Rate-X
 */
export async function fetchAssetData(assetName: string): Promise<AssetData> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/asset/${assetName}`);
    const result: ApiResponse<AssetData> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || `Failed to fetch data for ${assetName}`);
    }
    
    if (!result.data) {
      throw new Error(`No data returned for ${assetName}`);
    }
    
    return result.data;
  } catch (error) {
    console.error(`Error fetching asset ${assetName}:`, error);
    throw error;
  }
}

/**
 * Force refresh the cache
 */
export async function refreshCache(): Promise<AssetData[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/refresh`, {
      method: 'POST'
    });
    const result: ApiResponse<AssetData[]> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to refresh cache');
    }
    
    return result.data || [];
  } catch (error) {
    console.error('Error refreshing cache:', error);
    throw error;
  }
}

/**
 * Check API health status
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
}
