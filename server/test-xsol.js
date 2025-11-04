import { scrapeAssetData } from './scraper.js';

console.log('============================================================');
console.log('TESTING SCRAPER FOR xSOL');
console.log('============================================================');

try {
  const data = await scrapeAssetData('xSOL');
  
  console.log('\n============================================================');
  console.log('✅ SUCCESS! Retrieved data:');
  console.log('============================================================\n');
  
  console.log(`Asset: ${data.asset}`);
  console.log(`Leverage: ${data.leverage}x`);
  console.log(`APY: ${data.apy}%`);
  console.log(`Maturity Days: ${data.maturityDays} days`);
  console.log(`Asset Boost: ${data.assetBoost}x`);
  console.log(`RateX Boost: ${data.ratexBoost}x`);
  
  console.log('\n============================================================\n');
  console.log('📤 Data ready for frontend:');
  console.log(JSON.stringify(data, null, 2));
  console.log('============================================================');
  
} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
}
