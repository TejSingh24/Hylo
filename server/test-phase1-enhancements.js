import { scrapeAllAssets } from './scraper.js';
import { scrapeAllExponentAssets } from './scraper-exponent.js';
import { calculateYtMetrics, calculateDaysToMaturity, calculateMaturesIn } from './scraper.js';

console.log('🧪 Testing Phase 1 Enhancements...\n');

// Mock existing Gist data
const existingGistData = {
  'YT-hyloSOL-10DEC25': {
    asset: 'YT-hyloSOL-10DEC25',
    apy: 10.5,
    assetBoost: 2.5,
    projectBackgroundImage: 'https://old-gist-image.png',
    projectName: 'Old Hylo',
    assetSymbolImage: 'https://old-symbol.png'
  }
};

try {
  // Step 1: Scrape RateX data
  console.log('📊 Step 1: Scraping RateX data...');
  const ratexData = await scrapeAllAssets();
  console.log(`✅ Scraped ${ratexData.length} RateX assets`);
  
  // Step 2: Scrape Exponent data
  console.log('\n📊 Step 2: Scraping Exponent data...');
  const exponentData = await scrapeAllExponentAssets();
  console.log(`✅ Scraped ${exponentData.length} Exponent assets`);
  
  // Step 3: Apply Phase 1 enhancements
  console.log('\n🔄 Step 3: Applying Phase 1 enhancements...\n');
  
  const ratexMap = new Map(
    ratexData.map(asset => [asset.baseAsset.toLowerCase(), asset])
  );
  
  let apyValidatedCount = 0;
  let boostValidatedCount = 0;
  let visualAssetsCount = 0;
  let rangeLowerCount = 0;
  let ytMetricsCount = 0;
  
  exponentData.forEach(exponentAsset => {
    const ratexMatch = ratexMap.get(exponentAsset.baseAsset.toLowerCase());
    const oldAsset = existingGistData[exponentAsset.asset];
    
    console.log(`\n🎯 Processing: ${exponentAsset.asset}`);
    console.log(`   Base Asset: ${exponentAsset.baseAsset}`);
    
    // Update APY if RateX has it
    if (ratexMatch && ratexMatch.apy !== null) {
      console.log(`   ✓ APY: ${exponentAsset.apy}% → ${ratexMatch.apy}% (from RateX)`);
      exponentAsset.apy = ratexMatch.apy;
      apyValidatedCount++;
    } else {
      console.log(`   ℹ APY: ${exponentAsset.apy}% (keeping Exponent value)`);
    }
    
    // Asset Boost Priority: OLD Gist → RateX match → null
    if (oldAsset && oldAsset.assetBoost !== null) {
      console.log(`   ✓ assetBoost: ${oldAsset.assetBoost}x (from OLD gist)`);
      exponentAsset.assetBoost = oldAsset.assetBoost;
      boostValidatedCount++;
    } else if (ratexMatch && ratexMatch.assetBoost !== null) {
      console.log(`   ✓ assetBoost: ${ratexMatch.assetBoost}x (from RateX)`);
      exponentAsset.assetBoost = ratexMatch.assetBoost;
      boostValidatedCount++;
    } else {
      console.log(`   ℹ assetBoost: null (will be filled in Phase 2)`);
    }
    
    // Visual Assets Priority: RateX match → OLD Gist → null
    if (ratexMatch && ratexMatch.projectBackgroundImage) {
      exponentAsset.projectBackgroundImage = ratexMatch.projectBackgroundImage;
      exponentAsset.projectName = ratexMatch.projectName;
      exponentAsset.assetSymbolImage = ratexMatch.assetSymbolImage;
      console.log(`   ✓ Visual Assets: Copied from RateX (${ratexMatch.projectName})`);
      visualAssetsCount++;
    } else if (oldAsset && oldAsset.projectBackgroundImage) {
      exponentAsset.projectBackgroundImage = oldAsset.projectBackgroundImage;
      exponentAsset.projectName = oldAsset.projectName;
      exponentAsset.assetSymbolImage = oldAsset.assetSymbolImage;
      console.log(`   ✓ Visual Assets: Using OLD gist (${oldAsset.projectName})`);
      visualAssetsCount++;
    } else {
      console.log(`   ℹ Visual Assets: null (will be filled in Phase 2)`);
    }
    
    // Set rangeLower = apy
    if (exponentAsset.apy !== null) {
      exponentAsset.rangeLower = exponentAsset.apy;
      console.log(`   ✓ rangeLower: ${exponentAsset.rangeLower}% (set to apy)`);
      rangeLowerCount++;
    }
    
    // Calculate YT metrics in Phase 1
    if (exponentAsset.maturity && exponentAsset.impliedYield !== null) {
      const phase1Timestamp = new Date().toISOString();
      const ytMetrics = calculateYtMetrics(
        exponentAsset.maturity,
        exponentAsset.impliedYield,
        exponentAsset.rangeLower, // = apy
        null, // rangeUpper not available in Phase 1
        phase1Timestamp,
        exponentAsset.leverage,
        exponentAsset.apy,
        exponentAsset.maturityDays,
        exponentAsset.assetBoost,
        'exponent'
      );
      
      // Copy calculated metrics
      exponentAsset.ytPriceCurrent = ytMetrics.ytPriceCurrent;
      exponentAsset.ytPriceLower = ytMetrics.ytPriceLower;
      exponentAsset.ytPriceUpper = ytMetrics.ytPriceUpper; // Will be null
      exponentAsset.upsidePotential = ytMetrics.upsidePotential; // Will be null
      exponentAsset.downsideRisk = ytMetrics.downsideRisk;
      exponentAsset.endDayCurrentYield = ytMetrics.endDayCurrentYield;
      exponentAsset.endDayLowerYield = ytMetrics.endDayLowerYield;
      exponentAsset.dailyDecayRate = ytMetrics.dailyDecayRate;
      exponentAsset.expectedRecoveryYield = ytMetrics.expectedRecoveryYield;
      exponentAsset.expectedPointsPerDay = ytMetrics.expectedPointsPerDay;
      exponentAsset.totalExpectedPoints = ytMetrics.totalExpectedPoints;
      
      ytMetricsCount++;
      console.log(`   ✓ YT Metrics Calculated:`);
      console.log(`     - ytPriceCurrent: ${ytMetrics.ytPriceCurrent}`);
      console.log(`     - ytPriceLower: ${ytMetrics.ytPriceLower}`);
      console.log(`     - ytPriceUpper: ${ytMetrics.ytPriceUpper} (null = no rangeUpper)`);
      console.log(`     - downsideRisk: ${ytMetrics.downsideRisk}`);
      console.log(`     - upsidePotential: ${ytMetrics.upsidePotential} (null = no rangeUpper)`);
      console.log(`     - dailyDecayRate: ${ytMetrics.dailyDecayRate}`);
      console.log(`     - expectedRecoveryYield: ${ytMetrics.expectedRecoveryYield}`);
      console.log(`     - expectedPointsPerDay: ${ytMetrics.expectedPointsPerDay}`);
      console.log(`     - totalExpectedPoints: ${ytMetrics.totalExpectedPoints}`);
    }
  });
  
  console.log('\n\n📈 Phase 1 Enhancement Results:');
  console.log(`✅ APY validation: ${apyValidatedCount}/${exponentData.length} assets updated`);
  console.log(`✅ assetBoost validation: ${boostValidatedCount}/${exponentData.length} assets updated`);
  console.log(`✅ Visual assets: ${visualAssetsCount}/${exponentData.length} assets updated`);
  console.log(`✅ rangeLower set: ${rangeLowerCount}/${exponentData.length} assets`);
  console.log(`✅ YT metrics calculated: ${ytMetricsCount}/${exponentData.length} assets`);
  
  console.log('\n\n✅ Phase 1 Enhancement Test Complete!');
  console.log('\nℹ️  Next: Re-enable Phase 2 to refine with chart data (rangeUpper)');
  
} catch (error) {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
}
