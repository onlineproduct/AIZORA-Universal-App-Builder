# AIZORA-Universal-App-Builder

AIZORA Universal App Builder — Build, edit, and manage Android apps with AI assistance, manual coding, visual design, and automated APK builds using GitHub Actions.

## Visual Designer → APK

1. Open **Visual Designer** and select a project from **My Projects**.
2. Generate/save Flutter code, then use **Upload Project & Build APK**.
3. Configure the secure GitHub Upload Bridge once as described in [the Worker setup guide](workers/github-upload-bridge/README.md).
4. Connect through GitHub Device Flow. The OAuth token stays in the open Designer page's memory; it is not persisted in browser storage.
5. The Worker verifies the approved GitHub account and uses a repository-scoped GitHub App installation token to commit the project under `projects/<slug>/flutter/` on `main`.
6. The existing GitHub Actions workflow starts on push. Download the APK from the successful run's Artifacts.

The **Prepare APK Build ZIP** option remains available as a manual fallback when the Worker has not been deployed.

## Important boundaries

- The secure upload bridge source is included in `workers/github-upload-bridge/`, but it is **not deployed automatically**. GitHub App/OAuth App and Cloudflare Worker configuration is a one-time owner setup.
- The GitHub App should be installed only on this repository and granted Contents read/write permission.
- The Worker restricts uploads to the configured GitHub login and the `projects/<slug>/flutter/` directory; private-key-like files are rejected.
- A successful upload starts an APK workflow; it does not mean the APK build or phone installation has already succeeded.
- Designer project data remains in the user's browser IndexedDB until uploaded; export/backup is still recommended.

## APK workflow

See [Build Generated Project APK](.github/workflows/build-flutter-project.yml) for workflow details.
