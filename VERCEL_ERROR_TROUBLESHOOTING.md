# Vercel Error Troubleshooting Guide

## Common Vercel Errors and Solutions

### FUNCTION_INVOCATION_FAILED (500)
**Cause**: The serverless function crashed or threw an unhandled error.

**Solutions**:
1. Check Vercel function logs in the dashboard
2. Ensure all environment variables are set
3. Verify database connections (Supabase)
4. Check for unhandled promise rejections
5. Review error handler in `backend/src/server.ts`

### NO_RESPONSE_FROM_FUNCTION (502)
**Cause**: Function didn't send a response or timed out.

**Solutions**:
1. Ensure all routes send a response (no hanging requests)
2. Check for missing `res.json()` or `res.send()` calls
3. Verify async/await is properly handled
4. Check function timeout settings (default: 10s for Hobby, 60s for Pro)

### FUNCTION_INVOCATION_TIMEOUT (504)
**Cause**: Function execution exceeded timeout limit.

**Solutions**:
1. Optimize database queries
2. Add caching where possible
3. Break down long-running operations
4. Consider upgrading Vercel plan for longer timeouts
5. Use background jobs for heavy processing

### ROUTER_CANNOT_MATCH (502)
**Cause**: Vercel couldn't route the request to a function.

**Solutions**:
1. Verify `vercel.json` routing configuration
2. Check that `api/index.ts` exists and exports the app
3. Ensure route patterns match (`/api/(.*)`)
4. Verify build completed successfully

### NOT_FOUND (404)
**Cause**: Route doesn't exist or wasn't deployed.

**Solutions**:
1. Check route is registered in `backend/src/server.ts`
2. Verify route path matches frontend API calls
3. Check deployment logs for build errors
4. Ensure frontend uses correct API URL

## Debugging Steps

1. **Check Vercel Dashboard**:
   - Go to your project → Deployments
   - Click on the latest deployment
   - Check "Functions" tab for errors
   - Review "Logs" for runtime errors

2. **Test API Endpoints**:
   ```bash
   curl https://www.blinno.app/api/health
   curl https://www.blinno.app/api/subscriptions/tiers
   ```

3. **Check Environment Variables**:
   - Vercel Dashboard → Settings → Environment Variables
   - Ensure all required vars are set:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `CLICKPESA_API_KEY`
     - `CLICKPESA_CLIENT_ID`
     - `RESEND_API_KEY`
     - `NODE_ENV=production`

4. **Review Function Logs**:
   - Vercel Dashboard → Functions → View logs
   - Look for error messages, stack traces
   - Check for missing dependencies

5. **Verify Build**:
   - Check build logs for TypeScript errors
   - Ensure all dependencies are installed
   - Verify `package.json` includes backend deps

## Health Check Endpoint

The app includes a health check endpoint:
```
GET /api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Common Issues

### Issue: "Cannot find module"
**Solution**: Ensure backend dependencies are in root `package.json`

### Issue: "TypeError: Cannot read property"
**Solution**: Add null checks and proper error handling

### Issue: "ECONNREFUSED" (Database)
**Solution**: Verify Supabase connection string and network access

### Issue: CORS errors
**Solution**: Check CORS configuration in `backend/src/server.ts`

## Monitoring

- Use Vercel Analytics to track function performance
- Set up error tracking (Sentry is already configured)
- Monitor function execution times
- Track error rates by endpoint

## Support

If errors persist:
1. Check Vercel status page: https://www.vercel-status.com
2. Review Vercel documentation: https://vercel.com/docs
3. Contact Vercel support with deployment logs

