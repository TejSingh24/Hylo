# Environment Variables Setup Guide

This guide explains how to configure environment variables for both frontend and backend deployments.

---

## 🎯 Overview

**Frontend needs:** Backend API URL  
**Backend needs:** Allowed frontend origins (for CORS security)

---

## 🎨 Frontend Environment Variables

### Variable: `VITE_API_URL`

**Purpose:** Tells the frontend where the backend API is located

**How to set in Vercel:**

1. Go to Vercel Dashboard
2. Select your **frontend** project (e.g., `hylo`)
3. Go to **Settings** → **Environment Variables**
4. Click **"Add New"**
5. Enter:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://your-backend-url.vercel.app`
   - **Environments:** Check all (Production, Preview, Development)
6. Click **"Save"**
7. **Redeploy** the frontend for changes to take effect

**Example:**
```
Name:  VITE_API_URL
Value: https://hylo-backend.vercel.app
```

---

## 🔧 Backend Environment Variables

### Variable: `ALLOWED_ORIGINS`

**Purpose:** Specifies which frontend URLs can call your backend API (CORS security)

**How to set in Vercel:**

1. Go to Vercel Dashboard
2. Select your **backend** project (e.g., `hylo-backend`)
3. Go to **Settings** → **Environment Variables**
4. Click **"Add New"**
5. Enter:
   - **Name:** `ALLOWED_ORIGINS`
   - **Value:** `https://your-frontend-url.vercel.app`
   - **Environments:** Check all (Production, Preview, Development)
6. Click **"Save"**
7. **Redeploy** the backend for changes to take effect

---

## 📝 Examples

### Single Frontend URL (Recommended for Production):
```
Name:  ALLOWED_ORIGINS
Value: https://hylo.vercel.app
```

### Multiple Frontend URLs (Staging + Production):
```
Name:  ALLOWED_ORIGINS
Value: https://hylo.vercel.app,https://hylo-staging.vercel.app,https://hylo-preview.vercel.app
```

**Important:** Separate URLs with commas, no spaces!

### Allow All Vercel Apps (Testing Only - Less Secure):
```
Name:  ALLOWED_ORIGINS
Value: (leave empty)
```

When empty, backend automatically allows all `*.vercel.app` domains.  
**Not recommended for production!**

---

## 🔒 Security Best Practices

### ✅ DO:
- Set specific frontend URLs in `ALLOWED_ORIGINS`
- Use comma-separated list for multiple domains
- Include staging/preview URLs if needed
- Redeploy after setting environment variables

### ❌ DON'T:
- Leave `ALLOWED_ORIGINS` empty in production (less secure)
- Add spaces between comma-separated URLs
- Include trailing slashes in URLs
- Forget to redeploy after changes

---

## 🧪 Testing Environment Variables

### Check Frontend Configuration:

1. Open your deployed frontend in browser
2. Press `F12` to open Developer Tools
3. Go to **Console** tab
4. You should see: `API Base URL: https://your-backend-url.vercel.app`
5. If it shows `http://localhost:3001`, the environment variable isn't set correctly

### Check Backend Configuration:

1. Deploy backend
2. Check deployment logs in Vercel
3. Look for: `✅ CORS allowed origins: [...]`
4. Should show your frontend URL(s)

### Test CORS:

1. Visit your frontend
2. Click "Fetch" button
3. If you see "CORS policy blocked" error:
   - Check backend `ALLOWED_ORIGINS` includes your frontend URL
   - Make sure URLs match exactly (no trailing slash differences)
   - Redeploy backend after fixing

---

## 🔄 Complete Setup Checklist

### Initial Setup:
- [ ] Deploy backend to Vercel
- [ ] Copy backend URL
- [ ] Deploy frontend to Vercel
- [ ] Copy frontend URL
- [ ] Set `VITE_API_URL` in frontend (value = backend URL)
- [ ] Set `ALLOWED_ORIGINS` in backend (value = frontend URL)
- [ ] Redeploy both frontend and backend
- [ ] Test by clicking "Fetch" button

### After Changes:
- [ ] If backend URL changes → Update `VITE_API_URL` in frontend → Redeploy frontend
- [ ] If frontend URL changes → Update `ALLOWED_ORIGINS` in backend → Redeploy backend

---

## 🐛 Troubleshooting

### Error: "Failed to fetch"

**Possible causes:**
1. `VITE_API_URL` not set in frontend
2. `VITE_API_URL` has wrong backend URL
3. Backend is not deployed

**Fix:**
- Check frontend environment variables
- Verify backend URL is correct
- Make sure backend is deployed and running

### Error: "CORS policy blocked"

**Possible causes:**
1. `ALLOWED_ORIGINS` not set in backend
2. Frontend URL not in `ALLOWED_ORIGINS` list
3. URL mismatch (e.g., `https://app.vercel.app` vs `https://app.vercel.app/`)

**Fix:**
- Check backend environment variables
- Add your frontend URL to `ALLOWED_ORIGINS`
- Make sure URLs match exactly
- Redeploy backend

### Environment variable not working

**Possible causes:**
1. Didn't redeploy after setting variable
2. Typo in variable name
3. Wrong project (set in backend instead of frontend, or vice versa)

**Fix:**
- Always redeploy after changing environment variables
- Check variable name spelling (case-sensitive!)
- Verify you're in the correct project

---

## 📱 Local Development

For local development, create `.env` files:

### Frontend (root directory):
```bash
# .env
VITE_API_URL=http://localhost:3001
```

### Backend (server directory):
```bash
# server/.env
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

**Note:** `.env` files are ignored by git (already in `.gitignore`)

---

## 🎯 Summary

| Project | Variable Name | Value | Purpose |
|---------|---------------|-------|---------|
| **Frontend** | `VITE_API_URL` | Backend URL | Where to call API |
| **Backend** | `ALLOWED_ORIGINS` | Frontend URL(s) | Who can call API |

**Remember:** Always redeploy after setting environment variables! 🚀
