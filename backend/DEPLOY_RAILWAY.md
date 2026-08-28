# Railway Deployment

1. Install Railway CLI: npm install -g @railway/cli
2. railway login
3. cd backend && railway init
4. railway link (select your project)
5. Upload model files BEFORE deploying:
   railway volume create models-volume
   railway run -- python api/startup.py  (verify models exist)
6. Set environment variables in Railway dashboard:
   ENVIRONMENT=production
   ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
7. railway up --detach
8. railway logs (to verify startup)
9. railway domain (get your public URL)
10. Test: curl https://your-railway-url.railway.app/health

IMPORTANT NOTE: The trained model files (*.pkl) are too large for git.
Railway strategy:

- Add models/ to .gitignore
- Use Railway Volumes to persist model files
- OR: retrain on Railway using the training notebook as a one-time job
- OR: upload to Railway using: railway run -- python notebooks/04_train_models.py
