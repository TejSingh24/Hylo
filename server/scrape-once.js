import { scrapeAllAssets } from './scraper.js';

const GIST_ID = process.env.GIST_ID;
const GIST_TOKEN = process.env.GIST_TOKEN;

if (!GIST_ID || !GIST_TOKEN) {
  console.error('❌ Missing required environment variables: GIST_ID and GIST_TOKEN');
  process.exit(1);
}

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

async function main() {
  try {
    console.log('🚀 Starting RateX scraper...');
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    
    // Scrape all assets
    console.log('📊 Scraping RateX assets...');
    const assets = await scrapeAllAssets();
    
    console.log(`✅ Successfully scraped ${assets.length} assets`);
    console.log('Assets:', assets.map(a => a.asset).join(', '));
    
    // Add timestamp to data
    const dataWithTimestamp = {
      lastUpdated: new Date().toISOString(),
      assetsCount: assets.length,
      assets: assets
    };
    
    // Update Gist
    console.log('📝 Updating GitHub Gist...');
    await updateGist(GIST_ID, dataWithTimestamp, GIST_TOKEN);
    
    console.log('✅ Gist updated successfully!');
    console.log(`🔗 Raw URL: https://gist.githubusercontent.com/TejSingh24/${GIST_ID}/raw/ratex-assets.json`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
