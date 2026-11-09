# AIZORA GitHub Upload Bridge

A small Cloudflare Worker that lets the AIZORA Universal App Builder send a selected Flutter project to this repository and start the existing APK workflow.

## Security model

- The browser signs in through GitHub OAuth Device Flow. It never asks the user to paste a PAT.
- The OAuth access token is kept only in the open Designer page's memory. It is not written to localStorage or IndexedDB; closing or refreshing the tab requires GitHub Device Flow sign-in again.
- The Worker checks the signed-in GitHub login against `ALLOWED_GITHUB_LOGIN`.
- A GitHub App installation token is minted server-side from the App private key stored as a Cloudflare Worker secret.
- The App installation should have **Contents: Read and write** permission on this repository only.
- Uploads are restricted to `projects/<slug>/flutter/**` on `main`. The worker validates paths and requires `pubspec.yaml` and `lib/main.dart`.
- Request limit: 200 files / 50 MiB total. GitHub Actions then builds the APK from the committed source.
- Disconnect clears the in-memory token.

## One-time setup

1. Create a **GitHub App** under the repository owner. Set repository access to only `AIZORA-Universal-App-Builder`, grant **Contents: Read and write**, install it on this repository, and record the App ID, installation ID, and private key PEM.
2. Create a GitHub **OAuth App** for Builder sign-in, enable **Device Flow**, and record its Client ID.
3. In this repository, open **Settings → Secrets and variables → Actions → New repository secret**. Add these secrets:

   | Secret name | Value |
   | --- | --- |
   | `CLOUDFLARE_API_TOKEN` | Cloudflare API token authorized to deploy Workers |
   | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
   | `CF_WORKER_APP_ORIGIN` | Exact deployed Builder origin, e.g. `https://builder.example.com` (no path) |
   | `CF_ALLOWED_GITHUB_LOGIN` | Exact GitHub login allowed to upload |
   | `CF_GITHUB_OAUTH_CLIENT_ID` | OAuth App Client ID |
   | `CF_GITHUB_APP_ID` | GitHub App ID |
   | `CF_GITHUB_INSTALLATION_ID` | GitHub App installation ID for this repository |
   | `CF_GITHUB_APP_PRIVATE_KEY` | Full GitHub App private key PEM |

   Create the Cloudflare API token with the permissions needed to edit/deploy Workers for this account. Keep all values in GitHub Secrets; never commit them or paste them into ChatGPT.

4. Run **Actions → Deploy GitHub Upload Bridge → Run workflow**. The workflow installs Wrangler, stores the private key as a Worker secret, and deploys the Worker with the other account-specific settings.
5. After a successful deployment, set the Worker URL in the Builder's GitHub connection settings and use **Connect GitHub**. Complete the GitHub Device Flow approval.

The workflow also runs automatically when files under `workers/github-upload-bridge/**` or the deployment workflow change on `main`. It is not possible to deploy until all eight repository secrets above are configured.

## Manual deployment alternative

From this folder:

```sh
npm install -g wrangler
wrangler login
wrangler secret put GITHUB_APP_PRIVATE_KEY
wrangler deploy
```

If deploying manually, set the values in `wrangler.toml` first. Paste the PEM only into the Wrangler terminal prompt. Never put it in source files or the repository.

## Endpoints

- `GET /health`
- `POST /auth/device-code`
- `POST /auth/access-token` with `{ "device_code": "..." }`
- `POST /auth/logout`
- `POST /api/projects/:slug/upload` with an `Authorization: Bearer <GitHub OAuth token>` header and `{ "files": [{ "path": "pubspec.yaml", "contentBase64": "..." }] }`

Successful upload returns the commit SHA, project directory, and GitHub Actions URL.

## Important

The Worker is source code until the deployment workflow succeeds. The App ID, OAuth Client ID, installation ID, allowed login, origin, Cloudflare account ID and tokens are account-specific; no secret or account identifier is guessed. Keep the App private key only in GitHub Actions Secrets and Cloudflare Worker Secrets.
