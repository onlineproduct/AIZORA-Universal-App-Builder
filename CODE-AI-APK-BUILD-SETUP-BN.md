# AIZORA Universal App Builder — Code AI & APK Build setup

This branch adds the Code AI interface and an API integration scaffold. It does **not** become live until the Worker is deployed, required secrets are configured, and the workflow is present on the repository's default branch.

## 1. Cloudflare Worker

1. Create an R2 bucket named `aizora-universal-builder-builds`.
2. Deploy `backend/worker.js` as a Cloudflare Worker. The included `wrangler.toml` is a starting configuration.
3. Set Worker secrets:
   - `APP_ACCESS_CODE`: a long, random access code that you choose.
   - `AI_API_KEY`: your AI provider API key (keep this only as a Worker secret; never place it in the website or APK).
   - `GITHUB_TOKEN`: a fine-grained GitHub token for `onlineproduct/AIZORA-Universal-App-Builder` with Actions read/write permission.
   - `BUILD_DOWNLOAD_TOKEN`: a different long random secret used only for Actions-to-Worker source downloads.
4. Set Worker variables:
   - `ALLOWED_ORIGIN=https://onlineproduct.github.io`
   - `GITHUB_REPO=onlineproduct/AIZORA-Universal-App-Builder`
   - `BUILD_REF=main` (the default branch after the workflow has been merged)
   - Optional: `AI_MODEL=gpt-4o-mini`, `AI_API_URL=https://api.openai.com/v1/chat/completions`
5. Bind the R2 bucket to the Worker as `BUILDS`.

## 2. GitHub Actions secrets

In the repository's Settings → Secrets and variables → Actions, add:
- `AIZORA_BUILD_API_URL`: the deployed Worker base URL, without a trailing slash.
- `AIZORA_BUILD_DOWNLOAD_TOKEN`: exactly the same value as Worker secret `BUILD_DOWNLOAD_TOKEN`.

The Worker also needs `GITHUB_TOKEN` to dispatch the workflow.

## 3. Important workflow limitation

GitHub's `workflow_dispatch` API requires the workflow file to exist on the repository's default branch. Keep all changes isolated on this feature branch until reviewed. Once ready, open a pull request and merge the workflow file to the default branch; only then can the Worker dispatch `build-user-apk.yml` on `main`. Do not change the live site or merge without reviewing the diff first.

## 4. Using the features

- Open the hosted Builder, open a project, and set the Worker URL plus App Access Code in Code AI.
- Code AI supports Generate, Edit, and Fix modes. The Worker holds the AI API key; it is never sent to the browser.
- APK Build sends the project's source files (excluding the APK output folder) to the Worker, which temporarily stores the ZIP in private R2 and dispatches GitHub Actions.
- Only a complete Android Gradle project can produce an APK. A generic website project will fail the Android build.
- Download successful build artifacts from the workflow run's Artifacts section.

## Security and current status

This is a setup scaffold, not a claim that a deployed AI backend or successful user-project APK build already exists. Protect the access code, restrict the GitHub token to the intended repository, and periodically delete old R2 build objects. The simple shared access-code check is not a replacement for rate limiting or user accounts in a public production service.
