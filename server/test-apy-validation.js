import { scrapeExponentPhase1 } from './scraper-exponent-phase1.js';

/**
 * Test APY validation with mock RateX data
 */
async function testApyValidation() {
  console.log('🧪 Testing APY Validation Logic with Mock Data\n');
  console.log('='.repeat(60));
  
  // Mock RateX data (simulating what would come from scrapeAllAssets)
  const mockRatexAssets = [
    {
      asset: 'hyloSOL+-2511',
      baseAsset: 'hyloSOL+',
      apy: 8.2,  // Different from Exponent's value
      source: 'ratex'
    },
    {
      asset: 'xSOL-2511',
      baseAsset: 'xSOL',
      apy: 4.5,  // Different from Exponent's value
      source: 'ratex'
    },
    {
      asset: 'HyloSOL-2512',  // Different case - should still match
      baseAsset: 'HyloSOL',
      apy: 6.8,  // Different from Exponent's value
      source: 'ratex'
    }
  ];
  
  console.log('\n📊 Mock RateX Assets (for validation):');
  mockRatexAssets.forEach((asset, idx) => {
    console.log(`  ${idx + 1}. ${asset.asset} (${asset.baseAsset}) - APY: ${asset.apy}%`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📡 Scraping Exponent Finance with APY validation...\n');
  
  try {
    const assets = await scrapeExponentPhase1({
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      headless: false,
      ratexAssets: mockRatexAssets
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('\n🔄 APY VALIDATION RESULTS:\n');
    
    // Find matched assets
    const ratexBaseAssets = new Set(mockRatexAssets.map(a => a.baseAsset.toLowerCase()));
    const matchedAssets = assets.filter(a => ratexBaseAssets.has(a.baseAsset.toLowerCase()));
    const unmatchedAssets = assets.filter(a => !ratexBaseAssets.has(a.baseAsset.toLowerCase()));
    
    console.log(`✅ Total assets scraped: ${assets.length}`);
    console.log(`✅ Matched with RateX: ${matchedAssets.length}`);
    console.log(`✅ Exponent-only: ${unmatchedAssets.length}\n`);
    
    if (matchedAssets.length > 0) {
      console.log('📌 Assets using RateX APY (validation applied):');
      matchedAssets.forEach(asset => {
        const ratexAsset = mockRatexAssets.find(r => r.baseAsset.toLowerCase() === asset.baseAsset.toLowerCase());
        console.log(`   ✓ ${asset.asset}`);
        console.log(`     Base Asset: ${asset.baseAsset}`);
        console.log(`     APY: ${asset.apy}% (from RateX)`);
        console.log(`     Range Lower: ${asset.rangeLower}% (same as RateX APY)`);
        console.log(`     Implied Yield: ${asset.impliedYield}% (from Exponent)`);
        console.log('');
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ APY validation test complete!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testApyValidation();
