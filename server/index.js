import express from 'express';
import cors from 'cors';
import { scrapeAssetData, scrapeAllAssets } from './scraper.js';

// Add global error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

const app = express();
const PORT = process.env.PORT || 3001;

// CORS Configuration - Allow domains from environment variable
// Set ALLOWED_ORIGINS in environment variables (comma-separated list)
// Example: "https://hylo.vercel.app,https://hylo-staging.vercel.app"
const getAllowedOrigins = () => {
  const envOrigins = process.env.ALLOWED_ORIGINS || '';
  const origins = envOrigins.split(',').map(origin => origin.trim()).filter(Boolean);
  
  // Always allow localhost for development
  const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4173',
  ];
  
  // If no environment variable set, allow all *.vercel.app (less secure, for testing)
  if (origins.length === 0) {
    console.log('⚠️  No ALLOWED_ORIGINS set. Allowing all *.vercel.app domains (not recommended for production)');
    return [...defaultOrigins, '*.vercel.app'];
  }
  
  console.log('✅ CORS allowed origins:', [...defaultOrigins, ...origins]);
  return [...defaultOrigins, ...origins];
};

const allowedOrigins = getAllowedOrigins();

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    // Check if origin is in the allowed list
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      // Handle wildcard pattern (*.vercel.app)
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace('*', '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(origin);
      }
      // Exact match
      return origin === allowedOrigin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
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
