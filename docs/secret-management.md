# Secret Management

This template supports multiple production secret paths. Pick one primary path per deployment
environment and keep the app-level env contract the same.

## Decision

Default recommendation:

| Environment                                          | Where the real values live                                             | When to pick this lane                                                          |
| ---------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Local development                                    | Gitignored app-scoped `.env` files or shell env                        | Always, for solo / contributor laptops.                                         |
| Cloud or Kubernetes without GitOps-encrypted secrets | Platform secret store, Vault, External Secrets Operator, or CSI driver | Default for managed clusters; the secrets never enter git.                      |
| Argo CD GitOps with secrets in the repo              | SOPS + age + KSOPS as an explicit opt-in lane                          | Pick only when the GitOps repository must contain encrypted Kubernetes Secrets. |

Do not commit raw secrets. Do not commit age private keys. Do not inject one global secret blob into
all apps.

## SOPS + age + KSOPS Lane

Use this lane only when the GitOps repository must contain encrypted Kubernetes Secret manifests.

Ownership:

```text
.sops.yaml.example
  # recipient and encryption rule template; copy to .sops.yaml when the cluster recipient exists

ops/gitops/apps/*/*.enc.yaml
  # encrypted Kubernetes Secret files committed to git

ops/gitops/apps/*/secret-generator.yaml
  # KSOPS generator that decrypts encrypted files during kustomize build

ops/gitops/argocd/ksops-plugin.example.yaml
  # Argo CD repo-server sidecar/plugin example
```

Required setup:

1. Generate an age key pair outside the repository.
2. Store the private key as a Kubernetes Secret in the Argo CD namespace, mounted only into the
   repo-server KSOPS sidecar.
3. Copy `.sops.yaml.example` to `.sops.yaml` and replace the age recipient with the public
   recipient.
4. Encrypt only Kubernetes Secret payload fields such as `data` and `stringData`.
5. Use KSOPS from a Kustomize overlay so Argo CD receives decrypted manifests only inside the
   repo-server render path.

Example commands:

```bash
mkdir -p ~/.config/sops/age   # macOS / fresh Linux installs need the parent dir first
age-keygen -o ~/.config/sops/age/turbo-template.txt
export SOPS_AGE_KEY_FILE=~/.config/sops/age/turbo-template.txt
cp .sops.yaml.example .sops.yaml
sops --encrypt --in-place ops/gitops/apps/api/api-secret.enc.yaml
```

The repository commits `api-secret.enc.yaml.example` only. Copy it to `api-secret.enc.yaml`, encrypt
it, then commit the encrypted file in the real project.

In CI, validate encrypted files without printing secrets:

```bash
sops --decrypt ops/gitops/apps/api/api-secret.enc.yaml >/dev/null
kustomize build --enable-alpha-plugins ops/gitops/apps/api >/dev/null
```

## Argo CD Requirements

Argo CD should run KSOPS as a Config Management Plugin sidecar for the repo-server. The sidecar
image must contain compatible versions of `kustomize`, `sops`, `ksops`, and any shell tools used by
the plugin command.

Security boundaries:

- The age private key is mounted only into Argo CD repo-server plugin sidecars.
- Application pods never receive the age private key.
- Decrypted Kubernetes Secrets exist only as rendered manifests and Kubernetes Secret resources.
- Argo CD Application manifests should point at the overlay path, not individual encrypted files.

Prefer External Secrets Operator or Vault CSI instead when the organization already has a central
secret manager and does not need encrypted secret manifests in git.

## App Env Contract

The decrypted Kubernetes Secret should still mirror `env/production/{app}.env.example`.

For the API app, the target Kubernetes Secret is named `api-env`:

```text
env/production/api.env.example
  -> ops/gitops/apps/api/api-secret.enc.yaml
  -> Kubernetes Secret api-env
  -> Deployment envFrom.secretRef.name=api-env
  -> @repo/env/apps/api validation at startup
```

For public frontend values, remember that `NEXT_PUBLIC_*`, `VITE_*`, and `EXPO_PUBLIC_*` may be
build-time values. Do not put server-only secrets into frontend encrypted files.

## Rotation

Rotate secrets in this order:

1. Add the new value to the encrypted file.
2. Commit and sync through Argo CD.
3. Restart or roll the target workload if the runtime does not reload env.
4. Remove the old value from downstream systems after the rollout is healthy.

Rotate age recipients separately from app secrets. During key rotation, encrypt to both old and new
recipients, sync, verify decryption, then remove the old recipient.
