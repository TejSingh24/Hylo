# Phase 1 Enhancements - YT Metrics Calculation

## Overview
Enhanced Phase 1 to calculate YT metrics immediately without waiting for Phase 2, providing complete data to the frontend from the start.

## Changes Implemented

### 1. Visual Asset Copying
**Priority Chain**: RateX match → Old Gist → null

For each Exponent asset, copy visual assets from matching RateX asset:
- `projectBackgroundImage`
- `projectName`
- `assetSymbolImage`

If no RateX match exists, fallback to old Gist data. If neither exists, keep null (Phase 2 will fill).

### 2. Range Lower Calculation
Set `rangeLower = apy` (Underlying APY) for all Exponent assets.

This establishes the lower bound for YT price calculations in Phase 1.

### 3. YT Metrics Calculation in Phase 1
Calculate all YT metrics immediately using available Phase 1 data:

**Parameters:**
- `maturity`: From asset name or old Gist
- `impliedYield`: From Exponent scraper
- `rangeLower`: Set to apy (above)
- `rangeUpper`: **null** (not available until Phase 2)
- `leverage`: From Exponent scraper
- `apy`: Validated from RateX or Exponent
- `maturityDays`: From maturity date calculation
- `assetBoost`: From old Gist or RateX
- `source`: 'exponent'

**Calculated Metrics:**
- ✅ `ytPriceCurrent`: Current YT token price
- ✅ `ytPriceLower`: YT price at lower bound (worst case)
- ❌ `ytPriceUpper`: **null** (requires rangeUpper from Phase 2)
- ❌ `upsidePotential`: **null** (requires rangeUpper from Phase 2)
- ✅ `downsideRisk`: Downside from current to lower bound
- ✅ `endDayCurrentYield`: Remaining yield at maturity with current yield
- ✅ `endDayLowerYield`: Remaining yield at maturity with lower yield
- ✅ `dailyDecayRate`: Daily time decay percentage
- ✅ `expectedRecoveryYield`: Net yield percentage after fees
- ✅ `expectedPointsPerDay`: Points earned per day (with $1 deposit)
- ✅ `totalExpectedPoints`: Total points at maturity (with $1 deposit)

### 4. Merge Logic Update
**For RateX assets:**
- Calculate YT metrics using old Gist ranges (if available)
- Existing behavior preserved

**For Exponent assets:**
- Use pre-calculated Phase 1 metrics from validation section
- Avoid recalculation in merge (performance optimization)

## Benefits

1. **Immediate Data Availability**: Frontend always has complete data, no empty state
2. **No Waiting for Phase 2**: Users see metrics immediately after Phase 1
3. **Progressive Enhancement**: Phase 2 still runs to refine with chart data (rangeUpper)
4. **Graceful Degradation**: Metrics dependent on rangeUpper remain null until Phase 2

## Phase 2 Refinement

Phase 2 will still scrape detail pages to:
- Extract `rangeUpper` from yield range chart
- Refine `rangeLower` if chart shows better data
- Fill missing visual assets
- Calculate `ytPriceUpper` and `upsidePotential`

## Validation Flow

```
Phase 1 Validation Section (lines 95-201):
├── APY validation (RateX → Exponent)
├── assetBoost validation (Old Gist → RateX → null)
├── Visual assets (RateX → Old Gist → null)
├── Maturity (Old Gist → Asset name calculation)
├── rangeLower = apy
└── YT metrics calculation (with rangeUpper=null)

Merge Section (lines 205-285):
├── RateX: Calculate YT metrics with old ranges
└── Exponent: Use pre-calculated Phase 1 metrics
```

## Testing

**Local Testing**: Cannot test locally (requires Chromium in GitHub Actions)

**Production Testing**: Deploy to GitHub Actions and verify:
1. Visual assets copied from RateX
2. rangeLower set to apy for all Exponent assets
3. YT metrics calculated in Phase 1 logs
4. Frontend displays complete data immediately
5. Phase 2 refines rangeUpper and upsidePotential later

## Expected Log Output

```
🔄 Applying APY, assetBoost, visual assets, and YT metrics validation...
  ✓ YT-hyloSOL-10DEC25: Overriding APY 10.5% → 11.2%
  ✓ YT-hyloSOL-10DEC25: Using RateX assetBoost 2.5x
  ✓ YT-hyloSOL-10DEC25: Copied visual assets from RateX (Hylo)
  ✓ YT-hyloSOL-10DEC25: Calculated Phase 1 YT metrics (ytPriceCurrent=0.0234, downsideRisk=12.5%)

✅ APY validation: 4/4 assets updated
✅ assetBoost validation: 4/4 assets updated
✅ Visual assets: 4/4 assets updated
✅ rangeLower set: 4/4 assets
✅ YT metrics calculated: 4/4 assets
```

## Code Location

**File**: `c:\Work\Hylo\server\scrape-once.js`
- **Lines 95-201**: Enhanced validation section
- **Lines 205-285**: Updated merge section with pre-calculated metric handling

## Next Steps

1. Deploy to GitHub Actions
2. Monitor Phase 1 execution logs
3. Verify Gist updated with complete data
4. Check frontend displays all metrics
5. Re-enable Phase 2 to refine rangeUpper
