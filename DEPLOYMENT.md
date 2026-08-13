# Vira — Deployment

Deploy the walking skeleton end-to-end **before** building features, so "works locally" and
"works in prod" stay in sync. Every push to `main` redeploys and smoke-tests.

```
frontend (React)  → Vercel            (auto deploy on push; PR preview URLs)
backend (.NET)    → Azure Container Apps   (external ingress)   ┐  built by ACR Tasks,
ai-service (Py)   → Azure Container Apps   (internal ingress)   ┘  deployed on push to main
Postgres          → Azure DB for PostgreSQL (Flexible)
secrets           → Azure Key Vault (referenced by the apps via managed identity)
GitHub → Azure    → OIDC federated (no stored cloud secret)
```

## Prerequisites (once)

- `az login` (Azure CLI) — you're on 2.73 ✓
- `gh auth login` (GitHub CLI) — you're on 2.57 ✓
- A Vercel account
- Your Azure **subscription id**
- Subscription **Owner/Contributor** for the bootstrap (it registers the required resource
  providers — `Microsoft.App`, `.OperationalInsights`, `.ContainerRegistry`, `.ManagedIdentity`,
  `.KeyVault`, `.DBforPostgreSQL`; the RG-scoped deploy principal can't do this itself).

## 1. Bootstrap Azure + GitHub (one time)

Creates the resource group, the GitHub→Azure OIDC federation, and sets the repo secrets/vars.

**PowerShell (recommended on Windows):**
```powershell
./scripts/bootstrap-azure.ps1 -SubscriptionId <your-sub-id>
# if script execution is blocked:
pwsh -ExecutionPolicy Bypass -File ./scripts/bootstrap-azure.ps1 -SubscriptionId <your-sub-id>
```

**Git Bash alternative** (NOT PowerShell's `bash`, which is WSL and can't see gh):
```bash
SUBSCRIPTION_ID=<your-sub-id> "/c/Program Files/Git/bin/bash.exe" scripts/bootstrap-azure.sh
```

Then set the Postgres password (and optionally the Anthropic key):
```
gh secret set POSTGRES_ADMIN_PASSWORD --repo GhiocelAndrei/Vira   # required (strong password)
gh secret set ANTHROPIC_API_KEY        --repo GhiocelAndrei/Vira   # optional (AI features)
```

> The scripts default `-GithubRepo` to `GhiocelAndrei/Vira`. They read the OIDC **subject** from
> GitHub's `sub_claim_prefix` (this repo's is `repo:GhiocelAndrei@105803228/Vira@1320112592`, i.e.
> it embeds immutable owner/repo IDs), so the federated credential matches exactly regardless of
> future renames. If `azure/login` ever fails with `AADSTS700213 No matching federated identity`,
> the credential subject doesn't match the run's `subject claim` (shown in the failed log) — re-run
> the bootstrap or add a credential with that exact subject.

This sets: secrets `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`,
`POSTGRES_ADMIN_PASSWORD`, `ANTHROPIC_API_KEY`; variables `AZURE_RESOURCE_GROUP`, `AZURE_LOCATION`.

## 2. Provision infrastructure (Bicep)

GitHub → **Actions → Deploy Infra → Run workflow**. Provisions Log Analytics, Container Apps
environment, ACR, managed identity, Key Vault, Postgres, and the two Container Apps (with
placeholder images). Re-runnable; run again whenever `infra/main.bicep` changes.

> First run may show the apps as unhealthy — expected, they're still on the placeholder image.
> Step 3 pushes the real images. (If a role-assignment propagation race fails the run, just re-run it.)

## 3. First app deploy

GitHub → **Actions → Deploy Backend → Run**, then **Deploy ai-service → Run**. Each builds the
image in ACR, updates the Container App, and verifies health. After this, every push to `main`
that touches `backend/**` or `ai-service/**` redeploys automatically.

Get the backend URL:
```bash
az containerapp show -n vira-backend -g <rg> --query properties.configuration.ingress.fqdn -o tsv
```

## 4. Frontend on Vercel (npm workspace — build driven by root `vercel.json`)

The web app is a workspace member (`apps/web`) that imports `@vira/core`, so Vercel **must
install from the repo root**, and React 19 requires `--legacy-peer-deps`. The root `vercel.json`
pins all of this (install `--legacy-peer-deps`, `npm run build:web`, output `apps/web/dist`, plus
SPA rewrites), so the import needs **no manual overrides**.

1. Vercel → **Add New → Project** → import `GhiocelAndrei/Vira` (authorize the GitHub app if asked).
2. Leave **Root Directory = repo root** (the default). Vercel reads `vercel.json`.
3. Project name `vira`. No custom domain for now → it serves at `vira-*.vercel.app`.
4. (Later, when the API is wired) add env vars: `VITE_API_BASE_URL` = backend URL, `VITE_FIREBASE_*`.
5. Deploy. Vercel now auto-deploys `main` (production) and gives **every PR a preview URL**.

## The per-change loop

| You do | What happens |
|---|---|
| Open a PR | `ci.yml` builds all 3 services; Vercel posts a frontend preview URL |
| Merge to `main` (backend/ai change) | Image built in ACR → Container App updated → `/health` smoke-tested |
| Merge to `main` (frontend change) | Vercel deploys production |

## ⚠ Cross-origin auth (when login lands)

Vercel (`*.vercel.app`) and Azure (`*.azurecontainerapps.io`) are **different sites**, so the
HttpOnly session cookie (D5) won't be first-party by default. Before wiring auth, either:
- put both behind one registrable domain (`app.vira.com` + `api.vira.com`, cookie `Domain=.vira.com`, `SameSite=Lax`), **or**
- set the cookie `SameSite=None; Secure` and pin credentialed CORS to the exact Vercel origin.

## Teardown

```bash
az group delete -n <rg> --yes --no-wait   # removes all Azure resources
```
