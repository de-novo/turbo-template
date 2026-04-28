# Enable Content-Security-Policy

The web app ships with a conservative `securityHeaders` block in
[`apps/web/next.config.ts`](../../apps/web/next.config.ts) — `X-Frame-Options`,
`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and HSTS.
**`Content-Security-Policy` is intentionally absent.** This recipe shows how to add it once you have
a real product UI to constrain.

## Why CSP is not on by default

Two practical reasons the template defers CSP:

1. **Tailwind 4 + Next.js hydration both need an inline-allowance strategy.** Tailwind's runtime
   injects style tags; Next.js's client-side router emits inline scripts for hydration and route
   transitions. A naïve `style-src 'self'; script-src 'self'` policy breaks both. The fix
   (per-request nonces, or hash allow-listing) is easy enough — but it has to be wired into the
   request pipeline, which means picking nonce-based-via-middleware vs hash-based-build- time.
2. **The first product UI's third-party surface is the constraint that picks the policy.** A product
   with a Stripe Elements iframe needs `frame-src https://js.stripe.com`; one with a Sentry browser
   client needs `connect-src https://*.sentry.io`; one with embedded YouTube needs
   `frame-src https://www.youtube.com`. Shipping a CSP that doesn't anticipate the consumer's third
   parties is worse than no CSP — the first thing they do is delete it.

Defer until the first product UI lands and the third-party catalog stabilizes. Then this recipe.

## Step 1 — Pick a strategy

| Strategy              | Trade-off                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| **Nonce-based**       | Per-request unique nonce. Inline scripts and styles must reference it. Strongest. Requires middleware. |
| **Hash-based**        | Pre-compute SHA hashes of inline content at build time. No middleware. Brittle on Tailwind 4 updates.  |
| **`'unsafe-inline'`** | Effectively no protection against XSS. Only acceptable for an internal tool with no user-input HTML.   |

Recommended: **nonce-based**. Next 16 ships with built-in support.

## Step 2 — Add a nonce middleware

Create `apps/web/middleware.ts`:

```ts
import { loadWebEnv } from "@repo/env/apps/web";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const env = loadWebEnv();
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const cspHeader = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' blob: data:`,
    `font-src 'self'`,
    `connect-src 'self' ${env.NEXT_PUBLIC_API_URL}`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Report-Only first; flip to Content-Security-Policy after the
  // browser console is clean for at least a week.
  requestHeaders.set("Content-Security-Policy-Report-Only", cspHeader);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy-Report-Only", cspHeader);
  return response;
}

export const config = {
  matcher: [
    // Skip _next/static, _next/image, favicon.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
```

`'strict-dynamic'` lets scripts loaded with the nonce themselves load further scripts without
needing to be enumerated — Next.js's hydration chain depends on this.

## Step 3 — Reference the nonce in `app/layout.tsx`

Next.js's App Router exposes the nonce through `headers()`:

```tsx
import { headers } from "next/headers";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en">
      <head>{/* Any inline <script>/<style> in the head must carry the nonce */}</head>
      <body>
        {/* Pass nonce to client components that need to inject inline content */}
        {children}
      </body>
    </html>
  );
}
```

## Step 4 — Soak in Report-Only mode

Run for at least a week with the `Content-Security-Policy-Report-Only` header (browsers report
violations to the console without blocking). Watch for:

- Tailwind utility classes that produce inline `<style>` injections.
- Any third-party SDK (analytics, error reporting, embedded widgets) that loads script or makes
  XHR/WebSocket connections.
- Image hosts that need to be added to `img-src`.

Add the entries the violations identify, _not_ speculative future- proofing entries. The CSP is a
tight allowlist; every relaxation needs a justification.

## Step 5 — Flip from Report-Only to enforce

Once the console is clean for a sustained period, swap the header name in `middleware.ts`:

```diff
-  requestHeaders.set("Content-Security-Policy-Report-Only", cspHeader);
+  requestHeaders.set("Content-Security-Policy", cspHeader);
   const response = NextResponse.next({ request: { headers: requestHeaders } });
-  response.headers.set("Content-Security-Policy-Report-Only", cspHeader);
+  response.headers.set("Content-Security-Policy", cspHeader);
```

The browser now blocks violations rather than reporting them.

## Step 6 — Document the policy in capabilities

Update [`docs/capabilities.md`](../capabilities.md) Operational lanes table — change the "Web
headers" row from "(CSP intentionally omitted)" to a pointer at this enabled policy + the
next.config / middleware.ts location.

## Common gotchas

- **Tailwind 4 v4 utility-class injection** — every Tailwind release may shift its inline-style
  strategy. Pin Tailwind in `pnpm-workspace.yaml` and re-soak Report-Only after major upgrades.
- **Next.js dev mode** — Fast Refresh injects an inline `<script>` with no nonce. Either gate the
  CSP middleware on `NODE_ENV === "production"` (looser dev), or add `'unsafe-eval'` for dev only
  (also looser). The shipped recipe keeps CSP active in both, with `'strict-dynamic'` covering the
  Fast Refresh path.
- **CSP report endpoints** — `report-uri` / `report-to` requires a collector. Sentry's browser SDK
  can ingest CSP reports; so can a custom NestJS endpoint. Out of scope for this recipe.
- **Older browsers** — Report-Only sometimes lies in old Chrome / old Firefox. The flip-to-enforce
  step is the real validation; budget a rollback plan.

## References

- ADR backdrop: this recipe doesn't have its own ADR — the _decision to defer CSP_ is captured in
  [`docs/capabilities.md`](../capabilities.md) Operational lanes ("Web headers" row).
- [Next.js CSP documentation](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy).
- [MDN CSP reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP).
