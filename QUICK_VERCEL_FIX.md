# Quick Fix: Trigger Vercel Deployment

## Immediate Solution

If Vercel isn't auto-deploying, try these steps in order:

### 1. Check Vercel Dashboard
- Go to https://vercel.com/dashboard
- Find your project
- Check "Deployments" tab
- Look for any failed builds or errors

### 2. Verify Branch Configuration
- Go to Project Settings → Git
- Ensure Production Branch is set to `master`
- If it's set to `main`, change it to `master`

### 3. Manual Redeploy (Fastest Fix)
- In Vercel Dashboard → Deployments
- Click on the latest deployment
- Click "Redeploy" button
- This will trigger a new deployment immediately

### 4. Reconnect GitHub (If Webhook Broken)
- Go to Project Settings → Git
- Click "Disconnect"
- Click "Connect Git Repository"
- Select your repository again
- This will recreate the webhook

### 5. Force Trigger via Git (Just Done)
An empty commit was just pushed to trigger the webhook. Check Vercel Dashboard in 1-2 minutes.

## Common Causes

1. **Wrong Branch**: Vercel watching `main`, you're pushing to `master`
2. **Webhook Broken**: GitHub webhook not firing
3. **Build Errors**: Previous deployment failed, blocking new ones
4. **Vercel Status**: Check https://vercel-status.com for outages

## Quick Check Commands

```bash
# Verify you're on master branch
git branch

# Check last commit
git log --oneline -1

# Force trigger (if needed)
git commit --allow-empty -m "Trigger deployment"
git push origin master
```

## Next Steps

1. Wait 1-2 minutes after the empty commit
2. Check Vercel Dashboard → Deployments
3. If still no deployment, use manual redeploy
4. If manual deploy fails, check build logs for errors


