import * as Sentry from "@sentry/react";

// Initialize Sentry only in production and if a valid DSN is provided
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (import.meta.env.PROD && sentryDsn && sentryDsn !== "https://examplePublicKey@o0.ingest.sentry.io/0" && !sentryDsn.includes("examplePublicKey")) {
  Sentry.init({
    dsn: sentryDsn,
    // Performance Monitoring
    tracesSampleRate: 1.0, // Capture 100% of the transactions
  });
}

export { Sentry };
export { ErrorBoundary } from "@sentry/react";
