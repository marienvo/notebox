# Observability Phase 1 slice — deferred follow-ups

This document tracks work **intentionally not done** in the minimal Phase 1 implementation (Sentry backbone, globals, wrapper, ring buffer, nav + vault breadcrumbs, selective non-fatal, scrubbing).

## Deferred to later Phase 1 / Phase 2

- **Sentry wizard / full native pipeline:** If not run, run `npx @sentry/wizard@latest -i reactNative --saas --org personal-133 --project react-native` and commit generated native/Gradle/Xcode changes. Current slice adds Gradle `sentry.gradle` manually; verify iOS `pod install` and any Metro serializer hooks the wizard adds.
- **Source maps / Hermes debug files:** Configure `SENTRY_AUTH_TOKEN` in CI for release builds; verify symbolicated stacks in production.
- **`sentry.properties` auth token:** Add locally or via CI only; do not commit secrets.
- **React Navigation Sentry integration:** Manual `onStateChange` breadcrumbs were used to avoid automatic navigation transactions; revisit if you want official `reactNavigationIntegration` with `tracesSampleRate: 0` only.
- **Bootstrap breadcrumbs** in `App.tsx` / `resolveInitialRoute`: omitted in minimal slice; add if more context is needed before `VaultProvider` mounts.
- **Podcasts, RSS, audio, markdown screens:** Out of scope for this slice.
- **Kotlin `VaultListingModule`:** No native Sentry calls in this slice.
- **Ring buffer → Sentry attach:** Rate limit and payload format may need tuning once traffic is visible.

## Operational notes

- **DSN:** Lives in `src/core/observability/sentryDsn.ts` (client DSN). Rotate in Sentry if leaked.
- **Empty DSN:** If removed, Sentry init is skipped (useful for forks).
