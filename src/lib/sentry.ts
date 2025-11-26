import * as Sentry from "@sentry/react";

// Initialize Sentry only in production
if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN || "https://examplePublicKey@o0.ingest.sentry.io/0",
    // Performance Monitoring
    tracesSampleRate: 1.0, // Capture 100% of the transactions
  });
}

export { Sentry };
export { ErrorBoundary } from "@sentry/react";
