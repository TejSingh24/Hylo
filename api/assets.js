// Vercel Serverless Function for /api/assets
import { scrapeAllAssets } from '../scraper.js';

// Cache for scraped data
let dataCache = {
  timestamp: null,
  allAssets: []
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function isCacheValid() {
  if (!dataCache.timestamp) return false;
  return Date.now() - dataCache.timestamp < CACHE_DURATION;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Return cached data if valid
    if (isCacheValid() && dataCache.allAssets.length > 0) {
      console.log('✅ Returning cached data');
      return res.status(200).json({
        success: true,
        data: dataCache.allAssets,
        cached: true,
        cacheAge: Math.floor((Date.now() - dataCache.timestamp) / 1000)
      });
    }

    // Scrape fresh data
    console.log('🔄 Cache miss or expired, scraping fresh data...');
    const assets = await scrapeAllAssets();
    
    // Update cache
    dataCache = {
      timestamp: Date.now(),
      allAssets: assets
    };

    return res.status(200).json({
      success: true,
      data: assets,
      cached: false
    });

  } catch (error) {
    console.error('Error in /api/assets:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch assets'
    });
  }
}
