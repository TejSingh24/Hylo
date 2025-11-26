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
    
    // ========== Network Request Interception Setup ==========
    console.log('🌐 Setting up network request monitoring...');
    const solanaResponses = [];
    const apiResponses = [];
    
    // Monitor all network requests
    page.on('request', request => {
      const url = request.url();
      if (url.includes('solana') || url.includes('rpc') || url.includes('mainnet')) {
        console.log(`  📤 RPC Request: ${request.method()} ${url.substring(0, 80)}...`);
      }
    });
    
    // Capture Solana RPC responses
    page.on('response', async response => {
      try {
        const url = response.url();
        
        // Check for Solana RPC calls
        if (url.includes('solana') || url.includes('rpc') || url.includes('mainnet-beta')) {
          console.log(`  📥 RPC Response: ${response.status()} ${url.substring(0, 80)}...`);
          
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('json')) {
            try {
              const data = await response.json();
              solanaResponses.push({
                url: url,
                status: response.status(),
                data: data,
                timestamp: new Date().toISOString()
              });
              console.log(`     ✅ Captured RPC response (${JSON.stringify(data).length} bytes)`);
            } catch (jsonError) {
              console.log(`     ⚠️  Could not parse RPC JSON: ${jsonError.message}`);
            }
          }
        }
        
        // Check for Exponent API calls
        if (url.includes('api.exponent') || url.includes('exponent.finance/api')) {
          console.log(`  📥 API Response: ${response.status()} ${url}`);
          
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('json')) {
            try {
              const data = await response.json();
              apiResponses.push({
                url: url,
                status: response.status(),
                data: data,
                timestamp: new Date().toISOString()
              });
              console.log(`     ✅ Captured API response`);
            } catch (jsonError) {
              console.log(`     ⚠️  Could not parse API JSON: ${jsonError.message}`);
            }
          }
        }
      } catch (error) {
        // Ignore response parsing errors
      }
    });
    
    console.log('📡 Navigating to Exponent Finance farm page...');
    await page.goto('https://www.exponent.finance/farm', {
      waitUntil: 'networkidle0', // Wait until no network activity for 500ms
      timeout: 90000 // 90 seconds for cold starts
    });
    
    // Wait for initial page load
    console.log('⏳ Waiting for initial content...');
    await page.waitForTimeout(3000);
    
    // Take initial screenshot
    console.log('📸 Taking screenshot at t=0s (initial load)...');
    await page.screenshot({ path: `/tmp/exponent-00s-initial-${Date.now()}.png`, fullPage: true });
    
    // ========== Extract __NEXT_DATA__ (Next.js server data) ==========
    console.log('🔍 Checking for __NEXT_DATA__ (Next.js pre-rendered data)...');
    const nextData = await page.evaluate(() => {
      const script = document.getElementById('__NEXT_DATA__');
      if (script) {
        try {
          return JSON.parse(script.textContent);
        } catch (e) {
          return { error: 'Failed to parse __NEXT_DATA__', message: e.message };
        }
      }
      return null;
    });
    
    if (nextData) {
      console.log('  ✅ Found __NEXT_DATA__');
      console.log(`     Keys: ${Object.keys(nextData).join(', ')}`);
      if (nextData.props?.pageProps) {
        console.log(`     pageProps keys: ${Object.keys(nextData.props.pageProps).join(', ')}`);
        // Log a snippet of the data
        const pagePropsStr = JSON.stringify(nextData.props.pageProps);
        console.log(`     pageProps size: ${pagePropsStr.length} bytes`);
        if (pagePropsStr.includes('impliedYield') || pagePropsStr.includes('impliedAPY')) {
          console.log('     🎯 Contains implied yield data!');
        }
        if (pagePropsStr.includes('leverage') || pagePropsStr.includes('exposure')) {
          console.log('     🎯 Contains leverage/exposure data!');
        }
      }
    } else {
      console.log('  ⚠️  No __NEXT_DATA__ found (not a Next.js app or CSR only)');
    }
    
    // Interact with the page to trigger calculations - click on first card
    console.log('🖱️  Interacting with page (clicking on first card to trigger calculations)...');
    try {
      // Move mouse around the page area where cards are displayed
      await page.mouse.move(200, 300);
      await page.waitForTimeout(500);
      
      // Click on the farm area to ensure focus
      await page.mouse.click(200, 300);
      await page.waitForTimeout(1000);
      
      console.log('  ✅ Page interaction completed');
    } catch (e) {
      console.log('  ❌ Page interaction failed:', e.message);
    }
    
    // Take screenshot after interaction
    console.log('📸 Taking screenshot at t=5s (after page interaction)...');
    await page.screenshot({ path: `/tmp/exponent-05s-after-interaction-${Date.now()}.png`, fullPage: true });
    
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
    console.log('📸 Taking screenshot at t=10s (after scrolling)...');
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
    console.log('📸 Taking screenshot at t=20s (after skeleton removal)...');
    await page.screenshot({ path: `/tmp/exponent-20s-no-skeletons-${Date.now()}.png`, fullPage: true });
    
    // Click the "Farm" button for additional interaction
    console.log('🖱️  Clicking "Farm" button at t=20s for interaction...');
    try {
      // Method 1: Try XPath to find button/div/a with "Farm" text
      const farmElements = await page.$x("//button[contains(text(), 'Farm')] | //div[contains(text(), 'Farm')] | //a[contains(text(), 'Farm')]");
      
      if (farmElements.length > 0) {
        console.log(`  🔍 Found ${farmElements.length} element(s) with "Farm" text using XPath`);
        
        // Move mouse to the button for realistic interaction
        const box = await farmElements[0].boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.waitForTimeout(200);
        }
        
        // Click the Farm button
        await farmElements[0].click();
        console.log('  ✅ Clicked Farm button using XPath');
      } else {
        // Method 2: Try finding by visible text using evaluate
        console.log('  ⚠️  No XPath match, trying alternative method...');
        
        const clicked = await page.evaluate(() => {
          // Find all clickable elements
          const elements = Array.from(document.querySelectorAll('button, div, span, a, [role="button"], [role="tab"]'));
          const farmElement = elements.find(el => {
            const text = el.textContent || '';
            return text.trim().toLowerCase() === 'farm';
          });
          if (farmElement) {
            // Try multiple click methods
            farmElement.click();
            farmElement.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            return true;
          }
          return false;
        });
        console.log(`  ${clicked ? '✅' : '❌'} Alternative click method ${clicked ? 'succeeded' : 'failed'}`);
      }
      
      // Wait for Farm button click to take effect
      await page.waitForTimeout(2000);
      
      // Take screenshot after Farm button click
      console.log('📸 Taking screenshot at t=22s (after Farm button click)...');
      await page.screenshot({ path: `/tmp/exponent-22s-after-farm-click-${Date.now()}.png`, fullPage: true });
      
    } catch (e) {
      console.log('  ❌ Farm button click failed:', e.message);
    }
    
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
    
    // ========== Network Request Summary ==========
    console.log('\n📊 Network Request Summary:');
    console.log(`   Solana RPC responses captured: ${solanaResponses.length}`);
    console.log(`   Exponent API responses captured: ${apiResponses.length}`);
    
    if (solanaResponses.length > 0) {
      console.log('\n   🔍 Solana RPC Responses:');
      solanaResponses.forEach((resp, idx) => {
        console.log(`     ${idx + 1}. ${resp.url.substring(0, 60)}... (${resp.status})`);
        // Check if response contains relevant data
        const dataStr = JSON.stringify(resp.data);
        if (dataStr.includes('result')) {
          console.log(`        Contains result field`);
        }
      });
    }
    
    if (apiResponses.length > 0) {
      console.log('\n   🔍 Exponent API Responses:');
      apiResponses.forEach((resp, idx) => {
        console.log(`     ${idx + 1}. ${resp.url} (${resp.status})`);
      });
    }
    
    // Try to extract pool data from RPC responses if available
    if (solanaResponses.length > 0) {
      console.log('\n   🎯 Analyzing RPC responses for pool data...');
      for (const resp of solanaResponses) {
        const dataStr = JSON.stringify(resp.data);
        if (dataStr.includes('reserve') || dataStr.includes('pool') || dataStr.includes('liquidity')) {
          console.log(`     Found potential pool data in: ${resp.url.substring(0, 60)}...`);
          console.log(`     Data snippet: ${dataStr.substring(0, 200)}...`);
        }
      }
    }
    
    console.log('\n🔍 Extracting asset data...');
    
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
