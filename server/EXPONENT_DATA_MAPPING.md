# Exponent Finance Data Mapping Analysis

## 📊 RateX Data Structure (Existing)

### Phase 1: Cards Page (`/leverage`)
```javascript
{
  asset: "xSOL-2511",              // Full name
  baseAsset: "xSOL",               // Base name
  leverage: 18.7,                  // Yield Exposure
  apy: 4.2,                        // Underlying APY
  maturityDays: 14,                // Days until maturity
  assetBoost: 8,                   // Asset boost multiplier
  ratexBoost: 5,                   // RateX boost multiplier
  impliedYield: 62.115,            // Implied Yield %
  
  // Visual assets (Phase 1)
  projectBackgroundImage: "https://...",
  projectName: "Hylo",
  assetSymbolImage: "https://..."
}
```

### Phase 2: Detail Page (`/liquidity/slp?symbol=...`)
```javascript
{
  rangeLower: 10,                  // Lower yield range %
  rangeUpper: 30,                  // Upper yield range %
  maturity: "2025-11-29 00:00:00 UTC",
  maturesIn: "23d 10h"
}
```

### Calculated Metrics (Backend)
```javascript
{
  // YT Prices
  ytPriceCurrent: 0.123,
  ytPriceLower: 0.098,
  ytPriceUpper: 0.156,
  
  // Risk/Reward
  upsidePotential: 26.83,          // %
  downsideRisk: 20.33,             // %
  
  // Time Decay
  dailyDecayRate: 2.15,            // %
  endDayCurrentYield: 1.23,        // % remaining if 1 day left
  endDayLowerYield: 0.98,          // % remaining (worst case)
  
  // Yield & Points
  expectedRecoveryYield: 15.45,    // Net yield %
  expectedPointsPerDay: 80,        // Points/day ($1 deposit)
  totalExpectedPoints: 1120        // Total points
}
```

---

## 🎯 Exponent Finance Data Mapping

### Available on Farm Page (`/farm`)
From our scraper test, we can extract:

```javascript
{
  fullAssetName: "YT-xSOL-26NOV25",     // ✅ AVAILABLE
  baseAsset: "xSOL",                    // ✅ AVAILABLE (extracted)
  maturityDate: "26NOV25",              // ✅ AVAILABLE (from name)
  
  // Need to extract from HTML context:
  tvl: "$826.10K",                      // ⚠️ NEED TO IMPROVE EXTRACTION
  impliedApy: 0.00,                     // ⚠️ NEED TO IMPROVE EXTRACTION
  underlyingApy: null                   // ⚠️ NEED TO IMPROVE EXTRACTION
}
```

### Available on Detail Page (`/farm/{asset}-{date}`)
Need to scrape (similar to RateX Phase 2):

```javascript
{
  impliedApy: 62.5,                     // ❓ TO SCRAPE
  underlyingApy: 7.47,                  // ❓ TO SCRAPE
  leverage: 18.7,                       // ❓ TO SCRAPE (Effective Exposure)
  pointsMultiplier: "∞" or 1234,        // ❓ TO SCRAPE (pts/Day)
  maturityDate: "10DEC25",              // ❓ TO SCRAPE
  daysToMaturity: 15                    // ❓ TO SCRAPE
}
```

---

## 🔄 Data Mapping: RateX → Exponent

| RateX Field | Exponent Equivalent | Source | Status |
|-------------|---------------------|--------|--------|
| `asset` | `fullAssetName` | Farm page HTML | ✅ Working |
| `baseAsset` | `baseAsset` | Extracted from name | ✅ Working |
| `leverage` | `leverage` (Effective Exposure) | Detail page | ❓ Need to scrape |
| `apy` | `underlyingApy` | Farm page / Detail | ⚠️ Need extraction |
| `maturityDays` | `daysToMaturity` | Calculate from date | ✅ Can calculate |
| `assetBoost` | `pointsMultiplier` / leverage? | Detail page | ❓ Need to scrape |
| `ratexBoost` | N/A (Exponent specific) | N/A | ❌ Not applicable |
| `impliedYield` | `impliedApy` | Farm page / Detail | ⚠️ Need extraction |
| `rangeLower` | ❓ Unknown | ❓ | ❌ Need to find |
| `rangeUpper` | ❓ Unknown | ❓ | ❌ Need to find |
| `maturity` | Convert from `maturityDate` | Parse date string | ✅ Can calculate |
| `maturesIn` | Calculate from maturity | Calculated | ✅ Can calculate |
| `projectBackgroundImage` | ❓ Unknown | Farm page cards? | ❓ Need to find |
| `projectName` | Extract from asset name | Asset name | ✅ Can extract |
| `assetSymbolImage` | ❓ Unknown | Farm page cards? | ❓ Need to find |

---

## 🎨 Visual Assets Strategy

### RateX Approach:
- Extract background images from card `style` attributes
- Extract asset symbol images from `<img>` tags
- Extract project names from image filenames

### Exponent Approach:
- Need to inspect card structure on `/farm` page
- Look for background images in CSS
- Look for asset icons in HTML
- May need different selectors

---

## 📝 Required Fields for Frontend Display

Based on `AssetCard.tsx`, we MUST have:

### Critical (Card won't render properly):
1. ✅ `asset` - Display name
2. ✅ `baseAsset` - For asset icon letter fallback
3. ⚠️ `leverage` - Main metric
4. ⚠️ `impliedYield` - Main metric
5. ⚠️ `apy` - Main metric (Underlying APY)
6. ✅ `maturityDays` - For timer
7. ✅ `maturesIn` - For timer display

### Important (Enhances display):
8. ⚠️ `rangeLower` / `rangeUpper` - Yield range
9. ⚠️ `ytPriceCurrent` / `ytPriceLower` / `ytPriceUpper` - Price analysis
10. ⚠️ `upsidePotential` / `downsideRisk` - Today's analysis
11. ⚠️ `dailyDecayRate` - Decay metric
12. ⚠️ `endDayCurrentYield` / `endDayLowerYield` - Last day value
13. ⚠️ `expectedRecoveryYield` - Recovery metric
14. ⚠️ `expectedPointsPerDay` / `totalExpectedPoints` - Points

### Optional (Visual enhancements):
15. ❓ `projectBackgroundImage` - Card background
16. ❓ `assetSymbolImage` - Asset icon
17. ❓ `projectName` - Extracted from image
18. ❓ `assetBoost` / `ratexBoost` - Badges (may be different for Exponent)

---

## 🚀 Next Steps

### 1. Improve Farm Page Extraction
- Extract TVL, Implied APY, Underlying APY from card context
- Extract visual assets (background images, icons)
- Handle different card structures

### 2. Build Detail Page Scraper
- Scrape individual asset detail pages
- Extract: leverage, APY, implied yield, points multiplier
- Handle "Effective Exposure ∞" cases

### 3. Calculate Missing Fields
- Convert date strings (26NOV25 → 2025-11-26 00:00:00 UTC)
- Calculate `maturesIn` from maturity date
- Calculate `maturityDays` from current date to maturity
- Use existing `calculateYtMetrics()` function for all YT calculations

### 4. Handle Exponent-Specific Fields
- Determine equivalent of `assetBoost` / `ratexBoost`
- Points multiplier mapping
- Yield range (if available on Exponent)

### 5. Create Unified Data Structure
- Merge RateX and Exponent data
- Add `source: "ratex" | "exponent"` field
- Keep separate arrays or merge with indicator?

---

## 💡 Key Differences: RateX vs Exponent

| Feature | RateX | Exponent |
|---------|-------|----------|
| **Asset Naming** | `xSOL-2511` | `YT-xSOL-26NOV25` |
| **Date Format** | MMYY (2511 = Nov 2025) | ddMMMyy (26NOV25) |
| **Boost System** | Asset + RateX boosts | Points/Day multiplier |
| **Leverage** | Yield Exposure | Effective Exposure (can be ∞) |
| **Range** | Has yield range (10%-30%) | ❓ Unknown if available |
| **Visual Assets** | Background + Symbol images | ❓ Need to check |

---

## 🔍 Testing Strategy

1. **Test Detail Page Scraper** - Start with one known asset
2. **Test Data Calculations** - Verify YT metrics match expected values
3. **Test Visual Extraction** - Check if images are available
4. **Test Full Pipeline** - Phase 1 + Phase 2 for all assets
5. **Test Gist Update** - Merge RateX + Exponent data

