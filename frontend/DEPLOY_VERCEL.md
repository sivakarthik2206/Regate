# Vercel Deployment Guide

1. Push frontend to GitHub:
   cd frontend
   git init (if separate repo)
   git add . && git commit -m "Initial Regate frontend"
   git remote add origin https://github.com/YOUR_USERNAME/regate-frontend
   git push -u origin main

2. Connect to Vercel:

   - Go to vercel.com -> New Project -> Import from GitHub
   - Select regate-frontend repo
   - Framework: Next.js (auto-detected)
   - Root directory: frontend/ (if monorepo) OR leave blank (if separate repo)

3. Set environment variables in Vercel dashboard:
   NEXT_PUBLIC_API_URL = https://your-railway-url.railway.app

4. Deploy -> Vercel gives you URL: https://regate-XXXX.vercel.app

5. Update Railway ALLOWED_ORIGINS to include your Vercel URL

6. Test end-to-end:

   - Open https://regate-XXXX.vercel.app/dashboard
   - All charts should load real data
   - Open /predict and run a prediction
   - Verify the POST request goes to Railway and returns a result

CUSTOM DOMAIN (optional):

- In Vercel -> Settings -> Domains -> Add your domain
- Update CORS in Railway
