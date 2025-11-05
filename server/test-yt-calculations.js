// Test YT calculations
// Mock the utility functions from scraper.js

function formatYtPrice(value) {
  if (value === null || value === undefined) return null;
  
  if (value >= 0.01) return parseFloat(value.toFixed(5));
  if (value >= 0.001) return parseFloat(value.toFixed(6));
  if (value >= 0.0001) return parseFloat(value.toFixed(7));
  return parseFloat(value.toFixed(8));
}

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
    
    if (diffMs <= 0) return 0;
    
    const T = diffMs / (365 * 24 * 60 * 60 * 1000);
    const r = yieldRate / 100;
    const ytPrice = 1 - Math.pow(1 + r, -T);
    
    return formatYtPrice(ytPrice);
  } catch (error) {
    console.warn(`Error calculating YT price:`, error.message);
    return null;
  }
}

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
    
    const currentT = diffMs / (365 * 24 * 60 * 60 * 1000);
    
    result.ytPriceCurrent = calculateYtPrice(maturity, impliedYield, lastUpdated);
    result.ytPriceLower = calculateYtPrice(maturity, rangeLower, lastUpdated);
    result.ytPriceUpper = calculateYtPrice(maturity, rangeUpper, lastUpdated);
    
    if (result.ytPriceCurrent && result.ytPriceUpper) {
      const upside = ((result.ytPriceUpper - result.ytPriceCurrent) / result.ytPriceCurrent) * 100;
      result.upsidePotential = formatPercentage(upside);
    }
    
    if (result.ytPriceCurrent && result.ytPriceLower) {
      const downside = ((result.ytPriceCurrent - result.ytPriceLower) / result.ytPriceCurrent) * 100;
      result.downsideRisk = formatPercentage(downside);
    }
    
    if (currentT <= 1/365) {
      result.dailyDecayRate = 100;
      result.endDayMinimumPct = 0;
      return result;
    }
    
    if (impliedYield !== null && impliedYield !== undefined) {
      const tomorrowT = currentT - (1/365);
      const r = impliedYield / 100;
      const ytToday = 1 - Math.pow(1 + r, -currentT);
      const ytTomorrow = 1 - Math.pow(1 + r, -tomorrowT);
      const decay = ((ytToday - ytTomorrow) / ytToday) * 100;
      result.dailyDecayRate = formatPercentage(decay);
    }
    
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

// Test cases
console.log('🧪 Testing YT Calculations...\n');

// Test 1: Normal case (23 days to maturity)
console.log('Test 1: Normal case (23 days to maturity)');
const test1 = calculateYtMetrics(
  '2025-11-28 00:00:00 UTC',  // 23 days from now
  62.115,                      // impliedYield
  10,                          // rangeLower
  90,                          // rangeUpper
  '2025-11-05 00:00:00 UTC'   // lastUpdated (today)
);
console.log('Results:', JSON.stringify(test1, null, 2));
console.log('');

// Test 2: Edge case (1 day to maturity)
console.log('Test 2: Edge case (1 day to maturity)');
const test2 = calculateYtMetrics(
  '2025-11-06 00:00:00 UTC',  // 1 day from now
  62.115,
  10,
  90,
  '2025-11-05 00:00:00 UTC'
);
console.log('Results:', JSON.stringify(test2, null, 2));
console.log('dailyDecayRate should be 100:', test2.dailyDecayRate === 100);
console.log('endDayMinimumPct should be 0:', test2.endDayMinimumPct === 0);
console.log('');

// Test 3: Maturity passed
console.log('Test 3: Maturity passed');
const test3 = calculateYtMetrics(
  '2025-11-01 00:00:00 UTC',  // 4 days ago
  62.115,
  10,
  90,
  '2025-11-05 00:00:00 UTC'
);
console.log('Results:', JSON.stringify(test3, null, 2));
console.log('All values should be 0:', JSON.stringify(test3) === JSON.stringify({
  ytPriceCurrent: 0,
  ytPriceLower: 0,
  ytPriceUpper: 0,
  upsidePotential: 0,
  downsideRisk: 0,
  endDayMinimumPct: 0,
  dailyDecayRate: 0
}));
console.log('');

// Test 4: Small percentage values (testing adaptive formatting)
console.log('Test 4: Percentage formatting');
console.log('12.345% →', formatPercentage(12.345), '(should be 12.35)');
console.log('1.54% →', formatPercentage(1.54), '(should be 1.54)');
console.log('0.543% →', formatPercentage(0.543), '(should be 0.54)');
console.log('0.054% →', formatPercentage(0.054), '(should be 0.054)');
console.log('0.0052% →', formatPercentage(0.0052), '(should be 0.0052)');
console.log('');

// Test 5: YT price formatting
console.log('Test 5: YT Price formatting');
console.log('0.15000 →', formatYtPrice(0.15000), '(should be 0.15)');
console.log('0.007270 →', formatYtPrice(0.007270), '(should be 0.00727)');
console.log('0.0001234 →', formatYtPrice(0.0001234), '(should be 0.0001234)');
console.log('');

console.log('✅ All tests complete!');
