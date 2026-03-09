import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1, // 10% of transactions for performance
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0, // capture replay on 100% of errors
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production",
});
