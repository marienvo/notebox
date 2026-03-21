import {Platform} from 'react-native';
import {hasPermission} from 'react-native-saf-x';

import {clearUri, getSavedUri} from '../storage/appStorage';

export type InitialRoute = 'MainTabs' | 'Setup';
const isDevMockVaultEnabled = __DEV__ && !('jest' in globalThis);

export async function resolveInitialRoute(): Promise<InitialRoute> {
  if (isDevMockVaultEnabled) {
    return 'MainTabs';
  }

  const savedUri = await getSavedUri();

  if (!savedUri) {
    return 'Setup';
  }

  if (Platform.OS !== 'android') {
    return 'MainTabs';
  }

  const permissionGranted = await hasPermission(savedUri);

  if (!permissionGranted) {
    await clearUri();
    return 'Setup';
  }

  return 'MainTabs';
}
