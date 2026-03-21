import {Platform} from 'react-native';
import {hasPermission} from 'react-native-saf-x';

import {clearUri, getSavedUri} from '../storage/appStorage';

export type InitialRoute = 'Home' | 'Setup';

export async function resolveInitialRoute(): Promise<InitialRoute> {
  const savedUri = await getSavedUri();

  if (!savedUri) {
    return 'Setup';
  }

  // SAF permissions are Android-only in this MVP.
  if (Platform.OS !== 'android') {
    return 'Home';
  }

  const permissionGranted = await hasPermission(savedUri);

  if (!permissionGranted) {
    await clearUri();
    return 'Setup';
  }

  return 'Home';
}
