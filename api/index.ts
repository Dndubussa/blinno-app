/**
 * Vercel Serverless Function Entry Point
 * This file exports the Express app for Vercel deployment
 * 
 * Vercel automatically handles TypeScript compilation for files in the api/ directory
 */
import app from '../backend/src/server.js';

// Export as handler for Vercel
// The Express app handles all routing internally
export default app;

