# Register an SSO provider

The template ships `@better-auth/sso` enabled by default. Providers are stored
in the `sso_provider` table and registered at runtime through REST endpoints.
This recipe shows the two common flows: OIDC (most IdPs) and SAML 2.0
(enterprise).

All endpoints require an authenticated Better Auth session — sign in first and
pass the session cookie with `-b cookie.txt`.

## Sign in and capture a session cookie

```bash
curl -c cookie.txt -X POST http://localhost:4000/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"<password>"}'
```

> **Admin gating**: any authenticated user can register a provider by default.
> Gate this endpoint behind a permission check (e.g. the `systemAdmin`
> permission in `@repo/auth`) before going to production.

## Register an OIDC provider (Okta, Auth0, Keycloak, …)

OIDC only needs the issuer URL plus client credentials — Better Auth pulls
the authorization / token / userinfo endpoints via discovery:

```bash
curl -b cookie.txt -X POST http://localhost:4000/auth/sso/register \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": "acme-okta",
    "issuer": "https://acme.okta.com",
    "domain": "acme.com",
    "oidcConfig": {
      "clientId": "<okta client id>",
      "clientSecret": "<okta client secret>",
      "scopes": ["openid", "email", "profile"]
    }
  }'
```

Sign-in flow for a user whose email matches the provider domain:

```bash
curl -X POST http://localhost:4000/auth/sign-in/sso \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@acme.com"}'
# => { "url": "https://acme.okta.com/oauth2/...", "redirect": true }
```

Alternative: pass `providerId` or `organizationSlug` instead of email.

## Register a SAML 2.0 provider

SAML needs the IdP's entry point, certificate, and explicit SP/IdP metadata:

```bash
curl -b cookie.txt -X POST http://localhost:4000/auth/sso/register \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": "acme-saml",
    "issuer": "https://idp.acme.com/saml",
    "domain": "acme.com",
    "samlConfig": {
      "entryPoint": "https://idp.acme.com/saml/sso",
      "callbackUrl": "http://localhost:4000/auth/sso/saml2/callback/acme-saml",
      "cert": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
      "idpMetadata": { "entityID": "https://idp.acme.com/saml" },
      "spMetadata": { "entityID": "http://localhost:4000", "assertionConsumerService": [] }
    }
  }'
```

Retrieve the auto-generated SP metadata to share with the IdP administrator:

```bash
curl "http://localhost:4000/auth/sso/saml2/sp/metadata?providerId=acme-saml"
```

IdP-initiated assertions arrive at
`POST /auth/sso/saml2/callback/:providerId` — Better Auth verifies the
signature, validates timestamps, and provisions the user.

## Domain verification (optional)

Disabled by default. Enable in `createAuth`:

```ts
createAuth({
  // ...
  sso: { enableDomainVerification: true },
});
```

Verification flow:

1. `POST /auth/sso/request-domain-verification` → returns a TXT token
2. Admin publishes the token as a DNS TXT record on the domain
3. `POST /auth/sso/verify-domain` → Better Auth queries DNS, flips
   `domain_verified` to `true`

Until a domain is verified, Better Auth will refuse to sign users into that
provider via email matching.

## Per-organization SSO

The `sso_provider.organization_id` column is ready for per-organization SSO
but has no FK constraint yet because the Organization model is not in this
template phase. When Organization lands, add a migration that:

1. Creates the `organization` and `member` tables
2. Alters `sso_provider.organization_id` to add an FK → `organization.id`

## Disable SSO entirely

If a project will never use enterprise SSO and wants to avoid the `samlify`
dependency weight, pass `sso: { disabled: true }` to `createAuth`. The table
stays in place (cheap) but the plugin does not register and no endpoints are
exposed.
