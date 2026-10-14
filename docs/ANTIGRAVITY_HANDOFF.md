# Antigravity Handoff — SaveState

Continue from the current branch and inspect the repository before editing. The existing Android UX and integration work on this branch is intentional; preserve it.

## Current checkpoint

- The Android assistant now calls the anonymous Kilo AI Gateway directly with `openrouter/free` for text and optional images. No API key is embedded in the app.
- The existing shared game-focused prompt, spoiler levels, and image prompt-injection rules are reused.
- Only the final assistant `message.content` is shown. Ignore provider reasoning fields.
- Kilo is enabled by default. `EXPO_PUBLIC_KILO_ASSISTANT_ENABLED=false` returns to the existing Cloudflare Worker/Gemini route. Do not silently fall back to that route when Kilo is rate-limited.
- The chat displays a disclosure that text and images are sent to Kilo and its routed model.
- Unit tests cover text, image payloads, routing, Worker opt-out, hidden reasoning, and rate-limit errors.

## Next work

1. Build a **preview APK** from this branch using the Android Build GitHub Actions workflow; do not build a production AAB or publish to Google Play.
2. Install it on a physical Android device and visually inspect the assistant screen, keyboard, bottom navigation/system insets, image preview, and error states.
3. Test a text question and a game screenshot. Also verify the UI remains usable when the provider returns HTTP 429 or the phone is offline.
4. Fix concrete issues found in those checks, keeping changes incremental and preserving offline-first game backlog features.
5. Run `pnpm test`, `pnpm typecheck`, `npx expo-doctor`, and `npx expo export --platform android` from the appropriate workspace before reporting results.

Do not deploy Cloudflare Workers, alter production secrets, merge into `master`, or publish a store release as part of this handoff.
