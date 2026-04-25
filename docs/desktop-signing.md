# Desktop signing (Tauri 2)

Last checked: 2026-04-25

Signing the Tauri-packaged desktop binary is platform-specific. The
template ships an unsigned, dev-friendly `apps/desktop/src-tauri/tauri.conf.json`;
production builds must add the appropriate signing config per platform.

This guide documents the shape of each lane without checking real
certificates into the repo. Real cert paths and identifiers belong in
your fork's secret store, not here.

## macOS

Tauri's macOS bundler signs `.app` and `.dmg` with `codesign` and
notarizes through Apple's notary service.

Required:

- An **Apple Developer ID Application** certificate installed in your
  build agent's keychain. Keychain unlock happens before
  `tauri build` runs.
- `bundle.macOS.signingIdentity` set to the certificate's common name
  (e.g. `"Developer ID Application: Acme Inc. (TEAMID)"`).
- `bundle.macOS.providerShortName` if your team has more than one
  associated provider.
- `bundle.macOS.entitlements` pointing at a `.entitlements` plist if
  the binary needs hardened-runtime exemptions (JIT, attached
  debugger, etc.).

Notarization is configured via env in CI:

```bash
export APPLE_ID="ci@example.com"
export APPLE_TEAM_ID="ABCDE12345"
export APPLE_PASSWORD="@keychain:AC_PASSWORD"   # app-specific password
# or use API key auth (preferred for CI):
export APPLE_API_KEY_PATH="/path/to/AuthKey_XXXX.p8"
export APPLE_API_KEY_ID="XXXXXXXXXX"
export APPLE_API_KEY_ISSUER="UUID"
pnpm --filter @repo/desktop build:native
```

Suggested `tauri.conf.json` block (do not commit real values):

```jsonc
{
  "bundle": {
    "macOS": {
      "signingIdentity": null,
      "providerShortName": null,
      "entitlements": null,
      "minimumSystemVersion": "12.0"
    }
  }
}
```

`null` is the documented "do not sign" value during local development.
CI must override `signingIdentity` to a real value.

## Windows

Windows binaries are signed with **Authenticode**. Use `signtool.exe`
(Windows SDK) and a code-signing certificate (preferably an EV
certificate, hardware-token-backed for the strongest reputation).

Required:

- A `.pfx` file or HSM-backed certificate available at build time.
- `bundle.windows.certificateThumbprint` (preferred — looks up the
  cert by SHA-1 thumbprint) **or** `bundle.windows.digestAlgorithm`
  + an external `signtool` invocation as a `bundle.windows.signCommand`.
- `bundle.windows.timestampUrl` set to your provider's RFC 3161 timestamp
  endpoint (e.g. `http://timestamp.digicert.com`). Without timestamping,
  the signature expires when the cert expires.

Suggested `tauri.conf.json` block:

```jsonc
{
  "bundle": {
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": "http://timestamp.digicert.com"
    }
  }
}
```

Inject `certificateThumbprint` from CI env. EV certs typically require
running on the hardware that holds the token; cloud-signing services
(SignPath, AzureCodeSigning) automate this.

## Linux

Linux distributions don't have a single signing convention. The
`.deb` and `.AppImage` bundlers don't sign by default. If your fork
publishes:

- **`.deb`**: sign the package with `dpkg-sig` or upload to a signed
  apt repository. Configure outside `tauri.conf.json`.
- **`.AppImage`**: sign with `gpg --detach-sign`, attach the `.sig` to
  the release. AppImageHub and AppImageLauncher honor signatures.
- **Flatpak / Snap**: signing is the store's responsibility.

The template does not configure Linux signing in `tauri.conf.json`.
Add a CI step that runs after `tauri build` if your distribution path
requires it.

## CI integration shape

Treat signing identity values as secrets injected at build time:

```yaml
# .github/workflows/desktop-release.yml (sketch)
- name: macOS sign + notarize
  if: matrix.os == 'macos-latest'
  env:
    APPLE_API_KEY_PATH: ${{ secrets.APPLE_API_KEY_PATH }}
    APPLE_API_KEY_ID: ${{ secrets.APPLE_API_KEY_ID }}
    APPLE_API_KEY_ISSUER: ${{ secrets.APPLE_API_KEY_ISSUER }}
  run: pnpm --filter @repo/desktop build:native

- name: Windows sign
  if: matrix.os == 'windows-latest'
  env:
    TAURI_WINDOWS_CERTIFICATE_THUMBPRINT: ${{ secrets.WIN_CERT_THUMBPRINT }}
  run: pnpm --filter @repo/desktop build:native
```

The desktop release workflow itself is **not** shipped by this
template — registry / store-specific publication varies too much per
fork to ship a useful default. See
[docs/template-strategy.md](./template-strategy.md) "Avoid day-one
overreach" for the rationale.

## What lives in version control

- Public tauri.conf.json values (productName, identifier, port, sizes).
- `null` placeholders for `signingIdentity`, `certificateThumbprint`.
- This document.

## What never lives in version control

- `.p12`, `.pfx`, `.p8` certificate or private-key files.
- Apple ID passwords, API keys, team IDs, app-specific passwords.
- Windows EV certificate exports.
- Notarization tokens.

`.gitignore` already refuses `.env*` and SOPS-managed files; certs
should live behind the same boundary or in a hardware token / cloud
signing service.
