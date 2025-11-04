# Auto Calculator Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Rate-X Website                              │
│              https://app.rate-x.io/leverage                     │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ HyloSOL Card │  │  HYusd Card  │  │  xSOL Card   │  ...    │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤         │
│  │ Asset Boost  │  │ Asset Boost  │  │ Asset Boost  │         │
│  │ RateX Boost  │  │ RateX Boost  │  │ RateX Boost  │         │
│  │ Leverage     │  │ Leverage     │  │ Leverage     │         │
│  │ APY          │  │ APY          │  │ APY          │         │
│  │ Maturity     │  │ Maturity     │  │ Maturity     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                      (Puppeteer Scrapes)
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Backend Server (Node.js)                     │
│                   http://localhost:3001                         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  scraper.js (Puppeteer)                   │  │
│  │  • Launches headless browser                              │  │
│  │  • Navigates to Rate-X                                    │  │
│  │  • Finds asset cards                                      │  │
│  │  • Extracts data from HTML                                │  │
│  │  • Returns structured JSON                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Cache (5 minutes)                       │  │
│  │  { HyloSOL: {...}, HYusd: {...}, xSOL: {...} }           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Express API Server (index.js)                │  │
│  │  • GET  /api/health                                       │  │
│  │  • GET  /api/assets      (all assets)                     │  │
│  │  • GET  /api/asset/:name (specific asset)                 │  │
│  │  • POST /api/refresh     (force refresh)                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                       (REST API / JSON)
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                 Frontend (React + TypeScript)                   │
│                  http://localhost:5173                          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              ratexApi.ts (API Service)                    │  │
│  │  • fetchAllAssets()                                       │  │
│  │  • fetchAssetData(name)                                   │  │
│  │  • refreshCache()                                         │  │
│  │  • checkHealth()                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    App.tsx (Main UI)                      │  │
│  │                                                            │  │
│  │  ┌─────────────────┐  ┌──────────────────┐               │  │
│  │  │  Manual Mode    │  │   Auto Mode      │               │  │
│  │  ├─────────────────┤  ├──────────────────┤               │  │
│  │  │ User enters:    │  │ User selects:    │               │  │
│  │  │ • Leverage      │  │ • Asset (drop.)  │               │  │
│  │  │ • APY           │  │                  │               │  │
│  │  │ • Maturity Days │  │ Clicks:          │               │  │
│  │  │                 │  │ • Fetch & Calc.  │               │  │
│  │  │ Clicks:         │  │                  │               │  │
│  │  │ • Calculate     │  │ Shows fetched:   │               │  │
│  │  │                 │  │ • Leverage       │               │  │
│  │  │                 │  │ • APY            │               │  │
│  │  │                 │  │ • Maturity       │               │  │
│  │  │                 │  │ • Boosts         │               │  │
│  │  └─────────────────┘  └──────────────────┘               │  │
│  │                            ↓                               │  │
│  │              ┌─────────────────────────┐                  │  │
│  │              │  Yield Calculation      │                  │  │
│  │              │  (Same formula for both)│                  │  │
│  │              └─────────────────────────┘                  │  │
│  │                            ↓                               │  │
│  │              ┌─────────────────────────┐                  │  │
│  │              │  Results Display        │                  │  │
│  │              │  • Gross Yield %        │                  │  │
│  │              │  • Net Yield %          │                  │  │
│  │              └─────────────────────────┘                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                     ┌──────────────┐
                     │  User sees:  │
                     │  Results!    │
                     └──────────────┘
```

## Data Flow Example

### Auto Mode Flow:

1. **User Action**: Selects "HyloSOL" and clicks "Fetch & Calculate"

2. **Frontend Request**:
   ```javascript
   fetchAssetData('HyloSOL')
   → GET http://localhost:3001/api/asset/HyloSOL
   ```

3. **Backend Processing**:
   - Checks cache (5 min expiry)
   - If expired: Launches Puppeteer
   - Scrapes Rate-X website
   - Extracts data from HyloSOL card
   - Updates cache

4. **Backend Response**:
   ```json
   {
     "success": true,
     "cached": false,
     "timestamp": 1699000000000,
     "data": {
       "asset": "HyloSOL",
       "leverage": 18.7,
       "apy": 4.2,
       "maturityDays": 14,
       "assetBoost": 15.0,
       "ratexBoost": 10.0
     }
   }
   ```

5. **Frontend Processing**:
   - Receives data
   - Displays fetched values
   - Runs calculation:
     ```
     grossYield = leverage × (compound growth) × days
     netYield = grossYield × 0.995 (0.5% fee)
     ```

6. **User Sees**:
   - Fetched data displayed
   - Gross Yield: 67.97%
   - Net Yield: 67.63%

## Technology Stack

### Backend
- **Node.js**: JavaScript runtime
- **Express**: Web framework
- **Puppeteer**: Web scraping
- **CORS**: Cross-origin requests

### Frontend
- **React 19**: UI library
- **TypeScript**: Type safety
- **Vite**: Build tool
- **Lucide React**: Icons
- **Tailwind CSS**: Styling

## Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| First scrape | 10-15s | Browser launch + navigation |
| Cached read | <100ms | Direct from memory |
| API call | <50ms | Local network |
| Calculation | <1ms | Pure JavaScript |
| Total (cached) | <1s | Very fast |
| Total (fresh) | ~12s | Acceptable |

## Reliability Features

- ✅ **Caching**: Reduces scraping frequency
- ✅ **Error Handling**: Graceful degradation
- ✅ **Timeout Protection**: 30s max wait
- ✅ **Validation**: Data integrity checks
- ✅ **Fallback**: Manual mode always works
- ✅ **User Feedback**: Loading states & errors
