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

## One-time setup required

This repository change prepares the Worker source. It does not deploy a Worker or create GitHub Apps on the account owner's behalf. Finish these one-time steps:

1. Create a **GitHub App** under the repository owner. Set its repository access to only `AIZORA-Universal-App-Builder`, grant **Contents: Read and write**, and install it on this repository. Record the App ID, installation ID, and download its private key PEM.
2. Create a GitHub **OAuth App** for the Builder sign-in. Enable **Device Flow**. Its callback URL is not used by Device Flow. Record its Client ID.
3. Install Wrangler and deploy from this folder:
   ```sh
   npm install -g wrangler
   wrangler login
   wrangler deploy
   ```
4. Before deploying, edit `wrangler.toml`:
   - `APP_ORIGIN`: exact origin of the deployed Builder (scheme + host only, no path).
   - `ALLOWED_GITHUB_LOGIN`: the GitHub login allowed to upload.
   - `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_APP_ID`, `GITHUB_INSTALLATION_ID`: values from the two GitHub Apps.
5. Add the App private key as a Worker secret (do not commit it):
   ```sh
   wrangler secret put GITHUB_APP_PRIVATE_KEY
   ```
   Paste the PEM only into the Wrangler terminal prompt. Never paste it into ChatGPT, source files, or the repository.
6. Deploy again:
   ```sh
   wrangler deploy
   ```
7. Set the Worker URL in the Builder's GitHub connection settings and use **Connect GitHub**. Complete the one-time GitHub Device Flow approval. The OAuth access token remains in page memory only; it is not persisted to browser storage.

## Endpoints

- `GET /health`
- `POST /auth/device-code`
- `POST /auth/access-token` with `{ "device_code": "..." }`
- `POST /auth/logout`
- `POST /api/projects/:slug/upload` with an `Authorization: Bearer <GitHub OAuth token>` header and `{ "files": [{ "path": "pubspec.yaml", "contentBase64": "..." }] }`

Successful upload returns the commit SHA, project directory, and GitHub Actions URL.

## Important

The Worker must be deployed before the Builder can upload. The App ID, OAuth Client ID, installation ID, allowed login, and origin are account-specific configuration; no secret or account identifier is guessed here. Keep the App private key only in Cloudflare Worker Secrets.
