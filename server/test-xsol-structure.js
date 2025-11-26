/**
 * Test to examine the actual DOM structure for xSOL-2511
 * Run with: node server/test-xsol-structure.js
 */

import puppeteerCore from 'puppeteer-core';

const puppeteer = puppeteerCore;

async function testXSOLStructure() {
  let browser;
  
  try {
    console.log('🔍 Examining DOM structure for xSOL-2511...\n');
    
    const executablePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    
    browser = await puppeteer.launch({
      executablePath: executablePath,
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      ignoreHTTPSErrors: true,
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('📡 Loading Rate-X leverage page...');
    await page.goto('https://app.rate-x.io/leverage', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    
    await page.waitForTimeout(3000);
    console.log('✅ Page loaded\n');
    
    console.log('🔍 Finding xSOL-2511 element and examining its structure...\n');
    
    const xsolStructure = await page.evaluate(() => {
      const results = {
        found: false,
        parentHTML: null,
        cardInfo: null,
        extractionAttempt: null
      };
      
      // Find the element containing xSOL-2511
      const allElements = Array.from(document.querySelectorAll('*'));
      let xsolElement = null;
      
      for (const el of allElements) {
        if ((el.textContent || '').includes('xSOL-2511')) {
          xsolElement = el;
          break;
        }
      }
      
      if (!xsolElement) {
        return results;
      }
      
      results.found = true;
      
      // Try to find the parent card (go up 10 levels)
      let current = xsolElement;
      let cardCandidate = null;
      
      for (let i = 0; i < 10; i++) {
        if (!current.parentElement) break;
        current = current.parentElement;
        
        const text = current.textContent || '';
        
        // Check if this level contains typical card data
        const hasLeverage = /Yield\s+Exposure/i.test(text) || /\d+\.\d+\s*x/.test(text);
        const hasAPY = /APY|Underlying/i.test(text);
        const hasMaturity = /Days|Hours|Maturity/i.test(text);
        
        if (hasLeverage && hasAPY) {
          cardCandidate = current;
          
          results.cardInfo = {
            level: i,
            tagName: current.tagName,
            className: current.className,
            textLength: text.length,
            textPreview: text.substring(0, 500),
            hasLeverage,
            hasAPY,
            hasMaturity
          };
          break;
        }
      }
      
      if (cardCandidate) {
        const cardText = cardCandidate.textContent || '';
        
        // Try to extract using the scraper's logic
        const leverageMatch = cardText.match(/Yield\s+Exposure[^\d]*([\d.]+)\s*x/i);
        const apyMatch = cardText.match(/Underlying\s+APY\s*([\d.]+)\s*%/i);
        const maturityDaysMatch = cardText.match(/([\d]+)\s*Days/i);
        const maturityHoursMatch = cardText.match(/([\d.]+)\s*Hours?/i);
        const assetNameMatch = cardText.match(/([A-Za-z0-9*+\-]+)-(\d{4})/);
        
        results.extractionAttempt = {
          assetName: assetNameMatch ? assetNameMatch[0] : null,
          leverage: leverageMatch ? leverageMatch[1] : null,
          apy: apyMatch ? apyMatch[1] : null,
          maturityDays: maturityDaysMatch ? maturityDaysMatch[1] : null,
          maturityHours: maturityHoursMatch ? maturityHoursMatch[1] : null,
          cardTextFull: cardText
        };
      }
      
      return results;
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 RESULTS:\n');
    
    if (!xsolStructure.found) {
      console.log('❌ xSOL-2511 NOT found on page!');
      console.log('   The asset may have expired or is not displayed.');
    } else {
      console.log('✅ xSOL-2511 element found!\n');
      
      if (xsolStructure.cardInfo) {
        console.log('📦 Parent Card Info:');
        console.log(`   Level up from text: ${xsolStructure.cardInfo.level}`);
        console.log(`   Tag: <${xsolStructure.cardInfo.tagName}>`);
        console.log(`   Class: ${xsolStructure.cardInfo.className || '(none)'}`);
        console.log(`   Text length: ${xsolStructure.cardInfo.textLength} chars`);
        console.log(`   Has Leverage: ${xsolStructure.cardInfo.hasLeverage ? '✅' : '❌'}`);
        console.log(`   Has APY: ${xsolStructure.cardInfo.hasAPY ? '✅' : '❌'}`);
        console.log(`   Has Maturity: ${xsolStructure.cardInfo.hasMaturity ? '✅' : '❌'}`);
        console.log('');
        
        console.log('📝 Card Text Preview:');
        console.log(xsolStructure.cardInfo.textPreview);
        console.log('');
      } else {
        console.log('⚠️  Could not find parent card structure');
      }
      
      if (xsolStructure.extractionAttempt) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔬 EXTRACTION TEST (using scraper logic):\n');
        console.log(`   Asset Name: ${xsolStructure.extractionAttempt.assetName || '❌ NOT EXTRACTED'}`);
        console.log(`   Leverage: ${xsolStructure.extractionAttempt.leverage || '❌ NOT EXTRACTED'}`);
        console.log(`   APY: ${xsolStructure.extractionAttempt.apy || '❌ NOT EXTRACTED'}`);
        console.log(`   Maturity Days: ${xsolStructure.extractionAttempt.maturityDays || '❌ NOT EXTRACTED'}`);
        console.log(`   Maturity Hours: ${xsolStructure.extractionAttempt.maturityHours || '❌ NOT EXTRACTED'}`);
        console.log('');
        
        // Check what would pass the filter
        const hasLeverage = xsolStructure.extractionAttempt.leverage !== null;
        const hasMaturity = xsolStructure.extractionAttempt.maturityDays !== null || 
                           xsolStructure.extractionAttempt.maturityHours !== null;
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ FILTER CHECK (line 867 in scraper.js):\n');
        console.log(`   if (leverage !== null && maturityDays !== null)`);
        console.log(`   Leverage: ${hasLeverage ? '✅ PASS' : '❌ FAIL (null)'}`);
        console.log(`   Maturity: ${hasMaturity ? '✅ PASS' : '❌ FAIL (null)'}`);
        console.log('');
        
        if (hasLeverage && hasMaturity) {
          console.log('✅ This asset WOULD PASS the filter!');
          console.log('   Should appear in Gist data.');
        } else {
          console.log('❌ This asset WOULD BE FILTERED OUT!');
          console.log('   Reason: Missing required fields.');
          
          if (!hasLeverage) console.log('   → Leverage extraction failed');
          if (!hasMaturity) console.log('   → Maturity extraction failed');
        }
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📄 FULL CARD TEXT:\n');
        console.log(xsolStructure.extractionAttempt.cardTextFull);
      }
    }
    
    await browser.close();
    
    console.log('\n✅ Structure analysis complete!\n');
    
    return xsolStructure;
    
  } catch (error) {
    console.error('❌ Error:', error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

// Run the test
testXSOLStructure()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
