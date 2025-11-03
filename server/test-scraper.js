import { scrapeAssetData } from './scraper.js';

console.log('='.repeat(60));
console.log('TESTING SCRAPER FOR HyloSOL');
console.log('='.repeat(60));

try {
  const data = await scrapeAssetData('HyloSOL');
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ SUCCESS! Retrieved data:');
  console.log('='.repeat(60));
  console.log('\nAsset:', data.asset);
  console.log('Leverage:', data.leverage ? data.leverage + 'x' : '❌ NOT FOUND');
  console.log('APY:', data.apy ? data.apy + '%' : '❌ NOT FOUND');
  console.log('Maturity Days:', data.maturityDays ? data.maturityDays + ' days' : '❌ NOT FOUND');
  console.log('Asset Boost:', data.assetBoost ? data.assetBoost + '%' : '❌ NOT FOUND');
  console.log('RateX Boost:', data.ratexBoost ? data.ratexBoost + '%' : '❌ NOT FOUND');
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
