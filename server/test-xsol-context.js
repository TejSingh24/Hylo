/**
 * Test to see exactly where and how xSOL-2511 appears
 * Run with: node server/test-xsol-context.js
 */

import puppeteerCore from 'puppeteer-core';

const puppeteer = puppeteerCore;

async function testXSOLContext() {
  let browser;
  
  try {
    console.log('🔍 Finding exact context of xSOL-2511...\n');
    
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
      waitUntil: 'networkidle0',
      timeout: 60000
    });
    
    await page.waitForTimeout(3000);
    console.log('✅ Page loaded\n');
    
    const xsolContexts = await page.evaluate(() => {
      const results = [];
      const allElements = Array.from(document.querySelectorAll('*'));
      
      for (const el of allElements) {
        const text = el.textContent || '';
        if (text.includes('xSOL-2511') && text.length < 1000) {
          // Go up 5 levels to get context
          let current = el;
          let contexts = [];
          
          for (let i = 0; i <= 5; i++) {
            if (!current) break;
            contexts.push({
              level: i,
              tag: current.tagName,
              className: current.className || '',
              text: (current.textContent || '').substring(0, 300),
              textLength: (current.textContent || '').length
            });
            current = current.parentElement;
          }
          
          results.push({
            element: {
              tag: el.tagName,
              className: el.className || '',
              text: text.substring(0, 200)
            },
            contexts
          });
        }
      }
      
      return results;
    });
    
    console.log(`Found ${xsolContexts.length} occurrences of xSOL-2511\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    xsolContexts.forEach((occurrence, idx) => {
      console.log(`\n📍 Occurrence ${idx + 1}:`);
      console.log(`   Element: <${occurrence.element.tag}> class="${occurrence.element.className}"`);
      console.log(`   Text: "${occurrence.element.text}"`);
      console.log('');
      console.log('   Parent hierarchy:');
      
      occurrence.contexts.forEach(ctx => {
        console.log(`   Level ${ctx.level}: <${ctx.tag}> ${ctx.className ? `class="${ctx.className.substring(0, 50)}"` : ''}`);
        console.log(`      Text (${ctx.textLength} chars): ${ctx.text}`);
      });
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });
    
    await browser.close();
    
    console.log('\n✅ Context analysis complete!\n');
    
    return xsolContexts;
    
  } catch (error) {
    console.error('❌ Error:', error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

// Run the test
testXSOLContext()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
