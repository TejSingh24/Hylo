# 🚀 Quick Start - Auto Calculator

## Setup (One Time Only)

```powershell
# Install backend dependencies
cd server
npm install
cd ..
```

## Running the App

**You need TWO terminals:**

### Option 1: Using Batch Files (Easiest for Windows)

**Terminal 1:** Double-click `start-backend.bat`
**Terminal 2:** Double-click `start-frontend.bat`

### Option 2: Manual Commands

**Terminal 1: Backend Server**
```powershell
cd server
npm start
```
✅ Server running on http://localhost:3001

**Terminal 2: Frontend**
```powershell
npm run dev
```
✅ App running on http://localhost:5173

## Usage

1. Open the app in browser
2. Click "⚡ Auto" button to switch to Auto mode
3. Select asset from dropdown (HyloSOL, HYusd, etc.)
4. Click "Fetch & Calculate"
5. View results!

## Troubleshooting

**Error: "Could not connect to backend API"**
→ Make sure Terminal 1 (backend) is running

**Scraping takes long?**
→ First time takes ~10 seconds, then cached for 5 minutes
