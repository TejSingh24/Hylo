import { scrapeAllAssets, scrapeDetailPages, fetchExistingGistData } from './scraper.js';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { chmod } from 'fs/promises';

const puppeteer = puppeteerCore;
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
  let browser;
  
  try {
    console.log('🚀 Starting RateX scraper (Two-Phase)...');
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    
    // ========== STEP 1: Fetch Existing Gist Data ==========
    console.log('\n� STEP 1: Fetching existing Gist data...');
    const existingGistData = await fetchExistingGistData();
    
    // ========== STEP 2: Launch Browser ==========
    console.log('\n🌐 STEP 2: Launching browser...');
    const executablePath = await chromium.executablePath();
    
    try {
      await chmod(executablePath, 0o755);
    } catch (chmodError) {
      console.warn('Could not chmod chromium:', chmodError.message);
    }
    
    browser = await puppeteer.launch({
      args: [...chromium.args, '--single-process', '--no-zygote'],
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
    
    const page = await browser.newPage();
    
    // ========== PHASE 1: Scrape Cards Page ==========
    console.log('\n🚀 PHASE 1: Scraping cards page...');
    const cardsData = await scrapeAllAssets();
    
    // Merge with existing Gist data (preserve range/maturity)
    console.log('\n🔀 Merging with existing data...');
    const phase1MergedData = cardsData.map(newAsset => {
      const oldAsset = existingGistData[newAsset.asset];
      
      return {
        // New data from cards (always update these)
        asset: newAsset.asset,
        baseAsset: newAsset.baseAsset,
        leverage: newAsset.leverage,
        apy: newAsset.apy,
        maturityDays: newAsset.maturityDays,
        assetBoost: newAsset.assetBoost,
        ratexBoost: newAsset.ratexBoost,
        impliedYield: newAsset.impliedYield,
        
        // Preserve old detail page data (if exists)
        rangeLower: oldAsset?.rangeLower ?? null,
        rangeUpper: oldAsset?.rangeUpper ?? null,
        maturity: oldAsset?.maturity ?? null,
        maturesIn: oldAsset?.maturesIn ?? null,
      };
    });
    
    console.log(`✅ Phase 1 complete: ${phase1MergedData.length} assets`);
    
    // ========== Update Gist (Phase 1) ==========
    console.log('\n📤 Updating Gist with Phase 1 data...');
    const phase1Timestamp = {
      lastUpdated: new Date().toISOString(),
      phase: 1,
      assetsCount: phase1MergedData.length,
      assets: phase1MergedData
    };
    
    await updateGist(GIST_ID, phase1Timestamp, GIST_TOKEN);
    console.log('✅ Phase 1 Gist updated - Frontend can use calculator now!');
    
    // ========== PHASE 2: Scrape Detail Pages ==========
    const phase2Data = await scrapeDetailPages(page, phase1MergedData, existingGistData);
    
    // ========== Update Gist (Phase 2) ==========
    console.log('\n� Updating Gist with Phase 2 data...');
    const phase2Timestamp = {
      lastUpdated: new Date().toISOString(),
      phase: 2,
      assetsCount: phase2Data.length,
      assets: phase2Data
    };
    
    await updateGist(GIST_ID, phase2Timestamp, GIST_TOKEN);
    console.log('✅ Phase 2 Gist updated - Complete data available!');
    console.log(`🔗 Raw URL: https://gist.githubusercontent.com/TejSingh24/${GIST_ID}/raw/ratex-assets.json`);
    
    // Close browser
    await browser.close();
    console.log('\n✨ Scraping complete!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    
    if (browser) {
      await browser.close();
    }
    
    process.exit(1);
  }
}

main();
