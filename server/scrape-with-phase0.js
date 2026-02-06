/**
 * Scraper Entry Point with Phase 0
 * 
 * This is a wrapper that runs Phase 0 (xSOL Metrics) first,
 * then calls the existing scrape-once.js for Phase 1 and Phase 2.
 * 
 * This file does NOT modify the existing scraper - it wraps it.
 */

import { fetchXSolMetricsPhase0 } from './scraper-xsol-phase0.js';
import { fetchExistingGistData } from './scraper.js';

const GIST_ID = process.env.GIST_ID;
const GIST_TOKEN = process.env.GIST_TOKEN;

if (!GIST_ID || !GIST_TOKEN) {
  console.error('❌ Missing required environment variables: GIST_ID and GIST_TOKEN');
  process.exit(1);
}

/**
 * Update Gist with data
 */
async function updateGistWithPhase0(gistId, xsolMetrics, token) {
  const filename = 'ratex-assets.json';
  
  // Fetch existing gist data first
  console.log('  📥 Fetching existing Gist data...');
  const existingData = await fetchExistingGistData();
  
  // Merge xsolMetrics into existing data
  const updatedData = {
    ...existingData.fullData,
    xsolMetrics: xsolMetrics,
    lastUpdated: new Date().toISOString(),
    phase: 0,
    phaseStatus: 'Phase 0 complete - xSOL metrics updated'
  };

  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Hylo-xSOL-Scraper'
    },
    body: JSON.stringify({
      files: {
        [filename]: {
          content: JSON.stringify(updatedData, null, 2)
        }
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update gist: ${response.status} ${error}`);
  }

  return await response.json();
}

async function runPhase0() {
  console.log('🚀 Starting Phase 0: xSOL Metrics...');
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  
  try {
    // Run Phase 0
    const xsolMetrics = await fetchXSolMetricsPhase0();
    
    if (xsolMetrics) {
      console.log('\n📤 Updating Gist with Phase 0 data...');
      await updateGistWithPhase0(GIST_ID, xsolMetrics, GIST_TOKEN);
      console.log('✅ Gist updated with xSOL metrics!');
      console.log(`   xSOL Price: $${xsolMetrics.xSOL_price.toFixed(6)}`);
      console.log(`   SOL Price: $${xsolMetrics.SOL_price.toFixed(2)}`);
      console.log(`   Effective Leverage: ${xsolMetrics.Effective_Leverage.toFixed(2)}x`);
    } else {
      console.warn('⚠️ Phase 0 failed - xSOL metrics not available');
      console.warn('   Existing Gist data will be preserved');
    }
    
    // Now run the existing scraper (Phase 1 + Phase 2)
    console.log('\n' + '='.repeat(80));
    console.log('Continuing to Phase 1 and Phase 2...');
    console.log('='.repeat(80));
    
    // Dynamic import to run the existing scraper
    await import('./scrape-once.js');
    
  } catch (error) {
    console.error('\n❌ Error in Phase 0 wrapper:', error.message);
    console.error(error);
    
    // Still try to run Phase 1 + Phase 2 even if Phase 0 fails
    console.log('\n⚠️ Attempting to continue with Phase 1 + Phase 2 despite Phase 0 failure...');
    try {
      await import('./scrape-once.js');
    } catch (importError) {
      console.error('❌ Failed to run Phase 1 + Phase 2:', importError.message);
      process.exit(1);
    }
  }
}

runPhase0();
