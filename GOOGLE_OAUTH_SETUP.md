# Google OAuth Setup for BLINNO Platform

This document explains how to set up Google OAuth authentication for the BLINNO platform using Supabase.

## Overview

Google OAuth allows users to sign in to the BLINNO platform using their Google accounts. This provides a seamless authentication experience and reduces the friction of creating new accounts.

## Prerequisites

1. A Google Cloud Platform account
2. A project in Google Cloud Console
3. Supabase project with Auth enabled

## Setup Instructions

### 1. Create Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Select "Web application" as the application type
6. Set the following URLs:
   - **Authorized JavaScript origins**: 
     - For production: `https://www.blinno.app`
     - For development: `http://localhost:5173`
   - **Authorized redirect URIs**: 
     - For production: `https://www.blinno.app/auth/callback`
     - For development: `http://localhost:5173/auth/callback`
     - Also add: `https://your-project-ref.supabase.co/auth/v1/callback` (replace `your-project-ref` with your actual Supabase project reference)
7. Click "Create" and save the Client ID and Client Secret

### 2. Configure Supabase Auth

1. Go to your Supabase project dashboard
2. Navigate to "Authentication" > "Providers"
3. Find "Google" in the list of providers
4. Toggle the provider to "Enabled"
5. Enter the Google Client ID and Client Secret from step 1
6. Make sure "Skip redirect callback check" is unchecked
7. Save the configuration

### 3. Update Environment Variables

Ensure your `.env` files have the correct Supabase URLs and keys:

**Frontend (.env)**
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

**Backend (backend/.env)**
```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 4. Test the Integration

1. Start your development server
2. Navigate to the authentication page
3. Click the "Continue with Google" button
4. You should be redirected to Google's OAuth consent screen
5. After granting permission, you should be redirected back to your application

## Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch" Error**
   - Ensure the redirect URI in Google Cloud Console matches exactly with what you're using
   - The redirect URI should include: `https://your-project-ref.supabase.co/auth/v1/callback`
   - Also add your application's callback URL: `https://www.blinno.app/auth/callback` or `http://localhost:5173/auth/callback`

2. **OAuth Provider Not Enabled**
   - Check that Google OAuth is enabled in the Supabase dashboard
   - Verify that the Client ID and Client Secret are correctly entered

3. **CORS Issues**
   - Ensure your application domain is added to the authorized domains in Google Cloud Console
   - Check that your Supabase project URL is correctly configured

4. **"invalid_request" Error**
   - This typically means Google OAuth is not properly configured in Supabase
   - Double-check the Client ID and Client Secret in Supabase Auth settings
   - Ensure the redirect URIs in Google Cloud Console match what Supabase expects

### Debugging Steps

1. Check the browser console for any JavaScript errors
2. Verify network requests to see if the OAuth flow is being initiated correctly
3. Check Supabase logs for any authentication errors
4. Ensure environment variables are correctly set

## Security Considerations

1. **Keep Secrets Secure**
   - Never commit Client Secrets to version control
   - Use environment variables for all sensitive information

2. **Authorized Domains**
   - Only add trusted domains to the authorized origins list
   - Regularly review and update the list of authorized domains

3. **Token Handling**
   - The application properly handles OAuth tokens through Supabase
   - Session management is handled automatically by Supabase Auth

## Additional Providers

The same setup process can be used for other OAuth providers supported by Supabase:
- GitHub
- Facebook
- Twitter
- Azure
- Bitbucket
- Discord
- GitLab
- LinkedIn
- Spotify
- Twitch
- Apple
- Microsoft

## Support

If you encounter issues with the Google OAuth setup:
1. Check the Supabase documentation: https://supabase.com/docs/guides/auth
2. Review Google's OAuth documentation: https://developers.google.com/identity/protocols/oauth2
3. Contact the development team for assistance