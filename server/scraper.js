import puppeteer from 'puppeteer';

/**
 * Scrapes asset data from Rate-X leverage page
 * @param {string} assetName - The name of the asset to scrape (e.g., 'HyloSOL', 'HYusd', 'sHYUSD', 'xSOL')
 * @returns {Promise<Object>} Asset data including leverage, APY, maturity days, asset boost, and RateX boost
 */
export async function scrapeAssetData(assetName = 'HyloSOL') {
  let browser;
  
  try {
    console.log(`Starting scraper for asset: ${assetName}`);
    
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });
    
    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('Navigating to Rate-X leverage page...');
    await page.goto('https://app.rate-x.io/leverage', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // Wait longer for dynamic content to load
    await page.waitForTimeout(5000);
    
    // Scroll down multiple times to load ALL cards
    console.log('Scrolling to load all cards...');
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        window.scrollBy(0, 1500);
      });
      await page.waitForTimeout(1500);
    }
    
    console.log(`Looking for ${assetName} card...`);
    
    // First, let's see what's on the page
    const pageContent = await page.evaluate(() => {
      return {
        bodyText: document.body.innerText.substring(0, 3000), // Increased to see more cards
        hasCards: document.querySelectorAll('[class*="card"]').length,
        hasDivs: document.querySelectorAll('div').length
      };
    });
    
    console.log('Page content preview (first 3000 chars):', pageContent);
    
    // Extract data from the page with improved selectors
    const assetData = await page.evaluate((targetAsset) => {
      console.log('Looking for asset:', targetAsset);
      
      // Try multiple strategies to find the asset card
      const allText = document.body.innerText;
      console.log('Page contains asset name?', allText.includes(targetAsset));
      
      // Strategy: Find the exact asset card in the scrolled list
      // Asset cards are formatted as: "assetName-MMYY" (e.g., "hyloSOL+-2511", "xSOL-2511")
      const allElements = Array.from(document.querySelectorAll('*'));
      let assetCard = null;
      let smallestCardLevel = 999; // Track the smallest (most specific) card
      
      // Find element that contains the asset name followed by a dash (exact match)
      for (const element of allElements) {
        const text = element.textContent || '';
        const trimmedText = text.trim();
        
        // Look for pattern: "assetName-" at the start of the text
        // This ensures we match "hyloSOL+-2511" and not "hyloSOL-2511"
        const assetPattern = new RegExp(`^${targetAsset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d{4}$`, 'i');
        
        if (assetPattern.test(trimmedText)) {
          // Found element with asset name, now find parent card
          let current = element;
          for (let i = 0; i < 15; i++) {
            if (!current.parentElement) break;
            current = current.parentElement;
            
            // Check if this looks like a complete card
            const textContent = current.textContent;
            
            // Must contain ALL key indicators of a leverage card
            const hasYieldExposure = textContent.includes('Yield Exposure');
            const hasAPY = textContent.includes('Underlying APY');
            const hasDays = textContent.includes('Days');
            const hasAssetTitle = textContent.includes(trimmedText); // Must contain the exact title
            
            if (hasYieldExposure && hasAPY && hasDays && hasAssetTitle) {
              // Prefer the smallest (most specific) card
              if (i < smallestCardLevel) {
                assetCard = current;
                smallestCardLevel = i;
              }
              break; // Don't traverse further up for this element
            }
          }
        }
      }
      
      if (!assetCard) {
        console.log('Could not find asset card');
        console.log('Available text preview:', allText.substring(0, 2000));
        throw new Error(`Asset card for ${targetAsset} not found on the page`);
      }
      
      console.log('Found asset card!');
      const cardText = assetCard.textContent;
      console.log('Card text preview:', cardText.substring(0, 500));
      
      // Initialize result object
      const result = {
        asset: targetAsset,
        leverage: null,
        apy: null,
        maturityDays: null,
        assetBoost: null,
        ratexBoost: null
      };
      
      // Extract data using regex patterns on the full card text
      
      // Extract Leverage (Yield Exposure) - look for patterns like "18.7x" or "Yield Exposure 18.7x"
      const leverageMatch = cardText.match(/Yield\s+Exposure[^\d]*([\d.]+)\s*x/i);
      if (leverageMatch) {
        result.leverage = parseFloat(leverageMatch[1]);
        console.log('Found leverage:', result.leverage);
      }
      
      // Extract APY - look for patterns like "4.2%" near "APY" or "Underlying APY" (may have no space)
      const apyMatch = cardText.match(/Underlying\s+APY\s*([\d.]+)\s*%/i);
      if (apyMatch) {
        result.apy = parseFloat(apyMatch[1]);
        console.log('Found APY:', result.apy);
      }
      
      // Extract Maturity Days - look for patterns like "14 Days" or just number before "Days"
      const maturityMatch = cardText.match(/([\d]+)\s*Days/i);
      if (maturityMatch) {
        result.maturityDays = parseInt(maturityMatch[1]);
        console.log('Found maturity:', result.maturityDays);
      }
      
      // Extract Asset Boost and RateX Boost
      // These appear as "8x" and "5x" AFTER the asset name and BEFORE "Yield Exposure"
      // Pattern: assetName-MMYY \n 8x \n 5x \n Yield Exposure
      // Some assets may have only 1 boost value
      // First, remove the asset name with version (e.g., "hyloSOL+-2511") to avoid matching "2511x"
      const assetNamePattern = new RegExp(`${targetAsset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d{4}`, 'i');
      const cleanedText = cardText.replace(assetNamePattern, ''); // Remove asset name
      const boostSection = cleanedText.split('Yield Exposure')[0]; // Get text before "Yield Exposure"
      const boostMatches = boostSection.match(/(\d+)x/gi);
      
      if (boostMatches && boostMatches.length >= 2) {
        // First two "Xx" values after removing asset name are the boosts
        result.assetBoost = parseFloat(boostMatches[0].replace(/x/i, ''));
        result.ratexBoost = parseFloat(boostMatches[1].replace(/x/i, ''));
        console.log('Found boosts:', result.assetBoost, result.ratexBoost);
      } else if (boostMatches && boostMatches.length === 1) {
        // Only one boost found - assign to asset boost
        result.assetBoost = parseFloat(boostMatches[0].replace(/x/i, ''));
        result.ratexBoost = 1; // Default to 1x for RateX boost
        console.log('Found single boost:', result.assetBoost);
      }
      
      return result;
    }, assetName);
    
    console.log('Scraped data:', assetData);
    
    // Validate that we got the essential data
    const missingFields = [];
    if (assetData.leverage === null) missingFields.push('leverage');
    if (assetData.apy === null) missingFields.push('apy');
    if (assetData.maturityDays === null) missingFields.push('maturityDays');
    
    if (missingFields.length > 0) {
      console.warn(`Warning: Could not extract the following fields: ${missingFields.join(', ')}`);
    }
    
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

/**
 * Scrapes all available assets from Rate-X leverage page
 * NOW OPTIMIZED: Scrapes ALL asset data in ONE page visit!
 * @returns {Promise<Array>} Array of all asset data
 */
export async function scrapeAllAssets() {
  let browser;
  
  try {
    console.log('🚀 Starting optimized scraper - fetching ALL assets in one go!');
    
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('Navigating to Rate-X leverage page...');
    await page.goto('https://app.rate-x.io/leverage', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    await page.waitForTimeout(5000);
    
    // Scroll to load all cards
    console.log('Scrolling to load all cards...');
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        window.scrollBy(0, 1500);
      });
      await page.waitForTimeout(1500);
    }
    
    console.log('⚡ Extracting ALL asset data in one operation...');
    
    // Extract ALL assets data in ONE operation
    const allAssetData = await page.evaluate(() => {
      const assets = [];
      const processedAssets = new Set();
      
      // Find all elements that might be asset names
      const allElements = Array.from(document.querySelectorAll('*'));
      
      for (const element of allElements) {
        const text = element.textContent || '';
        const trimmedText = text.trim();
        
        // Match pattern: "AssetName-MMYY" (e.g., "xSOL-2511", "hyloSOL+-2511", "USD*-2512")
        const assetNameMatch = trimmedText.match(/^([A-Za-z0-9*+\-]+)-(\d{4})$/);
        
        if (assetNameMatch) {
          const fullAssetName = assetNameMatch[0]; // e.g., "xSOL-2511"
          const assetName = assetNameMatch[1]; // e.g., "xSOL"
          
          // Skip if already processed this asset
          if (processedAssets.has(assetName)) continue;
          
          // Now find the parent card containing all data for this asset
          let current = element;
          let cardFound = false;
          
          for (let i = 0; i < 15; i++) {
            if (!current.parentElement) break;
            current = current.parentElement;
            
            const cardText = current.textContent;
            
            // Check if this is a complete card with all required fields
            const hasYieldExposure = cardText.includes('Yield Exposure');
            const hasAPY = cardText.includes('Underlying APY');
            const hasDays = cardText.includes('Days');
            const hasAssetName = cardText.includes(fullAssetName);
            
            if (hasYieldExposure && hasAPY && hasDays && hasAssetName) {
              // Found complete card - extract all data
              const result = {
                asset: assetName,
                leverage: null,
                apy: null,
                maturityDays: null,
                assetBoost: null,
                ratexBoost: null
              };
              
              // Extract Leverage (Yield Exposure)
              const leverageMatch = cardText.match(/Yield\s+Exposure[^\d]*([\d.]+)\s*x/i);
              if (leverageMatch) {
                result.leverage = parseFloat(leverageMatch[1]);
              }
              
              // Extract APY
              const apyMatch = cardText.match(/Underlying\s+APY\s*([\d.]+)\s*%/i);
              if (apyMatch) {
                result.apy = parseFloat(apyMatch[1]);
              }
              
              // Extract Maturity Days
              const maturityMatch = cardText.match(/([\d]+)\s*Days/i);
              if (maturityMatch) {
                result.maturityDays = parseInt(maturityMatch[1]);
              }
              
              // Extract Asset Boost and RateX Boost
              const assetNamePattern = new RegExp(`${assetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d{4}`, 'i');
              const cleanedText = cardText.replace(assetNamePattern, '');
              const boostSection = cleanedText.split('Yield Exposure')[0];
              const boostMatches = boostSection.match(/(\d+)x/gi);
              
              if (boostMatches && boostMatches.length >= 2) {
                result.assetBoost = parseFloat(boostMatches[0].replace(/x/i, ''));
                result.ratexBoost = parseFloat(boostMatches[1].replace(/x/i, ''));
              } else if (boostMatches && boostMatches.length === 1) {
                result.assetBoost = parseFloat(boostMatches[0].replace(/x/i, ''));
                result.ratexBoost = 1;
              }
              
              // Only add if we got essential data (leverage and maturity are required)
              if (result.leverage !== null && result.maturityDays !== null) {
                assets.push(result);
                processedAssets.add(assetName);
              }
              
              cardFound = true;
              break;
            }
          }
        }
      }
      
      return assets;
    });
    
    console.log(`✅ Successfully scraped ${allAssetData.length} assets in ONE page visit!`);
    console.log('Assets found:', allAssetData.map(a => a.asset).join(', '));
    
    await browser.close();
    return allAssetData;
    
  } catch (error) {
    console.error('Error scraping all assets:', error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}
