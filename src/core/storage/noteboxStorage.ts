import {
  exists,
  listFiles,
  mkdir,
  readFile,
  writeFile,
} from 'react-native-saf-x';

import {NoteDetail, NoteSummary, NoteboxSettings} from '../../types';

const NOTEBOX_DIRECTORY_NAME = '.notebox';
const INBOX_DIRECTORY_NAME = 'Inbox';
const SETTINGS_FILE_NAME = 'settings.json';
const MARKDOWN_EXTENSION = '.md';

const defaultSettings: NoteboxSettings = {
  displayName: 'My Notebox',
};
const isDevMockVaultEnabled =
  __DEV__ &&
  !(globalThis as {process?: {env?: Record<string, string | undefined>}}).process
    ?.env?.JEST_WORKER_ID;

function getDevStorage() {
  return require('../../dev/devStorage') as typeof import('../../dev/devStorage');
}

function getNoteboxDirectoryUri(baseUri: string): string {
  return `${baseUri}/${NOTEBOX_DIRECTORY_NAME}`;
}

function getSettingsUri(baseUri: string): string {
  return `${getNoteboxDirectoryUri(baseUri)}/${SETTINGS_FILE_NAME}`;
}

function getInboxDirectoryUri(baseUri: string): string {
  return `${baseUri}/${INBOX_DIRECTORY_NAME}`;
}

function normalizeBaseUri(baseUri: string): string {
  const normalizedUri = baseUri.trim();

  if (!normalizedUri) {
    throw new Error('Base URI cannot be empty.');
  }

  return normalizedUri;
}

function normalizeNoteUri(noteUri: string): string {
  const normalizedUri = noteUri.trim();

  if (!normalizedUri) {
    throw new Error('Note URI cannot be empty.');
  }

  return normalizedUri;
}

function serializeSettings(settings: NoteboxSettings): string {
  return `${JSON.stringify(settings, null, 2)}\n`;
}

function sanitizeFileName(rawName: string): string {
  const normalized = rawName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_ ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');

  return normalized || `note-${Date.now()}`;
}

function titleFromNoteName(fileName: string): string {
  const baseName = fileName.endsWith(MARKDOWN_EXTENSION)
    ? fileName.slice(0, -MARKDOWN_EXTENSION.length)
    : fileName;

  return baseName.replace(/[-_]+/g, ' ').trim() || 'Untitled note';
}

type SafDocumentFile = {
  lastModified?: number | null;
  name?: string;
  type?: 'directory' | 'file' | string;
  uri: string;
};

function parseSettings(rawSettings: string): NoteboxSettings {
  const parsed = JSON.parse(rawSettings) as Partial<NoteboxSettings>;

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof parsed.displayName !== 'string'
  ) {
    throw new Error('settings.json has an invalid structure.');
  }

  return {displayName: parsed.displayName};
}

export async function initNotebox(baseUri: string): Promise<void> {
  if (isDevMockVaultEnabled) {
    const devStorage = getDevStorage();
    await devStorage.initNotebox(baseUri);
    return;
  }

  const normalizedBaseUri = normalizeBaseUri(baseUri);
  const noteboxDirectoryUri = getNoteboxDirectoryUri(normalizedBaseUri);
  const settingsUri = getSettingsUri(normalizedBaseUri);

  if (!(await exists(noteboxDirectoryUri))) {
    await mkdir(noteboxDirectoryUri);
  }

  if (!(await exists(settingsUri))) {
    await writeFile(settingsUri, serializeSettings(defaultSettings), {
      encoding: 'utf8',
      mimeType: 'application/json',
    });
  }
}

export async function readSettings(baseUri: string): Promise<NoteboxSettings> {
  if (isDevMockVaultEnabled) {
    const devStorage = getDevStorage();
    return devStorage.readSettings(baseUri);
  }

  const normalizedBaseUri = normalizeBaseUri(baseUri);
  const settingsUri = getSettingsUri(normalizedBaseUri);
  const rawSettings = await readFile(settingsUri, {encoding: 'utf8'});

  return parseSettings(rawSettings);
}

export async function writeSettings(
  baseUri: string,
  settings: NoteboxSettings,
): Promise<void> {
  if (isDevMockVaultEnabled) {
    const devStorage = getDevStorage();
    await devStorage.writeSettings(baseUri, settings);
    return;
  }

  const normalizedBaseUri = normalizeBaseUri(baseUri);
  const settingsUri = getSettingsUri(normalizedBaseUri);

  await writeFile(settingsUri, serializeSettings(settings), {
    encoding: 'utf8',
    mimeType: 'application/json',
  });
}

export async function listNotes(baseUri: string): Promise<NoteSummary[]> {
  if (isDevMockVaultEnabled) {
    const devStorage = getDevStorage();
    return devStorage.listNotes(baseUri);
  }

  const normalizedBaseUri = normalizeBaseUri(baseUri);
  const inboxDirectoryUri = getInboxDirectoryUri(normalizedBaseUri);

  if (!(await exists(inboxDirectoryUri))) {
    return [];
  }

  const documents = (await listFiles(inboxDirectoryUri)) as SafDocumentFile[];

  return documents
    .filter(document => {
      const isFile = document.type === 'file' || document.type === undefined;
      return (
        isFile &&
        typeof document.name === 'string' &&
        document.name.endsWith(MARKDOWN_EXTENSION)
      );
    })
    .map(document => ({
      lastModified:
        typeof document.lastModified === 'number' ? document.lastModified : null,
      name: document.name as string,
      uri: document.uri,
    }))
    .sort((a, b) => {
      const left = a.lastModified ?? 0;
      const right = b.lastModified ?? 0;
      return right - left;
    });
}

export async function readNote(noteUri: string): Promise<NoteDetail> {
  if (isDevMockVaultEnabled) {
    const devStorage = getDevStorage();
    return devStorage.readNote(noteUri);
  }

  const normalizedNoteUri = normalizeNoteUri(noteUri);
  const content = await readFile(normalizedNoteUri, {encoding: 'utf8'});

  const nameFromUri = normalizedNoteUri.split('/').pop() ?? 'Untitled.md';
  const summary: NoteSummary = {
    lastModified: null,
    name: nameFromUri,
    uri: normalizedNoteUri,
  };

  return {content, summary};
}

export async function createNote(
  baseUri: string,
  title: string,
  content: string,
): Promise<NoteSummary> {
  if (isDevMockVaultEnabled) {
    const devStorage = getDevStorage();
    return devStorage.createNote(baseUri, title, content);
  }

  const normalizedBaseUri = normalizeBaseUri(baseUri);
  const inboxDirectoryUri = getInboxDirectoryUri(normalizedBaseUri);

  if (!(await exists(inboxDirectoryUri))) {
    await mkdir(inboxDirectoryUri);
  }

  const fileName = `${sanitizeFileName(title)}${MARKDOWN_EXTENSION}`;
  const noteUri = `${inboxDirectoryUri}/${fileName}`;
  const trimmedContent = content.trim();
  const noteBody = trimmedContent ? `${trimmedContent}\n` : '';

  await writeFile(noteUri, noteBody, {
    encoding: 'utf8',
    mimeType: 'text/markdown',
  });

  return {
    lastModified: Date.now(),
    name: fileName,
    uri: noteUri,
  };
}

export async function writeNoteContent(
  noteUri: string,
  content: string,
): Promise<void> {
  if (isDevMockVaultEnabled) {
    const devStorage = getDevStorage();
    await devStorage.writeNoteContent(noteUri, content);
    return;
  }

  const normalizedNoteUri = normalizeNoteUri(noteUri);
  const noteBody = `${content}\n`;

  await writeFile(normalizedNoteUri, noteBody, {
    encoding: 'utf8',
    mimeType: 'text/markdown',
  });
}

export function getNoteTitle(noteName: string): string {
  return titleFromNoteName(noteName);
}
