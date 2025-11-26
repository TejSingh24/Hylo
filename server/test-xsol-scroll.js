/**
 * Test if xSOL-2511 card becomes visible after scrolling
 * Run with: node server/test-xsol-scroll.js
 */

import puppeteerCore from 'puppeteer-core';

const puppeteer = puppeteerCore;

async function testXSOLScroll() {
  let browser;
  
  try {
    console.log('🔍 Testing if xSOL-2511 appears after scrolling...\n');
    
    const executablePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    
    browser = await puppeteer.launch({
      executablePath: executablePath,
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      ignoreHTTPSErrors: true,
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('📡 Loading Rate-X page...');
    await page.goto('https://app.rate-x.io/leverage', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    await page.waitForTimeout(2000);
    console.log('✅ Page loaded\n');
    
    // Test extraction BEFORE scrolling
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 BEFORE SCROLLING:\n');
    
    const beforeScroll = await page.evaluate(() => {
      const cardText = document.body.innerText;
      const hasXSOL2511 = cardText.includes('xSOL-2511');
      const has5Hours = cardText.includes('5Hours') || cardText.includes('5 Hours');
      
      // Try to find the card
      const allElements = Array.from(document.querySelectorAll('*'));
      let foundCard = null;
      
      for (const el of allElements) {
        const text = el.textContent || '';
        if (text.includes('xSOL-2511') && text.includes('Hours') && text.length < 200) {
          foundCard = {
            text: text.substring(0, 150),
            className: el.className
          };
          break;
        }
      }
      
      return { hasXSOL2511, has5Hours, foundCard };
    });
    
    console.log(`   xSOL-2511 in page text: ${beforeScroll.hasXSOL2511 ? '✅' : '❌'}`);
    console.log(`   "5 Hours" in page text: ${beforeScroll.has5Hours ? '✅' : '❌'}`);
    console.log(`   Card found: ${beforeScroll.foundCard ? '✅' : '❌'}`);
    if (beforeScroll.foundCard) {
      console.log(`      Card text: ${beforeScroll.foundCard.text}`);
    }
    console.log('');
    
    // Scroll down like the scraper does (3 times, 1500px each)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📜 SCROLLING (like scraper does):\n');
    
    for (let i = 0; i < 3; i++) {
      console.log(`   Scroll ${i + 1}/3 (1500px)...`);
      await page.evaluate(() => {
        window.scrollBy(0, 1500);
      });
      await page.waitForTimeout(800);
    }
    
    console.log('   ✅ Scrolling complete\n');
    
    // Test extraction AFTER scrolling
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 AFTER SCROLLING:\n');
    
    const afterScroll = await page.evaluate(() => {
      const results = {
        hasXSOL2511: false,
        has5Hours: false,
        cardCount: 0,
        xsolCards: []
      };
      
      const cardText = document.body.innerText;
      results.hasXSOL2511 = cardText.includes('xSOL-2511');
      results.has5Hours = cardText.includes('5Hours') || cardText.includes('5 Hours');
      
      // Find ALL cards with xSOL
      const allElements = Array.from(document.querySelectorAll('*'));
      
      for (const el of allElements) {
        const text = el.textContent || '';
        
        // Look for xSOL asset names
        if (/xSOL-\d{4}/.test(text) && text.length < 300) {
          // Check if this is an actual card (has leverage/apy info)
          const hasLeverage = /Yield\s+Exposure\s*[\d.]+x/i.test(text);
          const hasAPY = /Underlying\s+APY/i.test(text) || /APY\s*[\d.]+%/i.test(text);
          const hasMaturity = /\d+\s*Days/i.test(text) || /\d+\s*Hours/i.test(text);
          
          if (hasLeverage || hasAPY || hasMaturity) {
            const assetMatch = text.match(/xSOL-(\d{4})/);
            const leverageMatch = text.match(/Yield\s+Exposure[^\d]*([\d.]+)\s*x/i);
            const maturityDaysMatch = text.match(/([\d]+)\s*Days/i);
            const maturityHoursMatch = text.match(/([\d.]+)\s*Hours?/i);
            
            results.xsolCards.push({
              assetName: assetMatch ? assetMatch[0] : 'unknown',
              leverage: leverageMatch ? leverageMatch[1] : null,
              maturityDays: maturityDaysMatch ? maturityDaysMatch[1] : null,
              maturityHours: maturityHoursMatch ? maturityHoursMatch[1] : null,
              text: text.substring(0, 120)
            });
          }
        }
      }
      
      results.cardCount = results.xsolCards.length;
      return results;
    });
    
    console.log(`   xSOL-2511 in page text: ${afterScroll.hasXSOL2511 ? '✅' : '❌'}`);
    console.log(`   "5 Hours" in page text: ${afterScroll.has5Hours ? '✅' : '❌'}`);
    console.log(`   xSOL cards found: ${afterScroll.cardCount}\n`);
    
    if (afterScroll.xsolCards.length > 0) {
      console.log('   Found xSOL cards:');
      afterScroll.xsolCards.forEach((card, idx) => {
        console.log(`   ${idx + 1}. ${card.assetName}`);
        console.log(`      Leverage: ${card.leverage || 'NOT FOUND'}`);
        console.log(`      Maturity Days: ${card.maturityDays || 'NOT FOUND'}`);
        console.log(`      Maturity Hours: ${card.maturityHours || 'NOT FOUND'}`);
        console.log(`      Text: ${card.text}`);
        console.log('');
      });
    } else {
      console.log('   ⚠️  No xSOL cards found with extractable data');
    }
    
    // Try scrolling MORE
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📜 ADDITIONAL SCROLLING (testing more):\n');
    
    for (let i = 0; i < 5; i++) {
      console.log(`   Extra scroll ${i + 1}/5 (1500px)...`);
      await page.evaluate(() => {
        window.scrollBy(0, 1500);
      });
      await page.waitForTimeout(800);
    }
    
    // Check again
    const afterMoreScroll = await page.evaluate(() => {
      const xsolCards = [];
      const allElements = Array.from(document.querySelectorAll('*'));
      
      for (const el of allElements) {
        const text = el.textContent || '';
        
        if (/xSOL-\d{4}/.test(text) && text.length < 300) {
          const hasLeverage = /Yield\s+Exposure\s*[\d.]+x/i.test(text);
          const hasAPY = /Underlying\s+APY/i.test(text) || /APY\s*[\d.]+%/i.test(text);
          const hasMaturity = /\d+\s*Days/i.test(text) || /\d+\s*Hours/i.test(text);
          
          if (hasLeverage || hasAPY || hasMaturity) {
            const assetMatch = text.match(/xSOL-(\d{4})/);
            const leverageMatch = text.match(/Yield\s+Exposure[^\d]*([\d.]+)\s*x/i);
            const maturityDaysMatch = text.match(/([\d]+)\s*Days/i);
            const maturityHoursMatch = text.match(/([\d.]+)\s*Hours?/i);
            
            xsolCards.push({
              assetName: assetMatch ? assetMatch[0] : 'unknown',
              leverage: leverageMatch ? leverageMatch[1] : null,
              maturityDays: maturityDaysMatch ? maturityDaysMatch[1] : null,
              maturityHours: maturityHoursMatch ? maturityHoursMatch[1] : null
            });
          }
        }
      }
      
      return xsolCards;
    });
    
    console.log(`\n   xSOL cards found after MORE scrolling: ${afterMoreScroll.length}\n`);
    
    afterMoreScroll.forEach((card, idx) => {
      console.log(`   ${idx + 1}. ${card.assetName}`);
      console.log(`      Leverage: ${card.leverage || 'NOT FOUND'}`);
      console.log(`      Maturity: ${card.maturityDays ? card.maturityDays + ' Days' : (card.maturityHours ? card.maturityHours + ' Hours' : 'NOT FOUND')}`);
      console.log('');
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 CONCLUSION:\n');
    
    const found2511 = afterMoreScroll.some(c => c.assetName === 'xSOL-2511');
    
    if (found2511) {
      console.log('✅ xSOL-2511 WAS FOUND after additional scrolling!');
      console.log('   Problem: Scraper needs to scroll more or scroll to bottom.');
    } else if (afterScroll.hasXSOL2511) {
      console.log('⚠️  xSOL-2511 exists in page text but extraction failed.');
      console.log('   Problem: Extraction logic needs adjustment.');
    } else {
      console.log('❌ xSOL-2511 still not found.');
      console.log('   Problem: Asset may be expired or hidden.');
    }
    
    await browser.close();
    
    console.log('\n✅ Scroll test complete!\n');
    
    return { beforeScroll, afterScroll, afterMoreScroll };
    
  } catch (error) {
    console.error('❌ Error:', error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

// Run the test
testXSOLScroll()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
