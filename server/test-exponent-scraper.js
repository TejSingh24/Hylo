import { scrapeExponentAssets, scrapeAllExponentAssets, scrapeExponentAssetDetail } from './scraper-exponent.js';

async function testExponentScraper() {
  try {
    console.log('🧪 Testing Exponent Finance Scraper\n');
    console.log('═'.repeat(60));
    
    // Test 1: Scrape all YT assets from farm page
    console.log('\n📝 TEST 1: Scraping all YT assets from farm page...\n');
    const assets = await scrapeExponentAssets();
    
    console.log('\n' + '═'.repeat(60));
    console.log(`\n✅ Found ${assets.length} YT assets!\n`);
    
    // Display results in a formatted table
    console.log('Assets Summary:');
    console.log('-'.repeat(80));
    console.log('Asset Name'.padEnd(30) + 'Base'.padEnd(15) + 'TVL'.padEnd(15) + 'Implied APY');
    console.log('-'.repeat(80));
    
    assets.forEach(asset => {
      console.log(
        asset.fullAssetName.padEnd(30) +
        asset.baseAsset.padEnd(15) +
        (asset.tvl || 'N/A').padEnd(15) +
        (asset.impliedApy !== null ? `${asset.impliedApy}%` : 'N/A')
      );
    });
    
    console.log('-'.repeat(80));
    
    // Test 2: Scrape detailed data for first asset (optional)
    if (assets.length > 0) {
      console.log('\n═'.repeat(60));
      console.log('\n📝 TEST 2: Scraping detailed data for first asset...\n');
      
      const firstAsset = assets[0];
      console.log(`Testing with: ${firstAsset.fullAssetName}`);
      
      try {
        const details = await scrapeExponentAssetDetail(firstAsset.fullAssetName);
        
        console.log('\nDetailed Data:');
        console.log('-'.repeat(40));
        console.log(`Implied APY:        ${details.impliedApy || 'N/A'}%`);
        console.log(`Underlying APY:     ${details.underlyingApy || 'N/A'}%`);
        console.log(`TVL:                ${details.tvl || 'N/A'}`);
        console.log(`Leverage:           ${details.leverage || 'N/A'}x`);
        console.log(`Points/Day:         ${details.pointsMultiplier || 'N/A'}`);
        console.log(`Days to Maturity:   ${details.daysToMaturity || 'N/A'}`);
        console.log('-'.repeat(40));
        
        console.log('\n✅ Detail scraping test passed!');
      } catch (error) {
        console.log('\n⚠️ Detail scraping test failed (this is optional):', error.message);
      }
    }
    
    console.log('\n═'.repeat(60));
    console.log('\n🎉 All tests completed!\n');
    
    // Return the data for potential further use
    return assets;
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testExponentScraper()
  .then(() => {
    console.log('✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  });
