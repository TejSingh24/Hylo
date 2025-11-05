/**
 * LOCAL TEST SCRIPT for xSOL scraper
 * This version uses puppeteer instead of puppeteer-core for local testing
 * 
 * INSTALL FIRST: npm install puppeteer --save-dev
 * Then run: node test-xsol-local.js
 */

import puppeteer from 'puppeteer';

console.log('============================================================');
console.log('TESTING SCRAPER FOR xSOL (LOCAL VERSION)');
console.log('============================================================');

async function scrapeAssetDataLocal(assetName = 'xSOL') {
  let browser;
  
  try {
    console.log(`Starting scraper for asset: ${assetName}`);
    
    // Launch local Chrome
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    console.log('Navigating to Rate-X leverage page...');
    await page.goto('https://app.rate-x.io/leverage', {
      waitUntil: 'domcontentloaded',
      timeout: 90000
    });
    
    console.log('Waiting for asset cards to load...');
    try {
      await page.waitForFunction(
        () => document.body.innerText.length > 1000,
        { timeout: 10000 }
      );
    } catch (e) {
      console.warn('Content may not be fully loaded, proceeding anyway...');
    }
    
    // Scroll down to load all cards
    console.log('Scrolling to load all cards...');
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        window.scrollBy(0, 1500);
      });
      await page.waitForTimeout(800);
    }
    
    console.log(`Looking for ${assetName} card...`);
    
    // Extract data from the page
    const assetData = await page.evaluate((targetAsset) => {
      console.log('Looking for asset:', targetAsset);
      
      const allText = document.body.innerText;
      console.log('Page contains asset name?', allText.includes(targetAsset));
      
      const allElements = Array.from(document.querySelectorAll('*'));
      let assetCard = null;
      let smallestCardLevel = 999;
      
      for (const element of allElements) {
        const text = element.textContent || '';
        const trimmedText = text.trim();
        
        const assetPattern = new RegExp(`^${targetAsset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d{4}$`, 'i');
        
        if (assetPattern.test(trimmedText)) {
          let current = element;
          for (let i = 0; i < 15; i++) {
            if (!current.parentElement) break;
            current = current.parentElement;
            
            const textContent = current.textContent;
            const hasYieldExposure = textContent.includes('Yield Exposure');
            const hasAPY = textContent.includes('Underlying APY');
            const hasDays = textContent.includes('Days');
            const hasAssetTitle = textContent.includes(trimmedText);
            
            if (hasYieldExposure && hasAPY && hasDays && hasAssetTitle) {
              if (i < smallestCardLevel) {
                assetCard = current;
                smallestCardLevel = i;
              }
              break;
            }
          }
        }
      }
      
      if (!assetCard) {
        throw new Error(`Asset card for ${targetAsset} not found on the page`);
      }
      
      console.log('Found asset card!');
      const cardText = assetCard.textContent;
      console.log('Card text preview:', cardText.substring(0, 500));
      
      // Extract full asset name from the card
      const fullNameMatch = cardText.match(new RegExp(`${targetAsset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d{4}`, 'i'));
      const fullAssetName = fullNameMatch ? fullNameMatch[0] : targetAsset;
      
      const result = {
        asset: fullAssetName,
        baseAsset: targetAsset,
        leverage: null,
        apy: null,
        maturityDays: null,
        assetBoost: null,
        ratexBoost: null,
        impliedYield: null
      };
      
      // Extract Leverage
      const leverageMatch = cardText.match(/Yield\s+Exposure[^\d]*([\d.]+)\s*x/i);
      if (leverageMatch) {
        result.leverage = parseFloat(leverageMatch[1]);
        console.log('Found leverage:', result.leverage);
      }
      
      // Extract APY
      const apyMatch = cardText.match(/Underlying\s+APY\s*([\d.]+)\s*%/i);
      if (apyMatch) {
        result.apy = parseFloat(apyMatch[1]);
        console.log('Found APY:', result.apy);
      }
      
      // Extract Implied Yield
      const impliedYieldMatch = cardText.match(/Implied\s+Yield[:\s]*([\d.]+)\s*%/i);
      if (impliedYieldMatch) {
        result.impliedYield = parseFloat(impliedYieldMatch[1]);
        console.log('Found Implied Yield:', result.impliedYield);
      }
      
      // Extract Maturity Days
      const maturityMatch = cardText.match(/([\d]+)\s*Days/i);
      if (maturityMatch) {
        result.maturityDays = parseInt(maturityMatch[1]);
        console.log('Found maturity:', result.maturityDays);
      }
      
      // Extract Asset Boost and RateX Boost
      const assetNamePattern = new RegExp(`${targetAsset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d{4}`, 'i');
      const cleanedText = cardText.replace(assetNamePattern, '');
      const boostSection = cleanedText.split('Yield Exposure')[0];
      const boostMatches = boostSection.match(/(\d+)x/gi);
      
      if (boostMatches && boostMatches.length >= 2) {
        result.assetBoost = parseFloat(boostMatches[0].replace(/x/i, ''));
        result.ratexBoost = parseFloat(boostMatches[1].replace(/x/i, ''));
        console.log('Found boosts:', result.assetBoost, result.ratexBoost);
      } else if (boostMatches && boostMatches.length === 1) {
        result.assetBoost = parseFloat(boostMatches[0].replace(/x/i, ''));
        result.ratexBoost = 1;
        console.log('Found single boost:', result.assetBoost);
      }
      
      return result;
    }, assetName);
    
    console.log('Scraped data:', assetData);
    
    await browser.close();
    return assetData;
    
  } catch (error) {
    console.error('Error scraping asset data:', error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

try {
  const data = await scrapeAssetDataLocal('xSOL');
  
  console.log('\n============================================================');
  console.log('✅ SUCCESS! Retrieved data:');
  console.log('============================================================\n');
  
  console.log(`Full Asset Name: ${data.asset}`);
  console.log(`Base Asset Name: ${data.baseAsset}`);
  console.log(`Leverage: ${data.leverage}x`);
  console.log(`APY: ${data.apy}%`);
  console.log(`Implied Yield: ${data.impliedYield}%`);
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
