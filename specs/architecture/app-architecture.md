# Notebox MVP: Architecture

## Application shape

Keep architecture intentionally small and explicit:

- `App.tsx` bootstraps initial route resolution and renders the root navigator.
- `RootStack` gates onboarding (`Setup`) vs. app shell (`MainTabs`).
- `MainTabs` hosts five feature stacks: Inbox, Podcasts, Home, Vault, Settings.
- `VaultProvider` stores selected SAF URI and current settings for all features.
- `core/storage/noteboxStorage.ts` owns all SAF note and settings operations.

This keeps business logic near features while keeping device/storage logic centralized.

## App flow

```text
App launch
  -> read "notesDirectoryUri" from AsyncStorage
    -> missing: SetupScreen
    -> present: hasPermission(uri)?
        -> false: SetupScreen
        -> true: load MainTabs + hydrate VaultProvider
```

```text
SetupScreen
  -> Choose Notes Directory
  -> openDocumentTree(true)
  -> save URI in AsyncStorage
  -> init .notebox/settings.json
  -> set VaultProvider session
  -> navigate MainTabs (Home tab)
```

```text
InboxScreen
  -> capture title + content
  -> create .md note through core/storage
  -> create note in selected directory's /Inbox folder
  -> auto-create /Inbox when missing
  -> note appears in Vault (Inbox folder view) on refresh
```

```text
VaultScreen
  -> show one folder context (hardcoded: Inbox)
  -> list markdown files in selected SAF directory's /Inbox folder
  -> open NoteDetailScreen to render markdown
```

```text
SettingsScreen
  -> edit display name in .notebox/settings.json
  -> optional "Change directory" clears URI and routes to Setup
```

## Navigation topology

```text
RootStack
├── Setup
└── MainTabs
    ├── InboxStack -> Inbox
    ├── PodcastsStack -> Podcasts
    ├── HomeStack -> Home
    ├── VaultStack -> Vault, NoteDetail
    └── SettingsStack -> Settings
```

## Source layout (feature-first)

```text
src/
├── core/
│   ├── bootstrap/resolveInitialRoute.ts
│   ├── storage/
│   │   ├── appStorage.ts
│   │   ├── keys.ts
│   │   └── noteboxStorage.ts
│   └── vault/VaultContext.tsx
├── features/
│   ├── setup/screens/SetupScreen.tsx
│   ├── home/screens/HomeScreen.tsx
│   ├── inbox/screens/InboxScreen.tsx
│   ├── podcasts/
│   │   ├── screens/PodcastsScreen.tsx
│   │   └── services/playbackService.ts
│   ├── vault/
│   │   ├── hooks/useNotes.ts
│   │   └── screens/{VaultScreen,NoteDetailScreen}.tsx
│   └── settings/
│       ├── hooks/useSettings.ts
│       └── screens/SettingsScreen.tsx
├── navigation/
│   ├── MainTabNavigator.tsx
│   ├── RootNavigator.tsx
│   └── types.ts
└── types.ts
```

## Android directory ownership model

- The selected Notes directory is user-owned external/shared storage.
- App-owned settings live in `/.notebox/settings.json` under that directory.
- Notes are `.md` files in the selected directory's `/Inbox` folder and are the source of truth.
- App sandbox storage (AsyncStorage) stores only `notesDirectoryUri`.

This matches your requirement: after setup, app settings/state live inside the selected Notes directory dot folder whenever possible.
