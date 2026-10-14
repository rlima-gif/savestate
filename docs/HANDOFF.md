# SaveState — Current Engineering Handoff

## Current branch and scope

- Repository: `https://github.com/rlima-gif/savestate`.
- Work is based on the Antigravity feature branch at commit `1b55ffe` (`codex/savestate-redesign`).
- This pass fixes the catalog search flow and replaces the RAWG-only backend adapter with IGDB/Twitch server-to-server integration.
- Preserve offline-first library data and all existing Kilo assistant, Android UX, and Steam/RetroAchievements work.
- Do not merge to `master`, deploy production, or publish to Google Play as part of catalog setup.

## Catalog design

- Mobile client calls `GET /api/catalog/search` and `GET /api/catalog/games/:id` on the SaveState Worker.
- Worker authenticates with Twitch app credentials and calls IGDB. No provider credentials or access tokens are included in the APK, Expo public variables, API responses, or logs.
- Search responses are cached in D1 for 6 hours; game details are cached for 7 days. An app token cache in D1 is private to the Worker and lets isolates reuse the same token.
- A single atomic D1 counter caps provider requests at 3 per second, below the documented IGDB ceiling of 4 per second.
- Cached results remain available when the provider is temporarily unavailable. The mobile screen reports stale/unavailable status and provides retry and manual-add actions.
- Manual game creation, library, backlog, notes, and progress remain available without any network or catalog configuration.
- The app shows a permanent IGDB attribution link on the catalog screen.

## Owner setup still required

1. Register a Twitch developer application and obtain `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET`.
2. Ask IGDB about commercial partnership and confirm permitted use of catalog metadata and cover images before monetizing or publicly distributing the app. Their API documentation states that commercial products require partnership contact and visible attribution.
3. Store the credentials as Cloudflare Worker secrets for staging. GitHub Actions can sync them when `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` are configured as repository Actions secrets. Users of the app do not need Twitch/IGDB accounts or keys.
4. Apply D1 migrations and deploy staging, then test `/health`, a live title search, and game details. Deployment was not run during this code pass.
5. Configure production D1 IDs/secrets and complete the commercial approval before preparing a Play Store release.

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the exact commands and GitHub secret names.

## Validation commands

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm --filter @savestate/shared build
pnpm -r typecheck
pnpm test
(cd apps/api && npx wrangler d1 migrations apply savestate-db --local)
(cd apps/mobile && npx expo-doctor)
(cd apps/mobile && npx expo export --platform android)
```

Manual Android QA must cover launching search from the Library while the keyboard is open, repeated searches for the same and different titles, slow/offline requests, provider errors, empty results, result covers, adding a title, and manual creation. No device UI test has been run in this pass.
