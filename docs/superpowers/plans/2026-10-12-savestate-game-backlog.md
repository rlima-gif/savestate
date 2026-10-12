# SaveState — Android Game Backlog App & Game-Focused Assistant Implementation Plan

> **For agentic workers:** Executing this plan inline task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, production-ready native Android game backlog application with offline-first SQLite persistence, Brazilian Portuguese UI, and a dedicated text-and-vision game assistant backed by Cloudflare Workers and Google Gemini API.

**Architecture:** Monorepo with `packages/shared` (domain schemas, recommendation engine, import/export normalization, prompt engineering), `apps/api` (Cloudflare Workers, Hono, D1 database, IGDB/RAWG catalog adapter, Gemini vision orchestrator with quota and rate limit protection), and `apps/mobile` (React Native, Expo Router, offline-first SQLite, camera/crop assistant, Brazilian Portuguese UI, Play Store ready).

**Tech Stack:** React Native, Expo SDK 52+, Expo Router, TypeScript, Expo SQLite, Cloudflare Workers, Hono, Cloudflare D1, Google Gemini 3.5 Flash-Lite / 3.8 Flash, RAWG / IGDB API, Vitest.

---

## 1. Planned Project File Structure

```
savestate/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .gitignore
├── .env.example
├── README.md
├── AGENTS.md
├── CHANGELOG.md
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Lint, Typecheck, Unit Tests, Migrations
│       ├── build-android.yml      # Preview APK and Production AAB Gradle build
│       └── deploy-api.yml         # Cloudflare Workers CI deploy
├── packages/
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts
│       │   ├── types/
│       │   │   ├── game.ts        # Canonical game, Owned copy, Playthrough, Session
│       │   │   ├── checklist.ts   # Personal checklists, missables, points of no return
│       │   │   ├── device.ts      # Device & configuration records (PC, Deck, handheld)
│       │   │   ├── assistant.ts   # Assistant messages, prompt context, spoiler levels
│       │   │   └── catalog.ts     # Normalized catalog results, search params
│       │   ├── schemas/           # Zod validation schemas
│       │   ├── recommendations/   # Rule-based next-game scoring engine
│       │   ├── import-export/     # JSON/CSV import/export translators, Steam/RetroAchievements
│       │   └── assistant/         # PT-BR system prompts, contextual hint tiers
│       └── tests/
│           ├── recommendations.test.ts
│           ├── import-export.test.ts
│           └── schemas.test.ts
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── wrangler.jsonc         # D1 database bindings, env vars, staging/prod
│   │   ├── migrations/
│   │   │   └── 0001_init.sql      # D1 tables: rate_limits, cached_catalog, sync_logs
│   │   ├── src/
│   │   │   ├── index.ts           # Hono app entry point, CORS, routes
│   │   │   ├── routes/
│   │   │   │   ├── health.ts      # GET /health
│   │   │   │   ├── catalog.ts     # GET /api/catalog/search, /api/catalog/games/:id
│   │   │   │   ├── assistant.ts   # POST /api/assistant/chat (multimodal Gemini)
│   │   │   │   └── guides.ts      # GET /api/guides/search (walkthrough & video links)
│   │   │   ├── services/
│   │   │   │   ├── gemini.ts      # Gemini API client, image processing, fallback handling
│   │   │   │   ├── catalog.ts     # RAWG / IGDB adapter with mock fallback
│   │   │   │   └── rate-limit.ts  # Abuse guard, per-IP rate limiting
│   │   │   └── types.ts
│   │   └── tests/
│   │       ├── health.test.ts
│   │       ├── catalog.test.ts
│   │       └── assistant.test.ts
│   └── mobile/
│       ├── package.json
│       ├── app.json               # Expo & Android configuration, package names, permissions
│       ├── eas.json               # EAS build profiles: development, preview APK, production AAB
│       ├── tsconfig.json
│       ├── src/
│       │   ├── app/               # Expo Router layout & screens
│       │   │   ├── _layout.tsx
│       │   │   ├── (tabs)/
│       │   │   │   ├── _layout.tsx
│       │   │   │   ├── index.tsx         # Biblioteca (Library)
│       │   │   │   ├── jogando.tsx       # Jogando (Continue Playing, Timer, Checklist)
│       │   │   │   ├── descobrir.tsx     # Descobrir (Catalog Search, Recommendations)
│       │   │   │   ├── assistente.tsx    # Assistente (Vision & Text Game Assistant)
│       │   │   │   └── ajustes.tsx       # Ajustes (Settings, Stats, Import/Export, Devices)
│       │   │   ├── game/[id].tsx         # Game details & playthrough creation
│       │   │   ├── playthrough/[id].tsx  # Playthrough management & session notes
│       │   │   └── modal/
│       │   │       ├── add-game.tsx      # Manual game creation
│       │   │       └── session-edit.tsx  # Session manual time & notes
│       │   ├── db/
│       │   │   ├── client.ts             # expo-sqlite connection & migration runner
│       │   │   ├── schema.ts             # SQLite tables definition
│       │   │   └── repositories/         # GameRepo, PlaythroughRepo, SessionRepo, etc.
│       │   ├── services/
│       │   │   ├── timer.ts              # Resilient timestamp-based session timer
│       │   │   ├── backup.ts             # JSON/CSV file generation & restoration
│       │   │   ├── api.ts                # Client API for Cloudflare Workers
│       │   │   └── image-picker.ts       # Camera & media handling, crop, resize
│       │   ├── theme/
│       │   │   └── colors.ts             # Warm gamer dark & light theme tokens
│       │   └── components/
│       └── tests/
│           ├── timer.test.ts
│           └── backup.test.ts
└── docs/
    ├── ARCHITECTURE.md
    ├── TESTING.md
    ├── DEPLOYMENT.md
    ├── PLAY_STORE.md
    ├── AI_ASSISTANT.md
    └── HANDOFF.md
```

---

## 2. Implementation Steps

1. **Monorepo & Shared Package Setup:**
   - Configure pnpm workspace, root scripts, shared TypeScript build.
   - Implement domain entities, types, and Zod schemas in `packages/shared`.
   - Implement rule-based recommendation engine (priority, duration, genre, ownership, session suitability).
   - Implement backup & restore translators (JSON, CSV, Steam, RetroAchievements).
   - Unit test shared packages with Vitest.

2. **Cloudflare Workers API (`apps/api`):**
   - Hono server with CORS, health check endpoint (`/health`).
   - D1 SQLite database migration for rate limits and catalog caching.
   - Catalog service: RAWG & IGDB provider adapters with local mock fallback for offline/test mode.
   - Gemini multimodal assistant endpoint with Portuguese prompt engineering, rate limiter, image validation, and quota exhaustion fallback.
   - Unit and integration tests for API endpoints.

3. **Offline-First SQLite Layer (`apps/mobile`):**
   - Expo SQLite schema migration with foreign keys and indexes.
   - Typed repositories for Games, Owned Copies, Playthroughs, Sessions, Checklists, Device Records, and Next-Game Queue.
   - Session timer with backgrounding/restart recovery (saving start timestamp to SQLite).
   - JSON/CSV export and import with duplicate resolution.

4. **Brazilian Portuguese Mobile UI & Expo Router Screens (`apps/mobile`):**
   - High-contrast warm gamer theme (neutral darks `#121214`, terracotta `#FF5533`, amber `#F5A623`, slate `#94A3B8`).
   - Tab 1: **Biblioteca** (Backlog, Jogando, Pausado, Zerado, 100%, Abandonado, filters, search, grid/list view).
   - Tab 2: **Jogando** ("Continuar jogando", active timer, chapter, next objective, note to future self, checklists).
   - Tab 3: **Descobrir** (Catalog search, smart recommendations shortlist with clear reasons, queue).
   - Tab 4: **Assistente** (Multimodal chat, camera capture, crop/preview, progressive hint levels: pequena dica, dica detalhada, solução completa).
   - Tab 5: **Ajustes** (Statistics, devices, backup/restore, external sync, privacy policy & terms).
   - Modals: Manual Game Form, Playthrough Form, Session Editor.

5. **CI/CD & Android Release Configuration:**
   - Configure `apps/mobile/app.json`: application ID `com.savestate.app`, preview ID `com.savestate.app.preview`, permissions, adaptive icon.
   - Configure `apps/mobile/eas.json` for development, preview APK, and production AAB.
   - GitHub Actions workflow for lint, test, typecheck, D1 migration check, and Android Gradle build.

6. **Documentation & Play Store Materials:**
   - Architecture, testing, deployment, Play Store preparation (declarations, data safety, privacy policy, store descriptions).

---

## 3. Meaningful Tests

- Shared package:
  - Recommendation engine scoring logic (priority weighting, unplayed preference, session duration fit).
  - Backup serialization and deserialization roundtrip.
  - Zod validation on malformed inputs and Steam/RetroAchievements schemas.
- API service:
  - Health check returns status OK and timestamp.
  - Catalog query normalization and mock fallback behavior.
  - Assistant endpoint validation (image size limit, rate limiting, quota exhaustion fallback response).
- Mobile services:
  - Session timer calculation across simulated app suspensions.
  - JSON and CSV export/import integrity.

---

## 4. Exact Validation Commands

- Root checks:
  - `pnpm test`
  - `pnpm typecheck`
  - `pnpm lint`
- API local dev & tests:
  - `pnpm --filter @savestate/api test`
  - `pnpm --filter @savestate/api typecheck`
- Mobile checks:
  - `pnpm --filter @savestate/mobile test`
  - `pnpm --filter @savestate/mobile typecheck`
- Worker migration validation:
  - `pnpm --filter @savestate/api wrangler d1 migrations apply savestate-db --local`

---

## 5. External Services and Credentials

- **Google Gemini API:** `GEMINI_API_KEY` (Free tier eligible, model `gemini-3.5-flash-lite` or `gemini-3.8-flash`). Fallback graceful responses when not configured.
- **RAWG / IGDB Catalog API:** `RAWG_API_KEY` or `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET`. Mock catalog fallback provided when keys are unset.
- **Cloudflare Workers & D1:** `wrangler.jsonc` configured for local execution and workers.dev deployment.
- **Expo / Google Play:** `eas.json` configured for local or EAS cloud builds, target SDK 35 (Android 15), 16KB page-size alignment compatible.
