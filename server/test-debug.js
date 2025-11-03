import puppeteer from 'puppeteer';

async function debugScraper() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  console.log('Loading Rate-X...');
  await page.goto('https://app.rate-x.io/leverage', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });
  
  await page.waitForTimeout(5000);
  
  // Scroll
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollBy(0, 1500));
    await page.waitForTimeout(1500);
  }
  
  console.log('\n=== DEBUGGING: Looking for hyloSOL+-2511 ===\n');
  
  // Find all elements matching our pattern
  const matches = await page.evaluate(() => {
    const targetAsset = 'hyloSOL+';
    const assetPattern = new RegExp(`^${targetAsset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d{4}$`, 'i');
    
    const allElements = Array.from(document.querySelectorAll('*'));
    const foundMatches = [];
    
    for (const element of allElements) {
      const text = element.textContent || '';
      const trimmedText = text.trim();
      
      if (assetPattern.test(trimmedText)) {
        // Try to find parent card
        let cardFound = false;
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
            foundMatches.push({
              matchedText: trimmedText,
              cardLevel: i,
              cardText: textContent.substring(0, 400),
              hasAllFields: true
            });
            cardFound = true;
            break;
          }
        }
        
        if (!cardFound) {
          foundMatches.push({
            matchedText: trimmedText,
            cardLevel: -1,
            cardText: 'No complete card found',
            hasAllFields: false
          });
        }
      }
    }
    
    return foundMatches;
  });
  
  console.log(`Found ${matches.length} exact matches:`);
  matches.forEach((m, i) => {
    console.log(`\nMatch ${i + 1}:`);
    console.log(`  Matched text: "${m.matchedText}"`);
    console.log(`  Card level: ${m.cardLevel}`);
    console.log(`  Has all fields: ${m.hasAllFields}`);
    console.log(`  Card text: "${m.cardText}"`);
  });
  
  await browser.close();
}

debugScraper().catch(console.error);
