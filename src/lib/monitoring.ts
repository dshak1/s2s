// Error monitoring stub. Wraps Sentry when configured; no-ops otherwise.
// To enable: pnpm add @sentry/nextjs && npx @sentry/wizard@latest -i nextjs
// Then set NEXT_PUBLIC_SENTRY_DSN in your Vercel env vars.

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

export function captureError(err: unknown, context?: Record<string, unknown>) {
  if (!DSN) {
    console.error("[monitoring]", err, context);
    return;
  }
  // When Sentry is installed, swap this import:
  // import * as Sentry from "@sentry/nextjs";
  // Sentry.captureException(err, { extra: context });
}

export function captureMessage(msg: string, level: "info" | "warning" | "error" = "info") {
  if (!DSN) {
    if (level === "error") console.error("[monitoring]", msg);
    return;
  }
  // Sentry.captureMessage(msg, level);
}
