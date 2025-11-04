# Deployment Guide - Separate Vercel Deployments

This guide will help you deploy the frontend and backend separately on Vercel.

---

## 📋 Prerequisites

- Vercel account (sign up at https://vercel.com)
- GitHub account with this repository pushed
- Git installed locally

---

## 🚀 Step 1: Deploy Backend

### Option A: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
```bash
npm install -g vercel
```

2. **Navigate to server folder**:
```bash
cd server
```

3. **Login to Vercel**:
```bash
vercel login
```

4. **Deploy backend**:
```bash
vercel --prod
```

5. **Copy the deployment URL** (e.g., `https://hylo-backend.vercel.app`)

### Option B: Deploy via Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. **Configure Project:**
   - **Framework Preset:** Other
   - **Root Directory:** `server`
   - **Build Command:** (leave empty)
   - **Output Directory:** (leave empty)
   - **Install Command:** `npm install`
4. Click **Deploy**
5. **Copy the deployment URL** once deployed

---

## 🎨 Step 2: Deploy Frontend

### Option A: Deploy via Vercel CLI

1. **Navigate back to root folder**:
```bash
cd ..
```

2. **Deploy frontend**:
```bash
vercel --prod
```

3. **When prompted for settings:**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Development Command: `npm run dev`

### Option B: Deploy via Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your GitHub repository again (yes, same repo!)
3. **Configure Project:**
   - **Framework Preset:** Vite
   - **Root Directory:** `.` (leave as root)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
4. Click **Deploy**

---

## ⚙️ Step 3: Configure Environment Variable

### In Vercel Dashboard (Frontend Project):

1. Go to your **frontend** project on Vercel
2. Click **Settings** → **Environment Variables**
3. Add new variable:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://your-backend-url.vercel.app` (your backend URL from Step 1)
   - **Environment:** Production, Preview, Development (check all)
4. Click **Save**

### Redeploy Frontend:

After adding the environment variable, you need to redeploy:

**Option A - Via Dashboard:**
1. Go to **Deployments** tab
2. Click the three dots on the latest deployment
3. Click **Redeploy**

**Option B - Via CLI:**
```bash
vercel --prod
```

**Option C - Via Git:**
```bash
git commit --allow-empty -m "Trigger redeploy"
git push
```

---

## 🧪 Step 4: Test Your Deployment

1. Visit your **frontend URL** (e.g., `https://hylo.vercel.app`)
2. Switch to **Auto** mode
3. Click **Fetch** button
4. Wait for data to load (first request may take 20-30 seconds)
5. Select an asset and click **Calculate**

### Check Browser Console:
- Press `F12` to open Developer Tools
- Go to **Console** tab
- You should see: `API Base URL: https://your-backend-url.vercel.app`
- Check for any CORS errors

---

## ⚠️ Important Notes

### Timeout Warning:
- Vercel free tier has a **10-second timeout**
- Your scraper may take 20-30 seconds
- **First request might fail!** This is expected.
- **Solution:** Click "Fetch" again after 30 seconds - cached data will return instantly

### CORS Configuration:
- Backend accepts requests from any `*.vercel.app` domain
- Also accepts `localhost` for local development
- This is configured in `server/index.js`

### Cache Behavior:
- First fetch: Slow (scrapes RateX)
- Subsequent fetches: Fast (returns cached data)
- Cache expires after 5 minutes

---

## 🐛 Troubleshooting

### Error: "Failed to fetch"
**Cause:** Environment variable not set correctly

**Fix:**
1. Check `VITE_API_URL` in Vercel frontend settings
2. Make sure it matches your backend URL exactly
3. Redeploy frontend after setting variable

### Error: "CORS policy blocked"
**Cause:** CORS not configured properly

**Fix:**
1. Verify backend has updated `index.js` with CORS config
2. Redeploy backend
3. Check browser console for the exact error

### Error: "Request timeout"
**Cause:** Vercel free tier timeout (10 seconds)

**Fix:**
1. Wait 30 seconds and try again
2. Backend might still be scraping - cache will be ready
3. Consider upgrading to Vercel Pro ($20/month) for 60s timeout
4. OR deploy backend to Render.com (free, no timeout)

### Backend not deploying:
**Cause:** Missing dependencies or wrong configuration

**Fix:**
1. Make sure `server/package.json` exists
2. Make sure `server/vercel.json` exists
3. Check Vercel build logs for errors

---

## 📝 Your Deployment URLs

Fill these in after deployment:

- **Frontend:** `https://_________________.vercel.app`
- **Backend:** `https://_________________.vercel.app`

---

## 🔄 Updating Your Deployment

### Update Backend:
```bash
cd server
vercel --prod
```

### Update Frontend:
```bash
cd ..  # or root directory
vercel --prod
```

### Or use Git (Auto-deploy):
1. Enable Git integration in Vercel dashboard
2. Push to GitHub:
```bash
git add .
git commit -m "Update deployment"
git push
```
3. Vercel auto-deploys on push!

---

## 🎉 Success Checklist

- [ ] Backend deployed to Vercel
- [ ] Frontend deployed to Vercel
- [ ] `VITE_API_URL` environment variable set
- [ ] Frontend redeployed after setting env variable
- [ ] Tested "Fetch" button on live site
- [ ] Data loads successfully

---

## 💡 Next Steps

1. Consider deploying backend to **Render.com** to avoid timeouts
2. Set up **GitHub Actions** to warm cache every 3 minutes
3. Monitor usage on Vercel dashboard

Good luck! 🚀
