/**
 * Deep dive test to check if xSOL with hours appears on Rate-X website
 * Run with: node server/test-xsol-hours.js
 */

import puppeteerCore from 'puppeteer-core';

const puppeteer = puppeteerCore;

async function testXSOLHours() {
  let browser;
  
  try {
    console.log('🔍 DEEP DIVE: Investigating xSOL with < 1 day maturity\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const executablePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    
    browser = await puppeteer.launch({
      executablePath: executablePath,
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      ignoreHTTPSErrors: true,
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('📡 Step 1: Navigating to Rate-X leverage page...');
    await page.goto('https://app.rate-x.io/leverage', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    
    await page.waitForTimeout(3000);
    console.log('✅ Page loaded\n');
    
    console.log('🔍 Step 2: Searching for ALL xSOL assets on the page...\n');
    
    // Extract all text mentioning xSOL
    const xsolData = await page.evaluate(() => {
      const results = {
        allXSOLText: [],
        xsolCards: [],
        pageText: document.body.innerText
      };
      
      // Find all elements containing "xSOL"
      const allElements = Array.from(document.querySelectorAll('*'));
      
      allElements.forEach(el => {
        const text = el.textContent || '';
        if (text.includes('xSOL') && text.length < 500) {
          results.allXSOLText.push({
            text: text.trim(),
            tag: el.tagName,
            className: el.className
          });
        }
      });
      
      // Look for asset cards specifically
      const cards = document.querySelectorAll('[class*="card"], [class*="Card"], [class*="asset"]');
      cards.forEach(card => {
        const cardText = card.textContent || '';
        if (cardText.includes('xSOL')) {
          // Extract key info
          const leverageMatch = cardText.match(/Yield\s+Exposure[^\d]*([\d.]+)\s*x/i);
          const maturityMatch = cardText.match(/([\d]+)\s*Days/i);
          const hoursMatch = cardText.match(/([\d.]+)\s*Hours?/i);
          const assetNameMatch = cardText.match(/([A-Za-z0-9*+\-]+)-(\d{4})/);
          
          results.xsolCards.push({
            text: cardText.substring(0, 300),
            leverage: leverageMatch ? leverageMatch[1] : null,
            maturityDays: maturityMatch ? maturityMatch[1] : null,
            maturityHours: hoursMatch ? hoursMatch[1] : null,
            assetName: assetNameMatch ? assetNameMatch[0] : null
          });
        }
      });
      
      return results;
    });
    
    console.log('📊 FINDINGS:\n');
    console.log(`   Total elements mentioning "xSOL": ${xsolData.allXSOLText.length}`);
    console.log(`   Asset cards containing "xSOL": ${xsolData.xsolCards.length}\n`);
    
    if (xsolData.xsolCards.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 xSOL ASSET CARDS FOUND:\n');
      
      xsolData.xsolCards.forEach((card, index) => {
        console.log(`Card ${index + 1}:`);
        console.log(`   Asset Name: ${card.assetName || 'NOT FOUND'}`);
        console.log(`   Leverage: ${card.leverage || 'NOT FOUND'}`);
        console.log(`   Maturity Days: ${card.maturityDays || 'NOT FOUND'}`);
        console.log(`   Maturity Hours: ${card.maturityHours || 'NOT FOUND'}`);
        console.log(`   Card Text Preview: ${card.text.substring(0, 150)}...`);
        console.log('');
      });
    } else {
      console.log('❌ NO xSOL asset cards found!\n');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 Step 3: Testing maturity regex patterns...\n');
    
    // Test if the hours pattern would be matched
    const testStrings = [
      '5 Hours',
      '10 Hours',
      '23 Hours',
      '5Hours',
      '< 1 Day',
      '14 Days',
      'Expires Soon'
    ];
    
    console.log('Testing maturity extraction patterns:\n');
    testStrings.forEach(str => {
      const daysMatch = str.match(/([\d]+)\s*Days/i);
      const hoursMatch = str.match(/([\d.]+)\s*Hours?/i);
      
      console.log(`   "${str}"`);
      console.log(`      Days regex: ${daysMatch ? `✅ Found: ${daysMatch[1]}` : '❌ No match'}`);
      console.log(`      Hours regex: ${hoursMatch ? `✅ Found: ${hoursMatch[1]}` : '❌ No match'}`);
      console.log('');
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 Step 4: Checking page for "Hours" keyword...\n');
    
    const hoursCount = (xsolData.pageText.match(/Hours/gi) || []).length;
    const hoursContext = xsolData.pageText.match(/.{0,50}Hours.{0,50}/gi) || [];
    
    console.log(`   Found "Hours" keyword: ${hoursCount} times\n`);
    
    if (hoursContext.length > 0 && hoursContext.length < 20) {
      console.log('   Contexts where "Hours" appears:');
      hoursContext.slice(0, 10).forEach((ctx, i) => {
        console.log(`   ${i + 1}. ${ctx.trim()}`);
      });
      console.log('');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 Step 5: Searching for specific xSOL asset names...\n');
    
    const expectedNames = ['xSOL-2511', 'xSOL-2512', 'xSOL-2601', 'xSOL-2602'];
    expectedNames.forEach(name => {
      const found = xsolData.pageText.includes(name);
      console.log(`   ${found ? '✅' : '❌'} ${name}`);
    });
    
    await browser.close();
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 SUMMARY:\n');
    
    const hasXSOLCards = xsolData.xsolCards.length > 0;
    const hasHoursData = xsolData.xsolCards.some(c => c.maturityHours);
    
    if (!hasXSOLCards) {
      console.log('❌ No xSOL assets found on Rate-X page');
      console.log('   Possible reasons:');
      console.log('   1. All xSOL assets have expired');
      console.log('   2. Page structure changed');
      console.log('   3. Assets are dynamically loaded after networkidle0');
    } else if (!hasHoursData) {
      console.log('⚠️  xSOL assets found, but NONE showing in Hours format');
      console.log('   All showing maturity in Days format');
      console.log('   This means: Either the asset expired, or Rate-X shows < 1 day differently');
    } else {
      console.log('✅ xSOL asset found with Hours format!');
      console.log('   The scraper SHOULD be extracting it.');
      console.log('   Need to check why it is being filtered out.');
    }
    
    console.log('\n✅ Deep dive complete!\n');
    
    return xsolData;
    
  } catch (error) {
    console.error('❌ Error:', error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

// Run the test
testXSOLHours()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
