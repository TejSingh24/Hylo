# Hylo Auto Calculator

## 🚀 How to Run Locally (VS Code)

### Step 1: Open TWO Terminals in VS Code

Press `Ctrl + Shift + `` (backtick) to open terminal, then click the `+` icon to open a second terminal.

---

### Step 2: Terminal 1 - Start Backend

In the **first terminal**, copy and paste this command:

```powershell
Set-Location c:\Work\Hylo\server; node index.js
```

You should see:
```
🚀 Rate-X Scraper API running on http://localhost:3001
📊 Available endpoints:
   GET  /api/health
   GET  /api/assets
   GET  /api/asset/:assetName
   POST /api/refresh
```

**IMPORTANT:** 
- Don't open `http://localhost:3001` in your browser - you'll see "Cannot GET /"
- This is NORMAL! The backend is an API server, not a website
- The frontend (port 5173) will connect to it automatically

**Note:** When you fetch data, you'll see additional logs like:
```
Starting scraper for asset: HyloSOL
Navigating to Rate-X leverage page...
Looking for HyloSOL card...
Page content preview: ...
Found asset card!
Scraped data: { asset: 'HyloSOL', leverage: X, apy: Y, ... }
```

✅ **Keep this terminal running!**

---

### Step 3: Terminal 2 - Start Frontend

In the **second terminal**, run:

```powershell
npm run dev
```

You should see:
```
VITE v7.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

✅ **Keep this terminal running too!**

---

### Step 4: Open Your Browser

Go to: **http://localhost:5173**

---

## 🎮 Using the Auto Calculator

1. Click the **"⚡ Auto"** button (toggle at top of calculator)
2. Select an asset from dropdown (HyloSOL, HYusd, sHYUSD, xSOL)
3. Click **"Fetch & Calculate"**
4. Wait 10-15 seconds (first time - Puppeteer launches browser)
5. See your results!

---

## 🛑 To Stop

Press `Ctrl + C` in each terminal window.

---

## ⚠️ Troubleshooting

**"Could not connect to backend API"**
- Make sure Terminal 1 (backend) is still running
- Check you see "Rate-X Scraper API running" message

**"Asset not found" or scraping errors**
- Check the backend terminal for detailed logs
- The scraper will show what it finds on the page
- First scrape takes 15-20 seconds (browser launch + page load)
- Rate-X website structure may have changed

**First fetch takes 10-15 seconds**
- This is normal! Puppeteer is launching a headless browser
- Subsequent fetches are cached and much faster (<1 second)

**Browser Console Warnings (These are NORMAL - can be ignored):**
- ✅ **CSS compatibility warnings** (`-webkit-text-size-adjust`, etc.)
  - These are from dependencies and don't affect functionality
  - Safe to ignore in development
  
- ✅ **"viewport meta element" warning**
  - Already fixed in the code
  - May still show due to browser caching
  - Refresh the page (Ctrl+F5) to clear
  
- ✅ **"Content Security Policy" warnings**
  - Normal for local development
  - These are security warnings from Vite's dev server
  - Will be resolved in production build
  
- ✅ **CORS or localhost warnings**
  - Expected when frontend (5173) calls backend (3001)
  - CORS is enabled in backend for local dev
  - Works fine despite the warning

**"Cannot GET /" on localhost:3001:**
- ✅ **This is CORRECT and EXPECTED!**
- The backend (port 3001) is an **API server**, not a website
- It only responds to `/api/*` endpoints (like `/api/health`, `/api/asset/HyloSOL`)
- You should NEVER open `localhost:3001` in your browser
- Instead, open `localhost:5173` (the frontend)
- The frontend automatically connects to the backend

**All these warnings are normal for development and don't break functionality!**

---

## 📁 Project Structure

```
Hylo/
├── server/              # Backend API
│   ├── index.js        # Express server ← RUN THIS FIRST
│   ├── scraper.js      # Puppeteer scraper
│   └── package.json    # Backend dependencies
├── src/                # Frontend React app
│   ├── App.tsx         # Main calculator component
│   └── services/
│       └── ratexApi.ts # API client
└── package.json        # Frontend dependencies ← RUN npm run dev
```

---

## 🔄 Quick Commands Reference

| Action | Command | Terminal |
|--------|---------|----------|
| Start Backend | `cd server` then `node index.js` | Terminal 1 |
| Start Frontend | `npm run dev` | Terminal 2 |
| Stop Servers | `Ctrl + C` | Both terminals |

---

That's it! Simple and clean. 🎉