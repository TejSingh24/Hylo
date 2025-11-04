import { scrapeAssetData } from './scraper.js';

console.log('='.repeat(60));
console.log('TESTING SCRAPER FOR hyloSOL+');
console.log('='.repeat(60));

try {
  // Try searching for the actual asset name that appears on the page
  const data = await scrapeAssetData('hyloSOL+');
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ SUCCESS! Retrieved data:');
  console.log('='.repeat(60));
  console.log('\nAsset:', data.asset);
  console.log('Leverage:', data.leverage ? data.leverage + 'x' : '❌ NOT FOUND');
  console.log('APY:', data.apy !== null ? data.apy + '%' : '❌ NOT FOUND');
  console.log('Maturity Days:', data.maturityDays ? data.maturityDays + ' days' : '❌ NOT FOUND');
  console.log('Asset Boost:', data.assetBoost ? data.assetBoost + 'x' : '❌ NOT FOUND');
  console.log('RateX Boost:', data.ratexBoost ? data.ratexBoost + 'x' : '❌ NOT FOUND');
  console.log('\n' + '='.repeat(60));
  
  // Show what we can send to frontend
  console.log('\n📤 Data ready for frontend:');
  console.log(JSON.stringify(data, null, 2));
  console.log('='.repeat(60));
  
} catch (error) {
  console.log('\n' + '='.repeat(60));
  console.log('❌ ERROR:', error.message);
  console.log('='.repeat(60));
  console.error('\nFull error:', error);
}

process.exit(0);
