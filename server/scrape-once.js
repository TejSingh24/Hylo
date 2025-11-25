import { scrapeAllAssets, scrapeDetailPages, scrapeExponentDetailPages, fetchExistingGistData, calculateMaturesIn, calculateYtMetrics, calculateDaysToMaturity } from './scraper.js';
import { scrapeAllExponentAssets } from './scraper-exponent.js';
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
    
    // ========== PHASE 1: Scrape Cards Page (PARALLEL) ==========
    console.log('\n🚀 PHASE 1: Scraping RateX + Exponent in parallel...');
    
    // Run both scrapers simultaneously
    const [ratexData, exponentData] = await Promise.all([
      scrapeAllAssets(),
      scrapeAllExponentAssets() // No validation yet
    ]);
    
    console.log(`✅ RateX: ${ratexData.length} assets`);
    console.log(`✅ Exponent: ${exponentData.length} assets`);
    
    // Apply APY and assetBoost validation in-memory (no re-scraping!)
    console.log('\n🔄 Applying APY and assetBoost validation...');
    const ratexMap = new Map(
      ratexData.map(asset => [asset.baseAsset.toLowerCase(), asset])
    );
    
    let apyValidatedCount = 0;
    let boostValidatedCount = 0;
    exponentData.forEach(exponentAsset => {
      const ratexMatch = ratexMap.get(exponentAsset.baseAsset.toLowerCase());
      const oldAsset = existingGistData[exponentAsset.asset];
      
      // Update APY if RateX has it (more reliable)
      if (ratexMatch && ratexMatch.apy !== null) {
        console.log(`  ✓ ${exponentAsset.asset}: Overriding APY ${exponentAsset.apy}% → ${ratexMatch.apy}%`);
        exponentAsset.apy = ratexMatch.apy;
        apyValidatedCount++;
      }
      
      // Asset Boost Priority: OLD Gist → RateX match → null
      if (oldAsset && oldAsset.assetBoost !== null) {
        console.log(`  ✓ ${exponentAsset.asset}: Using OLD gist assetBoost ${oldAsset.assetBoost}x`);
        exponentAsset.assetBoost = oldAsset.assetBoost;
        boostValidatedCount++;
      } else if (ratexMatch && ratexMatch.assetBoost !== null) {
        console.log(`  ✓ ${exponentAsset.asset}: Using RateX assetBoost ${ratexMatch.assetBoost}x`);
        exponentAsset.assetBoost = ratexMatch.assetBoost;
        boostValidatedCount++;
      }
      // else: keep null (will be filled in Phase 2)
      
      // Maturity Priority: OLD Gist → Asset name calculation
      if (oldAsset && oldAsset.maturity) {
        exponentAsset.maturity = oldAsset.maturity;
        exponentAsset.maturityDays = Math.floor(calculateDaysToMaturity(oldAsset.maturity, new Date().toISOString()));
        exponentAsset.maturesIn = calculateMaturesIn(oldAsset.maturity);
      }
      // else: keep maturity from asset name calculation (done in scraper-exponent.js)
    });
    
    console.log(`✅ APY validation: ${apyValidatedCount}/${exponentData.length} assets updated`);
    console.log(`✅ assetBoost validation: ${boostValidatedCount}/${exponentData.length} assets updated`);
    
    // Merge RateX + Exponent assets
    const allAssets = [...ratexData, ...exponentData];
    console.log(`\n📊 Total combined assets: ${allAssets.length} (${ratexData.length} RateX + ${exponentData.length} Exponent)`);
    
    // Merge with existing Gist data (preserve range/maturity)
    console.log('\n🔀 Merging with existing data and calculating YT metrics...');
    const phase1Timestamp = new Date().toISOString(); // Single timestamp for all Phase 1 calculations
    
    const phase1MergedData = allAssets.map(newAsset => {
      const oldAsset = existingGistData[newAsset.asset];
      
      // Preserve old detail page data (if exists)
      const rangeLower = oldAsset?.rangeLower ?? null;
      const rangeUpper = oldAsset?.rangeUpper ?? null;
      const maturity = oldAsset?.maturity ?? null;
      
      // Recalculate maturesIn using preserved maturity date
      const maturesIn = maturity ? calculateMaturesIn(maturity) : null;
      
      // Calculate YT metrics using:
      // - Fresh: leverage, apy, impliedYield, maturityDays, assetBoost (from cards page)
      // - Preserved: rangeLower, rangeUpper, maturity (from old Gist)
      const ytMetrics = calculateYtMetrics(
        maturity,
        newAsset.impliedYield,
        rangeLower,
        rangeUpper,
        phase1Timestamp,
        newAsset.leverage,
        newAsset.apy,
        newAsset.maturityDays,
        newAsset.assetBoost,
        newAsset.source // Pass source to use correct formula
      );
      
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
        source: newAsset.source, // 'ratex' or 'exponent'
        
        // Visual assets from Phase 1 (new fields)
        projectBackgroundImage: newAsset.projectBackgroundImage ?? null,
        projectName: newAsset.projectName ?? null,
        assetSymbolImage: newAsset.assetSymbolImage ?? null,
        
        // Preserved detail page data (if exists)
        rangeLower: rangeLower,
        rangeUpper: rangeUpper,
        maturity: maturity,
        maturesIn: maturesIn,  // Recalculated to be current
        
        // Calculated YT metrics (using fresh + preserved data)
        ytPriceCurrent: ytMetrics.ytPriceCurrent,
        ytPriceLower: ytMetrics.ytPriceLower,
        ytPriceUpper: ytMetrics.ytPriceUpper,
        upsidePotential: ytMetrics.upsidePotential,
        downsideRisk: ytMetrics.downsideRisk,
        endDayCurrentYield: ytMetrics.endDayCurrentYield,
        endDayLowerYield: ytMetrics.endDayLowerYield,
        dailyDecayRate: ytMetrics.dailyDecayRate,
        expectedRecoveryYield: ytMetrics.expectedRecoveryYield,
        expectedPointsPerDay: ytMetrics.expectedPointsPerDay,
        totalExpectedPoints: ytMetrics.totalExpectedPoints,
      };
    });
    
    console.log(`✅ Phase 1 complete: ${phase1MergedData.length} assets with calculated metrics`);
    
    // ========== Update Gist (Phase 1) ==========
    console.log('\n📤 Updating Gist with Phase 1 data...');
    const phase1GistData = {
      lastUpdated: phase1Timestamp,
      phase: 1,
      assetsCount: phase1MergedData.length,
      assets: phase1MergedData
    };
    
    await updateGist(GIST_ID, phase1GistData, GIST_TOKEN);
    console.log('✅ Phase 1 Gist updated - Frontend can use calculator now!');
    
    // ========== PHASE 2: Scrape Detail Pages (Sequential) ==========
    console.log('\n🚀 Starting Phase 2: Scraping detail pages sequentially...');
    const ratexAssets = phase1MergedData.filter(a => a.source === 'ratex');
    const exponentAssets = phase1MergedData.filter(a => a.source === 'exponent');
    
    const page = await browser.newPage();
    
    console.log('\n📄 Phase 2A: RateX detail pages...');
    const phase2RatexData = await scrapeDetailPages(page, ratexAssets, existingGistData);
    
    console.log('\n📄 Phase 2B: Exponent detail pages...');
    const phase2ExponentData = await scrapeExponentDetailPages(page, exponentAssets, existingGistData);
    
    const phase2Data = [...phase2RatexData, ...phase2ExponentData];
    console.log(`\n✅ Phase 2 scraping complete: ${phase2RatexData.length} RateX + ${phase2ExponentData.length} Exponent = ${phase2Data.length} total assets`);
    
    // ========== Update Gist (Phase 2) ==========
    console.log('\n📤 Updating Gist with Phase 2 data...');
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
