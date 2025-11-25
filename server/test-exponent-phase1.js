import { scrapeExponentPhase1 } from './scraper-exponent-phase1.js';
import { scrapeAllAssets } from './scraper.js';

/**
 * Test Exponent Phase 1 scraper with APY validation against RateX data
 */
async function testExponentPhase1() {
  console.log('🧪 Testing Exponent Phase 1 Scraper with APY Validation\n');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Fetch RateX assets for APY validation
    console.log('\n📊 Step 1: Fetching RateX assets for APY validation...\n');
    let ratexAssets = [];
    
    try {
      ratexAssets = await scrapeAllAssets();
      console.log(`✅ Fetched ${ratexAssets.length} RateX assets`);
      
      // Show RateX assets for reference
      console.log('\n📋 RateX Assets (for validation):');
      ratexAssets.forEach((asset, idx) => {
        console.log(`  ${idx + 1}. ${asset.asset} (${asset.baseAsset}) - APY: ${asset.apy}%`);
      });
    } catch (error) {
      console.warn('⚠️  Could not fetch RateX assets:', error.message);
      console.log('Proceeding without APY validation...');
    }
    
    // Step 2: Scrape Exponent with RateX data for validation
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Step 2: Scraping Exponent Finance with APY validation...\n');
    
    const assets = await scrapeExponentPhase1({
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      headless: false, // Set to true for headless mode
      ratexAssets: ratexAssets
    });
    
    console.log('\n' + '='.repeat(60));
    console.log(`\n📊 RESULTS: Found ${assets.length} assets\n`);
    
    // Display each asset
    assets.forEach((asset, index) => {
      console.log(`\n[${index + 1}] ${asset.asset}`);
      console.log('─'.repeat(60));
      console.log(`  Base Asset:      ${asset.baseAsset}`);
      console.log(`  Date String:     ${asset.dateStr}`);
      console.log(`  Maturity:        ${asset.maturity}`);
      console.log(`  Maturity Days:   ${asset.maturityDays}`);
      console.log(`  Leverage:        ${asset.leverage !== null ? asset.leverage + 'x' : '∞ (null)'}`);
      console.log(`  Underlying APY:  ${asset.apy !== null ? asset.apy + '%' : 'N/A'}`);
      console.log(`  Implied Yield:   ${asset.impliedYield !== null ? asset.impliedYield + '%' : 'N/A'}`);
      console.log(`  Points/Day:      ${asset.pointsPerDay !== null ? asset.pointsPerDay : '∞ (null)'}`);
      console.log(`  Asset Boost:     ${asset.assetBoost !== null ? asset.assetBoost : 'null'}`);
      console.log(`  RateX Boost:     ${asset.ratexBoost}`);
      console.log(`  Range Lower:     ${asset.rangeLower !== null ? asset.rangeLower + '%' : 'null'}`);
      console.log(`  Range Upper:     ${asset.rangeUpper}`);
      console.log(`  Source:          ${asset.source}`);
    });
    
    console.log('\n' + '='.repeat(60));
    
    // Validation checks
    console.log('\n✅ VALIDATION CHECKS:\n');
    
    const missingLeverage = assets.filter(a => a.leverage === null);
    const missingAPY = assets.filter(a => a.apy === null);
    const missingImplied = assets.filter(a => a.impliedYield === null);
    const missingMaturity = assets.filter(a => a.maturityDays === null);
    
    console.log(`  Assets with leverage:     ${assets.length - missingLeverage.length}/${assets.length}`);
    console.log(`  Assets with APY:          ${assets.length - missingAPY.length}/${assets.length}`);
    console.log(`  Assets with implied APY:  ${assets.length - missingImplied.length}/${assets.length}`);
    console.log(`  Assets with maturity:     ${assets.length - missingMaturity.length}/${assets.length}`);
    
    if (missingLeverage.length > 0) {
      console.log(`\n  ⚠️  Missing leverage: ${missingLeverage.map(a => a.asset).join(', ')}`);
    }
    if (missingAPY.length > 0) {
      console.log(`  ⚠️  Missing APY: ${missingAPY.map(a => a.asset).join(', ')}`);
    }
    if (missingImplied.length > 0) {
      console.log(`  ⚠️  Missing implied: ${missingImplied.map(a => a.asset).join(', ')}`);
    }
    if (missingMaturity.length > 0) {
      console.log(`  ⚠️  Missing maturity: ${missingMaturity.map(a => a.asset).join(', ')}`);
    }
    
    // APY Validation Summary
    console.log('\n🔄 APY VALIDATION SUMMARY:\n');
    
    // Find assets that have matching baseAsset in RateX
    const ratexBaseAssets = new Set(ratexAssets.map(a => a.baseAsset.toLowerCase()));
    const matchedAssets = assets.filter(a => ratexBaseAssets.has(a.baseAsset.toLowerCase()));
    const unmatchedAssets = assets.filter(a => !ratexBaseAssets.has(a.baseAsset.toLowerCase()));
    
    console.log(`  Matched with RateX:       ${matchedAssets.length}/${assets.length}`);
    console.log(`  Exponent-only assets:     ${unmatchedAssets.length}/${assets.length}`);
    
    if (matchedAssets.length > 0) {
      console.log('\n  📌 Assets using RateX APY:');
      matchedAssets.forEach(asset => {
        console.log(`     - ${asset.asset} (${asset.baseAsset}): ${asset.apy}%`);
      });
    }
    
    if (unmatchedAssets.length > 0) {
      console.log('\n  📌 Assets using Exponent APY (no RateX match):');
      unmatchedAssets.forEach(asset => {
        console.log(`     - ${asset.asset} (${asset.baseAsset}): ${asset.apy}%`);
      });
    }
    
    // Check for known asset
    console.log('\n📌 KNOWN ASSET CHECK:\n');
    const hyloSOL = assets.find(a => a.asset.includes('hyloSOL') && a.asset.includes('10DEC25'));
    if (hyloSOL) {
      console.log(`  ✅ Found YT-hyloSOL-10DEC25`);
      console.log(`     Leverage: ${hyloSOL.leverage}x (expected ~209x)`);
      console.log(`     APY: ${hyloSOL.apy}% (expected ~7.5%)`);
      console.log(`     Implied: ${hyloSOL.impliedYield}% (expected ~11.5%)`);
    } else {
      console.log(`  ❌ YT-hyloSOL-10DEC25 not found`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Test complete!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run test
testExponentPhase1();
