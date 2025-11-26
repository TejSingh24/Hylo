import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { chmod } from 'fs/promises';

const puppeteer = puppeteerCore;

/**
 * Parse Exponent date format (ddMMMyy) to UTC timestamp
 * @param {string} dateStr - Date string like "10DEC25" or "26NOV25"
 * @returns {string|null} - UTC timestamp like "2025-12-10 00:00:00 UTC"
 */
function parseExponentDate(dateStr) {
  if (!dateStr || dateStr.length < 7) return null;
  
  try {
    const dayStr = dateStr.substring(0, 2);
    const monthStr = dateStr.substring(2, 5).toUpperCase();
    const yearStr = dateStr.substring(5, 7);
    
    const monthMap = {
      'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
      'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
      'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
    };
    
    const month = monthMap[monthStr];
    if (!month) return null;
    
    const year = `20${yearStr}`;
    return `${year}-${month}-${dayStr} 00:00:00 UTC`;
  } catch (error) {
    console.warn('Error parsing Exponent date:', error.message);
    return null;
  }
}

/**
 * Extract maturity date from asset name and calculate days until maturity
 * @param {string} fullAssetName - Full asset name (e.g., "YT-eUSX-11MAR26")
 * @returns {Object} - { maturity: "2026-03-11 00:00:00 UTC", maturityDays: 106 }
 */
function extractMaturityFromAssetName(fullAssetName) {
  try {
    // Extract date from asset name: "YT-eUSX-11MAR26" → "11MAR26"
    const parts = fullAssetName.split('-');
    const dateStr = parts[parts.length - 1]; // Last part is the date
    
    // Parse the date string
    const maturity = parseExponentDate(dateStr);
    if (!maturity) {
      return { maturity: null, maturityDays: null };
    }
    
    // Calculate days until maturity
    const maturityDate = new Date(maturity);
    const now = new Date();
    const diffMs = maturityDate - now;
    const maturityDays = diffMs > 0 ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) : 0;
    
    return { maturity, maturityDays };
  } catch (error) {
    console.warn('Error extracting maturity from asset name:', error.message);
    return { maturity: null, maturityDays: null };
  }
}

/**
 * Calculate days until maturity from date string
 * @param {string} maturityUTC - UTC timestamp
 * @returns {number|null} - Days until maturity
 */
function calculateMaturityDays(maturityUTC) {
  if (!maturityUTC) return null;
  
  try {
    const maturityDate = new Date(maturityUTC);
    const now = new Date();
    const diffMs = maturityDate - now;
    
    if (diffMs <= 0) return 0;
    
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return days;
  } catch (error) {
    console.warn('Error calculating maturity days:', error.message);
    return null;
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
 * Scrape all YT assets from Exponent Finance farm page (Phase 1 - Production)
 * @returns {Promise<Array>} Array of asset data with source: "exponent"
 */
export async function scrapeAllExponentAssets() {
  let browser;
  
  try {
    console.log('🚀 Starting Exponent Phase 1 scraper (PRODUCTION)...');
    
    // Get executable path and ensure it has proper permissions
    const executablePath = await chromium.executablePath();
    
    try {
      await chmod(executablePath, 0o755);
    } catch (chmodError) {
      console.warn('Could not chmod chromium:', chmodError.message);
    }
    
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--single-process',
        '--no-zygote',
        '--disable-blink-features=AutomationControlled', // Hide automation
        '--disable-dev-shm-usage',
        '--no-sandbox'
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
    
    const page = await browser.newPage();
    
    // Set realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Hide webdriver property
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    
    console.log('📡 Navigating to Exponent Finance farm page...');
    await page.goto('https://www.exponent.finance/farm', {
      waitUntil: 'domcontentloaded',
      timeout: 90000 // 90 seconds for cold starts
    });
    
    // Wait for content to load
    console.log('⏳ Waiting for content to load...');
    await page.waitForTimeout(3000);
    
    // Take initial screenshot
    console.log('📸 Taking screenshot at t=0s...');
    await page.screenshot({ path: `/tmp/exponent-00s-initial-${Date.now()}.png`, fullPage: true });
    
    // Scroll to load all cards with mouse movement
    console.log('📜 Scrolling to load all cards with mouse interactions...');
    for (let i = 0; i < 3; i++) {
      // Move mouse to simulate real user
      await page.mouse.move(100 + i * 50, 200 + i * 100);
      await page.evaluate(() => {
        window.scrollBy(0, 1500);
      });
      await page.waitForTimeout(1000);
    }
    
    // Take screenshot after scrolling
    console.log('📸 Taking screenshot after scrolling...');
    await page.screenshot({ path: `/tmp/exponent-10s-scrolled-${Date.now()}.png`, fullPage: true });
    
    // Wait for skeleton loaders to disappear (Implied APY loads dynamically)
    console.log('⏳ Waiting for skeleton loaders to disappear...');
    try {
      await page.waitForFunction(
        () => {
          const skeletons = document.querySelectorAll('.skeleton-gray');
          return skeletons.length === 0;
        },
        { timeout: 10000 }
      );
      console.log('✅ Skeleton loaders gone!');
    } catch (e) {
      console.warn('⚠️  Timeout waiting for skeleton loaders, proceeding anyway...');
    }
    
    // Take screenshot after skeleton removal
    console.log('📸 Taking screenshot after skeleton removal...');
    await page.screenshot({ path: `/tmp/exponent-20s-no-skeletons-${Date.now()}.png`, fullPage: true });
    
    // Wait and take screenshots every 30 seconds to track value loading
    console.log('⏳ Waiting and monitoring for values to appear...');
    for (let i = 1; i <= 3; i++) {
      const waitTime = 30000; // 30 seconds
      console.log(`   Waiting ${waitTime/1000}s (check ${i}/3)...`);
      await page.waitForTimeout(waitTime);
      
      // Check current state
      const impliedApyCount = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        const matches = bodyText.match(/Implied\s+APY\s+([\d.]+)%/gi) || [];
        return matches.filter(m => {
          const val = parseFloat(m.match(/([\d.]+)%/)?.[1] || '0');
          return val > 0;
        }).length;
      });
      
      const leverageCount = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        const matches = bodyText.match(/Effective\s+Exposure[\s\S]{0,20}([\d.]+)x/gi) || [];
        return matches.length;
      });
      
      console.log(`   [t=${20 + i*30}s] Non-zero Implied APY: ${impliedApyCount}, Numeric Leverage: ${leverageCount}`);
      
      // Take screenshot
      await page.screenshot({ path: `/tmp/exponent-${20 + i*30}s-check${i}-${Date.now()}.png`, fullPage: true });
      
      // If we have enough data, break early
      if (impliedApyCount >= 5 && leverageCount >= 5) {
        console.log('   ✅ Sufficient data detected, proceeding to extraction!');
        break;
      }
    }
    
    console.log('🔍 Extracting asset data...');
    
    // Extract all asset data
    const assets = await page.evaluate(() => {
      const results = [];
      const processedAssets = new Set();
      
      const allElements = Array.from(document.querySelectorAll('*'));
      
      for (const element of allElements) {
        const text = element.textContent || '';
        
        // Match pattern: YT-{asset}-{ddMMMyy}
        const assetMatch = text.match(/YT-([A-Za-z0-9*+\-]+)-(\d{2}[A-Z]{3}\d{2})/);
        
        if (assetMatch) {
          const fullAssetName = assetMatch[0];
          const baseAsset = assetMatch[1];
          const dateStr = assetMatch[2];
          
          if (processedAssets.has(fullAssetName)) continue;
          
          // Find parent card containing all data
          let current = element;
          let bestCard = null;
          let smallestLevel = 999;
          
          for (let i = 0; i < 15; i++) {
            if (!current.parentElement) break;
            current = current.parentElement;
            
            const cardText = current.textContent;
            
            const hasEffectiveExposure = cardText.includes('Effective Exposure') || cardText.includes('Yield Exposure');
            const hasUnderlyingAPY = cardText.includes('Underlying APY');
            const hasImpliedAPY = cardText.includes('Implied APY') || cardText.includes('Implied Yield');
            const hasAssetName = cardText.includes(fullAssetName);
            
            const assetPatterns = cardText.match(/YT-[A-Za-z0-9*+\-]+-\d{2}[A-Z]{3}\d{2}/g);
            const isIndividualCard = assetPatterns && assetPatterns.length === 1;
            
            if (hasEffectiveExposure && hasUnderlyingAPY && hasImpliedAPY && hasAssetName && isIndividualCard) {
              if (i < smallestLevel) {
                bestCard = current;
                smallestLevel = i;
              }
            }
          }
          
          if (bestCard) {
            const cardText = bestCard.textContent;
            
            const result = {
              asset: fullAssetName,
              baseAsset: baseAsset,
              dateStr: dateStr,
              leverage: null,
              apy: null,
              impliedYield: null,
              pointsPerDay: null,
              source: 'exponent'
            };
            
            // Extract Leverage (Effective Exposure)
            const leverageMatch = cardText.match(/Effective\s+Exposure[^\d∞]*([\d.]+|∞)\s*x/i);
            if (leverageMatch) {
              const leverageStr = leverageMatch[1];
              if (leverageStr === '∞') {
                console.warn(`  ⚠️  ${fullAssetName}: Leverage still showing ∞x (data not loaded)`);
                result.leverage = null;
              } else {
                result.leverage = parseFloat(leverageStr);
              }
            }
            
            // Extract Underlying APY
            const apyMatch = cardText.match(/Underlying\s+APY\s*([\d.]+)\s*%/i);
            if (apyMatch) {
              result.apy = parseFloat(apyMatch[1]);
            }
            
            // Extract Implied APY
            const impliedMatch = cardText.match(/Implied\s+APY\s*([\d.]+)\s*%/i);
            if (impliedMatch) {
              result.impliedYield = parseFloat(impliedMatch[1]);
            }
            
            // Extract Points Per Day (may not be on farm page cards)
            const pointsMatch = cardText.match(/([\d.]+|∞)\s*pts[\s/]*Day/i);
            if (pointsMatch) {
              const pointsStr = pointsMatch[1];
              result.pointsPerDay = pointsStr === '∞' ? null : parseFloat(pointsStr);
            }
            
            // Only add if we got essential data
            if (result.leverage !== null || result.apy !== null) {
              results.push(result);
              processedAssets.add(fullAssetName);
            }
          }
        }
      }
      
      return results;
    });
    
    console.log(`✅ Found ${assets.length} Exponent assets`);
    
    // Process dates and set field mappings
    for (const asset of assets) {
      // Extract maturity from asset name (will be overridden by OLD gist data in scrape-once.js)
      const { maturity, maturityDays } = extractMaturityFromAssetName(asset.asset);
      asset.maturity = maturity;
      asset.maturityDays = maturityDays;
      asset.maturesIn = maturity ? calculateMaturesIn(maturity) : null;
      
      // Set field mappings (APY validation happens externally)
      asset.rangeLower = asset.apy; // Will be overridden by external validation if match found
      asset.rangeUpper = null; // Exponent doesn't have upper range (Phase 1)
      asset.assetBoost = null; // Will be filled from OLD gist or RateX match or Phase 2
      asset.ratexBoost = null; // Exponent doesn't have RateX boost
      
      // Phase 2 fields - not available yet
      asset.ytPriceCurrent = null;
      asset.ytPriceLower = null;
      asset.ytPriceUpper = null;
      asset.upsidePotential = null;
      asset.downsideRisk = null;
      asset.endDayCurrentYield = null;
      asset.endDayLowerYield = null;
      asset.dailyDecayRate = null;
      asset.expectedRecoveryYield = null;
      asset.expectedPointsPerDay = null;
      asset.totalExpectedPoints = null;
      
      // Visual assets - not available on farm page (Phase 1)
      asset.projectBackgroundImage = null;
      asset.projectName = null;
      asset.assetSymbolImage = null;
    }
    
    await browser.close();
    
    console.log('🎉 Exponent Phase 1 scraping complete!');
    return assets;
    
  } catch (error) {
    console.error('❌ Error scraping Exponent:', error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}
