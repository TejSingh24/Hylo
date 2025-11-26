/**
 * Test the exact regex patterns on xSOL-2511 card text
 * Run with: node server/test-xsol-regex.js
 */

// Test the exact card text from the output
const cardText9 = "xSOL-251125x5xYield Exposure714.29xImplied Yield66.997%-7.41%Underlying APY0.00%5Hours";

console.log('Testing regex patterns on Card #9 text:\n');
console.log('Card text:', cardText9);
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test Days pattern
const daysMatch = cardText9.match(/([\d]+)\s*Days/i);
console.log('Days pattern: /([\d]+)\\s*Days/i');
console.log('Result:', daysMatch ? `✅ Matched: ${daysMatch[1]}` : '❌ No match');
console.log('');

// Test Hours pattern (current in scraper)
const hoursMatch = cardText9.match(/([\d.]+)\s*Hours?/i);
console.log('Hours pattern: /([\d.]+)\\s*Hours?/i');
console.log('Result:', hoursMatch ? `✅ Matched: ${hoursMatch[1]}` : '❌ No match');
console.log('');

// Try alternative patterns
const hoursMatch2 = cardText9.match(/([\d.]+)Hours?/i);
console.log('Hours pattern (no \\s*): /([\d.]+)Hours?/i');
console.log('Result:', hoursMatch2 ? `✅ Matched: ${hoursMatch2[1]}` : '❌ No match');
console.log('');

// Test leverage extraction
const leverageMatch = cardText9.match(/Yield\s+Exposure[^\d]*([\d.]+)\s*x/i);
console.log('Leverage pattern: /Yield\\s+Exposure[^\\d]*([\\d.]+)\\s*x/i');
console.log('Result:', leverageMatch ? `✅ Matched: ${leverageMatch[1]}` : '❌ No match');
console.log('');

// Test APY extraction
const apyMatch = cardText9.match(/Underlying\s+APY\s*([\d.]+)\s*%/i);
console.log('APY pattern: /Underlying\\s+APY\\s*([\\d.]+)\\s*%/i');
console.log('Result:', apyMatch ? `✅ Matched: ${apyMatch[1]}` : '❌ No match');
console.log('');

// Test Implied Yield extraction
const impliedMatch = cardText9.match(/Implied\s+Yield[:\s]*([\d.]+)\s*%/i);
console.log('Implied Yield pattern: /Implied\\s+Yield[:\\s]*([\\d.]+)\\s*%/i');
console.log('Result:', impliedMatch ? `✅ Matched: ${impliedMatch[1]}` : '❌ No match');
console.log('');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('SUMMARY:\n');

if (hoursMatch) {
  const hours = parseFloat(hoursMatch[1]);
  const days = hours / 24;
  console.log(`✅ Hours extraction works!`);
  console.log(`   Hours: ${hours}`);
  console.log(`   Converted to days: ${days.toFixed(4)}`);
} else if (hoursMatch2) {
  const hours = parseFloat(hoursMatch2[1]);
  const days = hours / 24;
  console.log(`✅ Hours extraction works (without \\s*)!`);
  console.log(`   Hours: ${hours}`);
  console.log(`   Converted to days: ${days.toFixed(4)}`);
} else {
  console.log(`❌ Hours extraction failed!`);
  console.log(`   Need to adjust regex pattern.`);
}

if (leverageMatch && apyMatch) {
  console.log(`\n✅ All essential data can be extracted from this card!`);
} else {
  console.log(`\n⚠️  Missing some essential data.`);
}
