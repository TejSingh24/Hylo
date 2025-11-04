# 🚀 Quick Setup Reference

## Deploy to Vercel - Step by Step

### 1️⃣ Deploy Backend
```
1. Go to vercel.com/new
2. Import "Hylo" repo
3. Root Directory: server
4. Framework: Other
5. Deploy
6. COPY backend URL: https://hylo-backend.vercel.app
```

### 2️⃣ Deploy Frontend  
```
1. Go to vercel.com/new (again)
2. Import "Hylo" repo (same repo!)
3. Root Directory: ./ (root)
4. Framework: Vite
5. Environment Variables:
   - VITE_API_URL = https://hylo-backend.vercel.app
6. Deploy
7. COPY frontend URL: https://hylo.vercel.app
```

### 3️⃣ Configure Backend CORS (Recommended)
```
1. Go to backend project settings
2. Settings → Environment Variables
3. Add:
   - ALLOWED_ORIGINS = https://hylo.vercel.app
4. Redeploy backend
```

### 4️⃣ Test
```
1. Visit https://hylo.vercel.app
2. Click Auto → Fetch
3. Wait 20-30 seconds
4. Should load data!
```

---

## Environment Variables Cheat Sheet

| Where | Variable | Value | Required? |
|-------|----------|-------|-----------|
| Frontend | `VITE_API_URL` | `https://your-backend.vercel.app` | ✅ Yes |
| Backend | `ALLOWED_ORIGINS` | `https://your-frontend.vercel.app` | ⚠️ Recommended |

---

## Troubleshooting

**"Failed to fetch"** → Check `VITE_API_URL` in frontend  
**"CORS blocked"** → Check `ALLOWED_ORIGINS` in backend  
**Timeout** → Wait 30s, click Fetch again (normal on first try)  

---

**Always redeploy after changing environment variables!**
