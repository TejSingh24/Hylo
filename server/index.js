import express from 'express';
import cors from 'cors';
import { scrapeAssetData, scrapeAllAssets } from './scraper.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Cache for scraped data
let dataCache = {
  timestamp: null,
  data: {},
  allAssets: []
};

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * Check if cache is valid
 */
function isCacheValid() {
  if (!dataCache.timestamp) return false;
  return Date.now() - dataCache.timestamp < CACHE_DURATION;
}

/**
 * GET /api/assets
 * Get all available assets
 */
app.get('/api/assets', async (req, res) => {
  try {
    console.log('Fetching all assets...');
    
    // Check cache
    if (isCacheValid() && dataCache.allAssets.length > 0) {
      console.log('Returning cached data for all assets');
      return res.json({
        success: true,
        cached: true,
        timestamp: dataCache.timestamp,
        data: dataCache.allAssets
      });
    }
    
    // Scrape fresh data
    console.log('Cache expired or empty, scraping fresh data...');
    const allAssets = await scrapeAllAssets();
    
    // Update cache
    dataCache.timestamp = Date.now();
    dataCache.allAssets = allAssets;
    
    // Also update individual asset cache
    allAssets.forEach(asset => {
      dataCache.data[asset.asset] = asset;
    });
    
    res.json({
      success: true,
      cached: false,
      timestamp: dataCache.timestamp,
      data: allAssets
    });
    
  } catch (error) {
    console.error('Error fetching all assets:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/asset/:assetName
 * Get specific asset data
 */
app.get('/api/asset/:assetName', async (req, res) => {
  try {
    const { assetName } = req.params;
    console.log(`Fetching data for asset: ${assetName}`);
    
    // Check cache
    if (isCacheValid() && dataCache.data[assetName]) {
      console.log('Returning cached data for', assetName);
      return res.json({
        success: true,
        cached: true,
        timestamp: dataCache.timestamp,
        data: dataCache.data[assetName]
      });
    }
    
    // Scrape fresh data
    console.log('Cache expired or empty, scraping fresh data...');
    const assetData = await scrapeAssetData(assetName);
    
    // Update cache
    dataCache.timestamp = Date.now();
    dataCache.data[assetName] = assetData;
    
    res.json({
      success: true,
      cached: false,
      timestamp: dataCache.timestamp,
      data: assetData
    });
    
  } catch (error) {
    console.error(`Error fetching asset ${req.params.assetName}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/refresh
 * Force refresh cache
 */
app.post('/api/refresh', async (req, res) => {
  try {
    console.log('Force refreshing cache...');
    
    const allAssets = await scrapeAllAssets();
    
    // Update cache
    dataCache.timestamp = Date.now();
    dataCache.allAssets = allAssets;
    dataCache.data = {};
    
    allAssets.forEach(asset => {
      dataCache.data[asset.asset] = asset;
    });
    
    res.json({
      success: true,
      message: 'Cache refreshed successfully',
      timestamp: dataCache.timestamp,
      data: allAssets
    });
    
  } catch (error) {
    console.error('Error refreshing cache:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Rate-X Scraper API is running',
    cacheStatus: {
      valid: isCacheValid(),
      timestamp: dataCache.timestamp,
      assetCount: Object.keys(dataCache.data).length
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Rate-X Scraper API running on http://localhost:${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/assets`);
  console.log(`   GET  /api/asset/:assetName`);
  console.log(`   POST /api/refresh`);
});

export default app;
