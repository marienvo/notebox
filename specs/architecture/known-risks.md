# Notebox: Known Risks and Mitigations

## 1) SAF library compatibility with New Architecture (High)

Risk:

- `react-native-saf-x` is a Paper (old-arch) module. Since RN 0.82, `newArchEnabled` in `gradle.properties` is ignored and New Architecture is always active in this project (RN 0.84). The obsolete property was removed to avoid misleading configuration.
- However, RN 0.84's interop layer has allowed `react-native-saf-x` to load successfully so far (no `TurboModuleInteropUtils$ParsingException` observed for it). This should be validated before relying on it in production.

Mitigation:

- Validate SAF read/write on a real device before shipping.
- If `react-native-saf-x` fails under the interop layer in a future RN upgrade, evaluate a fork or replacement (e.g., `expo-file-system` with bare workflow, or a custom native module).
- Before any RN version bump, explicitly test file-picker and read/write flows on a physical Android device.

## 2) URI handling assumptions (High)

Risk:

- Incorrect URI composition for nested files can break create/read/write.

Mitigation:

- Keep URI joining logic centralized in `noteboxStorage.ts`.
- Validate by creating `.notebox/settings.json` and reading it back in one flow test.
- Avoid ad-hoc URI string manipulation across screens.

## 3) Persisted permission may disappear (Medium)

Risk:

- User clears app data, changes storage state, or OS revokes permission.

Mitigation:

- On launch, always re-check `hasPermission(savedUri)`.
- If invalid, clear saved URI and route to setup with clear message.

## 4) OEM picker differences (Medium)

Risk:

- Some devices (Samsung/Xiaomi/etc.) behave differently in folder picker UI.

Mitigation:

- Test on your target physical phone early.
- Keep setup interaction minimal: one button, straightforward error text.

## 5) Dot folder visibility confusion (Low)

Risk:

- User may not see `.notebox` in some file managers and think it was not created.

Mitigation:

- Mention hidden-folder behavior in README.
- Rely on in-app read/write confirmation as ground truth.

## 6) react-native-track-player incompatible with New Architecture (High — active blocker)

Risk:

- `react-native-track-player@4.1.2` crashes the app on startup when running under RN 0.84 with New Architecture enabled.
- Root cause (confirmed via logcat): the TurboModule interop layer fails to parse `@ReactMethod` annotations because the module has synchronous methods with non-void return types. This violates the TurboModule contract: `TurboModule system assumes returnType == void iff the method is synchronous`.
- The crash produces `SIGABRT` before any UI renders.

Mitigation (active):

- `react-native-track-player` is intentionally **not imported anywhere in the JS bundle**.
- The npm package remains installed for future use, but all JS imports and `registerPlaybackService` calls have been removed from `index.js` and `PodcastsScreen.tsx`.
- The Podcasts tab shows a static placeholder until a New Architecture-compatible version is available.

Required before re-integrating:

- Verify that the new version of `react-native-track-player` ships a proper TurboModule spec and passes `TurboModuleInteropUtils` parsing.
- Test on a physical device before adding any player UI.
