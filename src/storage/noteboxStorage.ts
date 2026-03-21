import {exists, mkdir, readFile, writeFile} from 'react-native-saf-x';

import {NoteboxSettings} from '../types';

const NOTEBOX_DIRECTORY_NAME = '.notebox';
const SETTINGS_FILE_NAME = 'settings.json';

const defaultSettings: NoteboxSettings = {
  displayName: 'My Notebox',
};

function getNoteboxDirectoryUri(baseUri: string): string {
  return `${baseUri}/${NOTEBOX_DIRECTORY_NAME}`;
}

function getSettingsUri(baseUri: string): string {
  return `${getNoteboxDirectoryUri(baseUri)}/${SETTINGS_FILE_NAME}`;
}

function normalizeBaseUri(baseUri: string): string {
  const normalizedUri = baseUri.trim();

  if (!normalizedUri) {
    throw new Error('Base URI cannot be empty.');
  }

  return normalizedUri;
}

function serializeSettings(settings: NoteboxSettings): string {
  return `${JSON.stringify(settings, null, 2)}\n`;
}

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
  const normalizedBaseUri = normalizeBaseUri(baseUri);
  const settingsUri = getSettingsUri(normalizedBaseUri);
  const rawSettings = await readFile(settingsUri, {encoding: 'utf8'});

  return parseSettings(rawSettings);
}

export async function writeSettings(
  baseUri: string,
  settings: NoteboxSettings,
): Promise<void> {
  const normalizedBaseUri = normalizeBaseUri(baseUri);
  const settingsUri = getSettingsUri(normalizedBaseUri);

  await writeFile(settingsUri, serializeSettings(settings), {
    encoding: 'utf8',
    mimeType: 'application/json',
  });
}
