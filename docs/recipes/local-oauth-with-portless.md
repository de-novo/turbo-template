# Use OAuth locally with portless

Portless defaults to `.localhost` domains such as
`https://web.fullstack-typescript-template.localhost`. That is good for normal local development,
but many OAuth providers reject `.localhost` subdomains when validating redirect URIs. Google and
Apple are the strictest providers.

For OAuth testing, run portless on a real public suffix and use a DNS name under a domain you own.
Do not rely on local DNS overrides for this template path; public DNS keeps provider validation and
team setup predictable.

Portless should still be treated as a domain-based router, not as an app-port registry. The app
commands may bind internal framework ports such as `3000` or `4000`, but OAuth providers and
browsers should see stable HTTPS domains. Only the shared portless proxy port is exposed (`443` by
default, or an unprivileged port such as `1355` when sudo is not available). Do not register or
document OAuth redirects with `localhost:{port}`.

## Recommended DNS shape

If you own `example.com`, create a wildcard DNS record at your DNS provider, such as Cloudflare:

```text
Type: A
Name: *.local
IPv4 address: 127.0.0.1
Proxy status: DNS only
TTL: Auto
```

This makes every developer resolve these names to their own machine:

```text
web.local.example.com -> 127.0.0.1
api.local.example.com -> 127.0.0.1
mfe.local.example.com -> 127.0.0.1
```

For Cloudflare, keep the record **DNS only**. Do not enable the orange-cloud proxy; Cloudflare
cannot proxy traffic to each user's `127.0.0.1`.

## Multiple projects

If the same domain serves several local projects, include the project slug before `.local`:

```text
*.{project}.local.example.com A 127.0.0.1
```

DNS wildcards only cover one label at their wildcard position. That means the generic
`*.local.example.com` record covers `web.local.example.com`, but not
`web.billing.local.example.com`. For project-scoped hosts, create one wildcard record per project.

For a project named `billing`, create this record in the `example.com` zone:

```text
*.billing.local.example.com A 127.0.0.1
```

Then use these local URLs:

```text
web.billing.local.example.com
api.billing.local.example.com
mfe.billing.local.example.com
```

For this template's default slug, the equivalent shape is:

```text
web.fullstack-typescript-template.local.example.com
api.fullstack-typescript-template.local.example.com
```

This avoids collisions when several template forks are active on the same workstation or team
domain.

## Run portless with the owned domain

The `--tld` value supplies the final public suffix. For `example.com`, use `--tld com` and include
the rest of the domain in the portless app name:

```bash
portless proxy start --tld com --https
portless web.local.example pnpm --filter @repo/web dev:app
portless api.local.example pnpm --filter @repo/api dev:app
```

Those commands produce:

```text
https://web.local.example.com
https://api.local.example.com
```

For a multi-project host such as `billing.local.example.com`, run:

```bash
portless proxy start --tld com --https
portless web.billing.local.example pnpm --filter @repo/web dev:app
portless api.billing.local.example pnpm --filter @repo/api dev:app
```

Those commands produce:

```text
https://web.billing.local.example.com
https://api.billing.local.example.com
```

If port 443 cannot prompt for sudo in the current terminal, start the proxy on an unprivileged port:

```bash
portless proxy start --tld com --port 1355 --https
```

Then include `:1355` in browser URLs and OAuth redirect URIs.

## OAuth provider redirect URIs

This template's web app proxies `/api/auth/*` to the API, so register OAuth callbacks on the web
origin. That keeps browser cookies same-origin during local development.

For Google, using `example.com`:

```text
Authorized JavaScript origins:
https://web.local.example.com

Authorized redirect URIs:
https://web.local.example.com/api/auth/callback/google
```

For a multi-project `billing` host:

```text
Authorized JavaScript origins:
https://web.billing.local.example.com

Authorized redirect URIs:
https://web.billing.local.example.com/api/auth/callback/google
```

Provider-specific callback suffixes usually follow the provider id:

```text
/api/auth/callback/google
/api/auth/callback/github
/api/auth/callback/apple
/api/auth/callback/microsoft
```

Confirm the exact path in the auth library/provider adapter before registering production
credentials.

## Env values

For a single-project `example.com` setup:

```env
# apps/api/.env
BETTER_AUTH_URL=https://web.local.example.com
CORS_ORIGINS=https://web.local.example.com
```

```env
# apps/web/.env.local
NEXT_PUBLIC_WEB_URL=https://web.local.example.com
NEXT_PUBLIC_API_URL=https://api.local.example.com
```

For a multi-project `billing.local.example.com` setup:

```env
# apps/api/.env
BETTER_AUTH_URL=https://web.billing.local.example.com
CORS_ORIGINS=https://web.billing.local.example.com
```

```env
# apps/web/.env.local
NEXT_PUBLIC_WEB_URL=https://web.billing.local.example.com
NEXT_PUBLIC_API_URL=https://api.billing.local.example.com
```

## When to keep `.localhost`

Use the default `.localhost` portless URLs for normal local development. Switch to the owned-domain
shape only when you need OAuth provider redirects to pass external validation.
