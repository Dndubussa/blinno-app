/**
 * Vercel Serverless Function Entry Point
 * This file exports the Express app for Vercel deployment
 * 
 * Vercel automatically handles TypeScript compilation for files in the api/ directory
 */
import app from '../backend/src/server.js';

// Vercel serverless function handler
// Vercel routes /api/* requests here, and the path includes /api
export default (req: any, res: any) => {
  // Log request for debugging (only in development or with DEBUG env var)
  if (process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development') {
    console.log('[Vercel Handler]', {
      method: req.method,
      url: req.url,
      path: req.path,
      originalUrl: req.originalUrl,
      query: req.query
    });
  }
  
  // Handle the request with Express
  return app(req, res);
};

