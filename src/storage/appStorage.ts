import AsyncStorage from '@react-native-async-storage/async-storage';

import {NOTES_DIRECTORY_URI_KEY} from './keys';

export function getSavedUri(): Promise<string | null> {
  return AsyncStorage.getItem(NOTES_DIRECTORY_URI_KEY);
}

export async function saveUri(uri: string): Promise<void> {
  const normalizedUri = uri.trim();

  if (!normalizedUri) {
    throw new Error('Directory URI cannot be empty.');
  }

  await AsyncStorage.setItem(NOTES_DIRECTORY_URI_KEY, normalizedUri);
}

export function clearUri(): Promise<void> {
  return AsyncStorage.removeItem(NOTES_DIRECTORY_URI_KEY);
}
