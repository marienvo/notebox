import {NoteboxSettings} from '../types';

export type MockNoteSeed = {
  content: string;
  name: string;
};

export const DEV_MOCK_VAULT_URI = '__dev_mock_vault__';

export const MOCK_SETTINGS: NoteboxSettings = {
  displayName: 'Dev Notebox',
};

export const MOCK_NOTES: MockNoteSeed[] = [
  {
    name: 'welcome.md',
    content: `# Welcome to Dev Notebox

This is a mock note loaded in emulator builds.

- Edit me to test note saving.
- Create new notes from the Vault tab.
- Settings are persisted to the mock vault.
`,
  },
  {
    name: 'daily-log.md',
    content: `# Daily Log

## 2026-03-21

- Checked inbox
- Reviewed podcasts
- Captured project notes
`,
  },
  {
    name: 'project-ideas.md',
    content: `# Project Ideas

1. Add search across notes
2. Add pinning favorite notes
3. Add markdown templates
`,
  },
];
