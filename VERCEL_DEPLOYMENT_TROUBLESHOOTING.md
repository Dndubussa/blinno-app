# Vercel Deployment Troubleshooting

## Issue: Project Not Redeploying on Vercel

If your project isn't automatically redeploying after pushing to GitHub, follow these steps:

## ✅ Quick Checks

### 1. Verify GitHub Integration
- Go to Vercel Dashboard → Your Project → Settings → Git
- Ensure your GitHub repository is connected
- Check that the correct branch is selected (should be `master` or `main`)
- Verify the repository name matches: `Dndubussa/blinno-app`

### 2. Check Branch Configuration
- Vercel should be watching the `master` branch
- Go to Settings → Git → Production Branch
- Ensure it's set to `master`

### 3. Verify Webhook Status
- Go to GitHub → Your Repository → Settings → Webhooks
- Look for a webhook from `vercel.com`
- Check if it's active and receiving events
- If missing, Vercel will need to reconnect

### 4. Check Recent Deployments
- Go to Vercel Dashboard → Deployments
- Check if there are any failed deployments
- Look for error messages in build logs

## 🔧 Manual Deployment Trigger

If auto-deployment isn't working, you can manually trigger:

### Option 1: Via Vercel Dashboard
1. Go to Vercel Dashboard → Your Project
2. Click "Deployments" tab
3. Click "Redeploy" on the latest deployment
4. Or click "Create Deployment" → Select branch `master` → Deploy

### Option 2: Via Vercel CLI
```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Option 3: Force Push (Trigger Webhook)
```bash
# Make a small change and push
git commit --allow-empty -m "Trigger Vercel deployment"
git push origin master
```

## 🐛 Common Issues

### Issue 1: Wrong Branch
**Symptom**: Vercel is watching `main` but you're pushing to `master`
**Fix**: 
- Change Vercel production branch to `master`
- Or push to `main` branch instead

### Issue 2: Build Errors
**Symptom**: Deployments show as "Failed" or "Error"
**Fix**:
- Check build logs in Vercel Dashboard
- Look for TypeScript errors, missing dependencies, etc.
- Fix errors and push again

### Issue 3: Webhook Not Firing
**Symptom**: No deployments appear after push
**Fix**:
- Disconnect and reconnect GitHub in Vercel
- Go to Settings → Git → Disconnect → Reconnect

### Issue 4: Environment Variables Missing
**Symptom**: Build succeeds but app doesn't work
**Fix**:
- Go to Settings → Environment Variables
- Ensure all required variables are set:
  - `NODE_ENV=production`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CLICKPESA_CLIENT_ID`
  - `CLICKPESA_API_KEY`
  - `APP_URL`

## 📋 Verification Steps

1. **Check Git Status**:
   ```bash
   git log --oneline -1
   # Should show your latest commit
   ```

2. **Verify Push**:
   ```bash
   git remote -v
   # Should show GitHub remote
   ```

3. **Check Vercel Project**:
   - Go to Vercel Dashboard
   - Verify project exists and is connected to GitHub
   - Check "Deployments" tab for activity

4. **Test Manual Deployment**:
   - Try redeploying manually from Vercel Dashboard
   - If manual deploy works, it's a webhook issue
   - If manual deploy fails, check build logs

## 🔍 Debugging Commands

```bash
# Check current branch
git branch

# Check remote
git remote -v

# Check last commit
git log --oneline -1

# Force trigger (empty commit)
git commit --allow-empty -m "Trigger deployment"
git push origin master
```

## 📞 Next Steps

If none of the above works:

1. **Check Vercel Status**: https://vercel-status.com
2. **Review Vercel Logs**: Dashboard → Deployments → Latest → View Logs
3. **Contact Vercel Support**: If webhook is missing or broken
4. **Reconnect Repository**: Disconnect and reconnect GitHub integration

## ✅ Expected Behavior

After pushing to GitHub:
1. Vercel webhook receives push event
2. Vercel starts a new deployment
3. Build process runs (`npm run build`)
4. Frontend builds to `dist/`
5. Backend TypeScript compiles
6. Serverless functions are created
7. Deployment goes live

If this isn't happening, use the troubleshooting steps above.


