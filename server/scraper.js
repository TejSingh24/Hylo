import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { chmod } from 'fs/promises';

const puppeteer = puppeteerCore;

// Gist configuration
const GIST_ID = process.env.GIST_ID || 'd3a1db6fc79e168cf5dff8d3a2c11706';
const GIST_RAW_URL = `https://gist.githubusercontent.com/TejSingh24/${GIST_ID}/raw/ratex-assets.json`;

/**
 * Fetch existing Gist data for fallback/merge
 * @returns {Promise<Object>} Map of asset name to asset data
 */
export async function fetchExistingGistData() {
  try {
    const response = await fetch(GIST_RAW_URL);
    if (!response.ok) {
      console.warn('⚠️ Could not fetch existing Gist data (may not exist yet)');
      return {};
    }
    
    const data = await response.json();
    
    // Convert array to map for fast lookup
    const dataMap = {};
    if (data.assets && Array.isArray(data.assets)) {
      data.assets.forEach(asset => {
        dataMap[asset.asset] = asset;
      });
    }
    
    console.log(`✅ Loaded ${Object.keys(dataMap).length} assets from existing Gist`);
    return dataMap;
  } catch (error) {
    console.warn('⚠️ Error fetching existing Gist data, starting fresh:', error.message);
    return {};
  }
}

/**
 * Calculate time until maturity from maturity date
 * @param {string} maturityUTC - Maturity date string (e.g., "2025-11-29 00:00:00 UTC")
 * @returns {string} Time until maturity (e.g., "23d 10h")
 */
export function calculateMaturesIn(maturityUTC) {
  try {
    const maturityDate = new Date(maturityUTC);
    const now = new Date();
    const diffMs = maturityDate - now;
    
    if (diffMs <= 0) return "Expired";
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return `${days}d ${hours}h`;
  } catch (error) {
    console.warn('Error calculating maturesIn:', error.message);
    return null;
  }
}

/**
 * Format YT price with adaptive decimal precision (at least 3 non-zero digits)
 * @param {number} value - Raw YT price value
 * @returns {number|null} - Formatted value with appropriate decimals
 */
function formatYtPrice(value) {
  if (value === null || value === undefined) return null;
  
  const absValue = Math.abs(value);
  
  // >= 1.0 → 3 decimals (e.g., 1.234)
  if (absValue >= 1.0) return parseFloat(value.toFixed(3));
  
  // 0.1 to 0.999 → 4 decimals (e.g., 0.1234)
  if (absValue >= 0.1) return parseFloat(value.toFixed(4));
  
  // 0.01 to 0.099 → 5 decimals (e.g., 0.01234)
  if (absValue >= 0.01) return parseFloat(value.toFixed(5));
  
  // 0.001 to 0.0099 → 6 decimals (e.g., 0.001234)
  if (absValue >= 0.001) return parseFloat(value.toFixed(6));
  
  // 0.0001 to 0.00099 → 7 decimals (e.g., 0.0001234)
  if (absValue >= 0.0001) return parseFloat(value.toFixed(7));
  
  // Even smaller → 8 decimals
  return parseFloat(value.toFixed(8));
}

/**
 * Format percentage with adaptive precision (at least 2 non-zero digits)
 * @param {number} value - Percentage value
 * @returns {number|null} - Formatted percentage with appropriate decimals
 */
function formatPercentage(value) {
  if (value === null || value === undefined) return null;
  
  const absValue = Math.abs(value);
  
  if (absValue >= 1.0) return parseFloat(value.toFixed(2));
  if (absValue >= 0.1) return parseFloat(value.toFixed(2));
  if (absValue >= 0.01) return parseFloat(value.toFixed(3));
  if (absValue >= 0.001) return parseFloat(value.toFixed(4));
  if (absValue >= 0.0001) return parseFloat(value.toFixed(5));
  return parseFloat(value.toFixed(6));
}

/**
 * Calculate YT price using formula: 1 - (1 + r)^(-T)
 * @param {string} maturity - Maturity date in UTC format
 * @param {number} yieldRate - Yield rate as percentage (e.g., 62.115)
 * @param {string} lastUpdated - Timestamp when data was fetched
 * @returns {number|null} - YT price with adaptive precision, or null if invalid
 */
function calculateYtPrice(maturity, yieldRate, lastUpdated) {
  if (!maturity || yieldRate === null || yieldRate === undefined || !lastUpdated) {
    return null;
  }
  
  try {
    const maturityDate = new Date(maturity);
    const updatedDate = new Date(lastUpdated);
    
    if (isNaN(maturityDate.getTime()) || isNaN(updatedDate.getTime())) {
      return null;
    }
    
    const diffMs = maturityDate.getTime() - updatedDate.getTime();
    
    if (diffMs <= 0) return 0; // Maturity passed
    
    const T = diffMs / (365 * 24 * 60 * 60 * 1000); // Years
    const r = yieldRate / 100; // Convert percentage to decimal
    const ytPrice = 1 - Math.pow(1 + r, -T);
    
    return formatYtPrice(ytPrice);
  } catch (error) {
    console.warn(`Error calculating YT price:`, error.message);
    return null;
  }
}

/**
 * Calculate all YT-related metrics for an asset
 * @param {string} maturity - Maturity date
 * @param {number} impliedYield - Implied yield percentage
 * @param {number} rangeLower - Lower yield range percentage
 * @param {number} rangeUpper - Upper yield range percentage
 * @param {string} lastUpdated - Timestamp when data was fetched
 * @returns {Object} All YT metrics (prices, upside, downside, decay, end-day)
 */
function calculateYtMetrics(maturity, impliedYield, rangeLower, rangeUpper, lastUpdated) {
  const result = {
    ytPriceCurrent: null,
    ytPriceLower: null,
    ytPriceUpper: null,
    upsidePotential: null,
    downsideRisk: null,
    endDayMinimumPct: null,
    dailyDecayRate: null
  };
  
  if (!maturity || !lastUpdated) return result;
  
  try {
    const maturityDate = new Date(maturity);
    const updatedDate = new Date(lastUpdated);
    const diffMs = maturityDate.getTime() - updatedDate.getTime();
    
    // Maturity passed - all zeros
    if (diffMs <= 0) {
      return {
        ytPriceCurrent: 0,
        ytPriceLower: 0,
        ytPriceUpper: 0,
        upsidePotential: 0,
        downsideRisk: 0,
        endDayMinimumPct: 0,
        dailyDecayRate: 0
      };
    }
    
    const currentT = diffMs / (365 * 24 * 60 * 60 * 1000); // Years
    
    // Calculate YT prices
    result.ytPriceCurrent = calculateYtPrice(maturity, impliedYield, lastUpdated);
    result.ytPriceLower = calculateYtPrice(maturity, rangeLower, lastUpdated);
    result.ytPriceUpper = calculateYtPrice(maturity, rangeUpper, lastUpdated);
    
    // Calculate upside/downside (only if all prices available)
    if (result.ytPriceCurrent && result.ytPriceUpper) {
      const upside = ((result.ytPriceUpper - result.ytPriceCurrent) / result.ytPriceCurrent) * 100;
      result.upsidePotential = formatPercentage(upside);
    }
    
    if (result.ytPriceCurrent && result.ytPriceLower) {
      const downside = ((result.ytPriceCurrent - result.ytPriceLower) / result.ytPriceCurrent) * 100;
      result.downsideRisk = formatPercentage(downside);
    }
    
    // Only 1 day left edge case
    if (currentT <= 1/365) {
      result.dailyDecayRate = 100;
      result.endDayMinimumPct = 0;
      return result;
    }
    
    // Daily decay rate (time decay with constant yield)
    if (impliedYield !== null && impliedYield !== undefined) {
      const tomorrowT = currentT - (1/365);
      const r = impliedYield / 100;
      const ytToday = 1 - Math.pow(1 + r, -currentT);
      const ytTomorrow = 1 - Math.pow(1 + r, -tomorrowT);
      const decay = ((ytToday - ytTomorrow) / ytToday) * 100;
      result.dailyDecayRate = formatPercentage(decay);
    }
    
    // End-day minimum (worst case: 1 day left + lower yield)
    if (rangeLower !== null && rangeLower !== undefined && result.ytPriceCurrent) {
      const T_oneDay = 1 / 365;
      const r_lower = rangeLower / 100;
      const ytEndWorstCase = 1 - Math.pow(1 + r_lower, -T_oneDay);
      const endDayLoss = ((result.ytPriceCurrent - ytEndWorstCase) / result.ytPriceCurrent) * 100;
      result.endDayMinimumPct = formatPercentage(endDayLoss);
    }
    
    return result;
  } catch (error) {
    console.warn(`Error calculating YT metrics:`, error.message);
    return result;
  }
}

/**
 * Scrapes asset data from Rate-X leverage page
 * @param {string} assetName - The name of the asset to scrape (e.g., 'HyloSOL', 'HYusd', 'sHYUSD', 'xSOL')
 * @returns {Promise<Object>} Asset data including full name, base name, leverage, APY, maturity days, asset boost, RateX boost, and implied yield
 */
export async function scrapeAssetData(assetName = 'HyloSOL') {
  let browser;
  
  try {
    console.log(`Starting scraper for asset: ${assetName}`);
    
    // Get executable path and ensure it has proper permissions
    const executablePath = await chromium.executablePath();
    
    // Fix ETXTBSY error by setting executable permissions
    try {
      await chmod(executablePath, 0o755);
    } catch (chmodError) {
      console.warn('Could not chmod chromium:', chmodError.message);
    }
    
    browser = await puppeteer.launch({
      args: [...chromium.args, '--single-process', '--no-zygote'],
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
    
    const page = await browser.newPage();
    
    console.log('Navigating to Rate-X leverage page...');
    await page.goto('https://app.rate-x.io/leverage', {
      waitUntil: 'domcontentloaded', // Faster than 'networkidle2'
      timeout: 90000 // 90 seconds (1:30 min) to handle cold starts
    });
    
    // Wait for cards to appear instead of fixed timeout
    console.log('Waiting for asset cards to load...');
    try {
      await page.waitForFunction(
        () => document.body.innerText.length > 1000,
        { timeout: 10000 }
      );
    } catch (e) {
      console.warn('Content may not be fully loaded, proceeding anyway...');
    }
    
    // Scroll down multiple times to load ALL cards
    console.log('Scrolling to load all cards...');
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        window.scrollBy(0, 1500);
      });
      await page.waitForTimeout(800); // Reduced from 1500ms to 800ms
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
      
      // Extract full asset name from the card (e.g., "xSOL-2511")
      const fullNameMatch = cardText.match(new RegExp(`${targetAsset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d{4}`, 'i'));
      const fullAssetName = fullNameMatch ? fullNameMatch[0] : targetAsset;
      
      // Initialize result object
      const result = {
        asset: fullAssetName,      // Full name: "xSOL-2511"
        baseAsset: targetAsset,    // Base name: "xSOL"
        leverage: null,
        apy: null,
        maturityDays: null,
        assetBoost: null,
        ratexBoost: null,
        impliedYield: null,
        
        // Phase 2 fields - not available from cards page
        rangeLower: null,
        rangeUpper: null,
        maturity: null,
        maturesIn: null
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
      
      // Extract Implied Yield - beside Yield Exposure, labeled as "Implied Yield"
      const impliedYieldMatch = cardText.match(/Implied\s+Yield[:\s]*([\d.]+)\s*%/i);
      if (impliedYieldMatch) {
        result.impliedYield = parseFloat(impliedYieldMatch[1]);
        console.log('Found Implied Yield:', result.impliedYield);
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
    
    // Get executable path and ensure it has proper permissions
    const executablePath = await chromium.executablePath();
    
    // Fix ETXTBSY error by setting executable permissions
    try {
      await chmod(executablePath, 0o755);
    } catch (chmodError) {
      console.warn('Could not chmod chromium:', chmodError.message);
    }
    
    browser = await puppeteer.launch({
      args: [...chromium.args, '--single-process', '--no-zygote'],
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
    
    const page = await browser.newPage();
    
    console.log('Navigating to Rate-X leverage page...');
    await page.goto('https://app.rate-x.io/leverage', {
      waitUntil: 'domcontentloaded', // Faster than 'networkidle2'
      timeout: 90000 // 90 seconds (1:30 min) to handle cold starts
    });
    
    // Wait for cards to appear instead of fixed timeout
    console.log('Waiting for asset cards to load...');
    try {
      await page.waitForFunction(
        () => document.body.innerText.length > 1000,
        { timeout: 10000 }
      );
    } catch (e) {
      console.warn('Content may not be fully loaded, proceeding anyway...');
    }
    
    // Scroll to load all cards
    console.log('Scrolling to load all cards...');
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        window.scrollBy(0, 1500);
      });
      await page.waitForTimeout(800); // Reduced from 1500ms to 800ms
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
          
          // Skip if already processed this full asset name (to handle duplicates)
          if (processedAssets.has(fullAssetName)) continue;
          
          // Now find the parent card containing all data for this asset
          // We want the SMALLEST (most specific) card, not the first one
          let current = element;
          let bestCard = null;
          let smallestLevel = 999;
          
          for (let i = 0; i < 15; i++) {
            if (!current.parentElement) break;
            current = current.parentElement;
            
            const cardText = current.textContent;
            
            // Check if this is a complete card with all required fields
            const hasYieldExposure = cardText.includes('Yield Exposure');
            const hasAPY = cardText.includes('Underlying APY');
            const hasDays = cardText.includes('Days');
            const hasAssetName = cardText.includes(fullAssetName);
            
            // IMPORTANT: Make sure this card contains ONLY this asset's data
            // Count how many asset-like patterns exist in this card
            // A valid individual card should have just ONE asset name pattern
            const assetPatternMatches = cardText.match(/[A-Za-z0-9*+\-]+-\d{4}/g);
            const isIndividualCard = assetPatternMatches && assetPatternMatches.length === 1;
            
            if (hasYieldExposure && hasAPY && hasDays && hasAssetName && isIndividualCard) {
              // Found a complete individual card - prefer the smallest (most specific) one
              if (i < smallestLevel) {
                bestCard = current;
                smallestLevel = i;
              }
            }
          }
          
          // Only process if we found a valid card
          if (bestCard) {
            const cardText = bestCard.textContent;
            
            // Extract all data
            const result = {
              asset: fullAssetName,      // Full name: "xSOL-2511"
              baseAsset: assetName,      // Base name: "xSOL"
              leverage: null,
              apy: null,
              maturityDays: null,
              assetBoost: null,
              ratexBoost: null,
              impliedYield: null,
              
              // Phase 2 fields - will be populated later
              rangeLower: null,
              rangeUpper: null,
              maturity: null,
              maturesIn: null
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
            
            // Extract Implied Yield - beside Yield Exposure
            const impliedYieldMatch = cardText.match(/Implied\s+Yield[:\s]*([\d.]+)\s*%/i);
            if (impliedYieldMatch) {
              result.impliedYield = parseFloat(impliedYieldMatch[1]);
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
            
            // Only add if we found essential data
            if (result.leverage !== null && result.maturityDays !== null) {
              assets.push(result);
              processedAssets.add(fullAssetName); // Track by full name to allow multiple versions
            }
          } // Close if (bestCard)
        } // Close if (assetNameMatch)
      } // Close for loop
      
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

/**
 * Scrape detail page for a single asset
 * @param {Object} page - Puppeteer page instance
 * @param {string} fullAssetName - Full asset name (e.g., "hyloSOL-2511")
 * @returns {Promise<Object>} Detail data including range, maturity, maturesIn, impliedYield
 */
export async function scrapeDetailPage(page, fullAssetName) {
  const url = `https://app.rate-x.io/liquidity/slp?symbol=${encodeURIComponent(fullAssetName)}&tab=Detail`;
  
  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    // Extract detail page data
    const detailData = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      
      const result = {
        rangeLower: null,
        rangeUpper: null,
        maturity: null,
        maturesIn: null,
        impliedYield: null
      };
      
      // Extract Range: "10% - 30%" or "10%-30%"
      const rangeMatch = bodyText.match(/Range[^\d]*([\d]+)%\s*-\s*([\d]+)%/i);
      if (rangeMatch) {
        result.rangeLower = parseInt(rangeMatch[1]);
        result.rangeUpper = parseInt(rangeMatch[2]);
      }
      
      // Extract Maturity: "2025-11-29 00:00:00 UTC"
      const maturityMatch = bodyText.match(/Maturity[^\d]*([\d]{4}-[\d]{2}-[\d]{2}\s+[\d]{2}:[\d]{2}:[\d]{2}\s+UTC)/i);
      if (maturityMatch) {
        result.maturity = maturityMatch[1];
      }
      
      // Extract Matures In: "23d 10h"
      const maturesInMatch = bodyText.match(/Matures\s+in[^\d]*([\d]+d\s+[\d]+h)/i);
      if (maturesInMatch) {
        result.maturesIn = maturesInMatch[1];
      }
      
      // Extract Implied Yield (updated value from detail page)
      const impliedYieldMatch = bodyText.match(/Implied\s+Yield[:\s]*([\d.]+)\s*%/i);
      if (impliedYieldMatch) {
        result.impliedYield = parseFloat(impliedYieldMatch[1]);
      }
      
      return result;
    });
    
    return detailData;
    
  } catch (error) {
    console.warn(`  ⚠️ Error scraping detail page for ${fullAssetName}:`, error.message);
    throw error;
  }
}

/**
 * Scrape detail page with retry logic
 * @param {Object} page - Puppeteer page instance
 * @param {string} fullAssetName - Full asset name
 * @param {number} maxRetries - Maximum number of retry attempts (default: 2)
 * @returns {Promise<Object|null>} Detail data or null if all retries fail
 */
export async function scrapeDetailPageWithRetry(page, fullAssetName, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`    Attempt ${attempt}/${maxRetries}...`);
      const detailData = await scrapeDetailPage(page, fullAssetName);
      
      // Validate that we got at least some data
      if (detailData.rangeLower !== null || detailData.maturity !== null) {
        return detailData;
      } else {
        throw new Error('No valid data extracted from detail page');
      }
    } catch (error) {
      console.warn(`    Attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        console.log(`    Retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  return null; // All retries failed
}

/**
 * Scrape detail pages for all assets (Phase 2)
 * @param {Object} page - Puppeteer page instance
 * @param {Array} assets - Array of asset objects from Phase 1
 * @param {Object} existingGistData - Map of existing Gist data for fallback
 * @returns {Promise<Array>} Assets with detail page data merged
 */
export async function scrapeDetailPages(page, assets, existingGistData) {
  console.log('🔍 PHASE 2: Fetching detail pages...');
  const lastUpdated = new Date().toISOString(); // Single timestamp for all calculations
  
  for (const asset of assets) {
    console.log(`  → Fetching details for ${asset.asset}...`);
    
    const detailData = await scrapeDetailPageWithRetry(page, asset.asset, 2);
    
    if (detailData) {
      // Success - update with fresh data
      asset.rangeLower = detailData.rangeLower;
      asset.rangeUpper = detailData.rangeUpper;
      asset.maturity = detailData.maturity;
      asset.maturesIn = detailData.maturesIn;
      
      // Override implied yield with latest value from detail page
      if (detailData.impliedYield !== null) {
        asset.impliedYield = detailData.impliedYield;
      }
      
      // Calculate all YT metrics
      const ytMetrics = calculateYtMetrics(
        asset.maturity,
        asset.impliedYield,
        asset.rangeLower,
        asset.rangeUpper,
        lastUpdated
      );
      
      Object.assign(asset, ytMetrics);
      
      console.log(`  ✅ ${asset.asset}: Range ${detailData.rangeLower}-${detailData.rangeUpper}%, YT Current ${ytMetrics.ytPriceCurrent}`);
    } else {
      // Failed after retries - use old Gist data or calculate
      console.warn(`  ⚠️ Failed to fetch ${asset.asset}, using fallback data`);
      
      const oldAsset = existingGistData[asset.asset];
      if (oldAsset) {
        asset.rangeLower = oldAsset.rangeLower;
        asset.rangeUpper = oldAsset.rangeUpper;
        asset.maturity = oldAsset.maturity;
        
        // Recalculate YT metrics with old data
        const ytMetrics = calculateYtMetrics(
          asset.maturity,
          asset.impliedYield,
          asset.rangeLower,
          asset.rangeUpper,
          lastUpdated
        );
        
        Object.assign(asset, ytMetrics);
        
        // Recalculate maturesIn from old maturity if available
        if (oldAsset.maturity) {
          asset.maturesIn = calculateMaturesIn(oldAsset.maturity);
          console.log(`  📊 Using cached data with recalculated maturesIn: ${asset.maturesIn}`);
        } else {
          asset.maturesIn = null;
        }
      } else {
        // New asset with no old data - set all YT metrics to null
        asset.ytPriceCurrent = null;
        asset.ytPriceLower = null;
        asset.ytPriceUpper = null;
        asset.upsidePotential = null;
        asset.downsideRisk = null;
        asset.endDayMinimumPct = null;
        asset.dailyDecayRate = null;
        console.log(`  ℹ️ New asset ${asset.asset} - detail fields will be null until next run`);
      }
    }
  }
  
  console.log('✅ Phase 2 complete');
  return assets;
}

