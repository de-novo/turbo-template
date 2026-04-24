# GitOps Secret Templates

This directory contains opt-in examples for SOPS + age + KSOPS with Argo CD.

Files ending in `.enc.yaml` are intentionally examples until encrypted with the project's real age
recipient. Do not commit decrypted Kubernetes Secret manifests.

Recommended flow:

```bash
cp .sops.yaml.example .sops.yaml
age-keygen -o ~/.config/sops/age/turbo-template.txt
export SOPS_AGE_KEY_FILE=~/.config/sops/age/turbo-template.txt
sops --encrypt --in-place ops/gitops/apps/api/api-secret.enc.yaml
kustomize build --enable-alpha-plugins ops/gitops/apps/api
```

Create the encrypted file from the example first:

```bash
cp ops/gitops/apps/api/api-secret.enc.yaml.example ops/gitops/apps/api/api-secret.enc.yaml
sops --encrypt --in-place ops/gitops/apps/api/api-secret.enc.yaml
```

The Argo CD repo-server needs a KSOPS Config Management Plugin sidecar. See
`ops/gitops/argocd/ksops-plugin.example.yaml` for the shape to adapt to the cluster's Argo CD
installation method.
