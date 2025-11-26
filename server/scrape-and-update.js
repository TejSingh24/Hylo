import { scrapeAllAssets } from './scraper.js';
import { scrapeAllExponentAssets } from './scraper-exponent.js';
import express from 'express';
import cors from 'cors';

const GIST_ID = process.env.GIST_ID;
const GIST_TOKEN = process.env.GIST_TOKEN;
const PORT = process.env.PORT || 3000;
const SCRAPE_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

if (!GIST_ID || !GIST_TOKEN) {
  console.error('❌ Missing required environment variables: GIST_ID and GIST_TOKEN');
  process.exit(1);
}

// Express app for health check and manual refresh
const app = express();
app.use(cors());
app.use(express.json());

async function updateGist(gistId, data, token) {
  const filename = 'ratex-assets.json';
  
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Hylo-RateX-Scraper'
    },
    body: JSON.stringify({
      files: {
        [filename]: {
          content: JSON.stringify(data, null, 2)
        }
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update gist: ${response.status} ${error}`);
  }

  return await response.json();
}

async function scrapeAndUpdate() {
  try {
    console.log('🚀 Starting RateX + Exponent scraper...');
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    
    // Scrape both platforms in parallel
    console.log('📊 Scraping RateX + Exponent (Phase 1)...');
    const [ratexAssets, exponentAssets] = await Promise.all([
      scrapeAllAssets(),
      scrapeAllExponentAssets() // No validation yet
    ]);
    
    console.log(`✅ RateX: ${ratexAssets.length} assets`);
    console.log(`✅ Exponent: ${exponentAssets.length} assets`);
    
    // Apply APY and assetBoost validation in-memory (no re-scraping!)
    console.log('🔄 Applying APY and assetBoost validation...');
    const ratexMap = new Map(
      ratexAssets.map(asset => [asset.baseAsset.toLowerCase(), asset])
    );
    
    let apyValidatedCount = 0;
    let boostValidatedCount = 0;
    exponentAssets.forEach(exponentAsset => {
      const ratexMatch = ratexMap.get(exponentAsset.baseAsset.toLowerCase());
      if (ratexMatch) {
        // Update APY if RateX has it
        if (ratexMatch.apy !== null) {
          console.log(`  ✓ ${exponentAsset.asset}: APY ${exponentAsset.apy}% → ${ratexMatch.apy}%`);
          exponentAsset.apy = ratexMatch.apy;
          apyValidatedCount++;
        }
        
        // Update assetBoost if RateX has it
        if (ratexMatch.assetBoost !== null) {
          console.log(`  ✓ ${exponentAsset.asset}: assetBoost ${exponentAsset.assetBoost}x → ${ratexMatch.assetBoost}x`);
          exponentAsset.assetBoost = ratexMatch.assetBoost;
          boostValidatedCount++;
        }
      }
    });
    
    console.log(`✅ APY validation: ${apyValidatedCount}/${exponentAssets.length} assets updated`);
    console.log(`✅ assetBoost validation: ${boostValidatedCount}/${exponentAssets.length} assets updated`);
    
    // Merge assets from both platforms
    const allAssets = [...ratexAssets, ...exponentAssets];
    
    console.log(`✅ Successfully scraped ${allAssets.length} total assets (${ratexAssets.length} RateX + ${exponentAssets.length} Exponent)`);
    console.log('Assets:', allAssets.map(a => `${a.asset} (${a.source})`).join(', '));
    
    // Add timestamp to data
    const dataWithTimestamp = {
      lastUpdated: new Date().toISOString(),
      assetsCount: allAssets.length,
      assets: allAssets
    };
    
    // Update Gist
    console.log('📝 Updating GitHub Gist...');
    await updateGist(GIST_ID, dataWithTimestamp, GIST_TOKEN);
    
    console.log('✅ Gist updated successfully!');
    console.log(`🔗 View at: https://gist.github.com/${GIST_ID}`);
    console.log(`🔗 Raw URL: https://gist.githubusercontent.com/TejSingh24/${GIST_ID}/raw/ratex-assets.json`);
    
    return dataWithTimestamp;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    throw error;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'running',
    uptime: process.uptime(),
    gistUrl: `https://gist.github.com/${GIST_ID}`
  });
});

// Manual refresh endpoint
app.post('/refresh', async (req, res) => {
  try {
    console.log('📡 Manual refresh triggered');
    const data = await scrapeAndUpdate();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

async function main() {
  // Start the Express server
  app.listen(PORT, () => {
    console.log(`🌐 Server running on port ${PORT}`);
    console.log(`📍 Health: http://localhost:${PORT}/health`);
    console.log(`🔄 Manual refresh: POST http://localhost:${PORT}/refresh`);
  });
  
  // Run scraper immediately on startup
  console.log('🎬 Running initial scrape...');
  await scrapeAndUpdate();
  
  // Then run every 6 hours in a continuous loop
  console.log(`⏰ Scheduled to run every ${SCRAPE_INTERVAL / (60 * 60 * 1000)} hours`);
  
  setInterval(async () => {
    console.log('\n⏰ Running scheduled scrape...');
    await scrapeAndUpdate();
  }, SCRAPE_INTERVAL);
  
  // Keep the process alive
  console.log('✅ Continuous loop started - process will run indefinitely');
}

main();
