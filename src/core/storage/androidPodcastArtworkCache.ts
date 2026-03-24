import {NativeModules, Platform} from 'react-native';

type NativePodcastArtworkCacheModule = {
  ensureLocalArtworkFile: (contentUri: string) => Promise<string>;
};

const resolvedFileUriByContentUri = new Map<string, string>();
const inFlightByContentUri = new Map<string, Promise<string>>();

/** Matches podcastImageCache: only SAF document URIs are safe for Image + vault artwork. */
function isRenderableVaultContentArtworkUri(uri: string): boolean {
  if (!uri.startsWith('content://')) {
    return true;
  }
  return uri.includes('/document/');
}

function getNativeModule(): NativePodcastArtworkCacheModule | null {
  if (Platform.OS !== 'android') {
    return null;
  }
  const mod = NativeModules.NoteboxPodcastArtworkCache as
    | NativePodcastArtworkCacheModule
    | undefined;
  if (mod?.ensureLocalArtworkFile == null) {
    return null;
  }
  return mod;
}

/**
 * Returns a URI safe for React Native Image: copies vault `content://` artwork to app cache on a
 * native background thread (Android) and returns `file://`. Other schemes pass through unchanged.
 */
export async function ensureLocalArtworkFileForDisplay(uri: string): Promise<string> {
  const trimmed = uri.trim();
  if (!trimmed.startsWith('content://')) {
    return trimmed;
  }
  if (!isRenderableVaultContentArtworkUri(trimmed)) {
    return trimmed;
  }

  const native = getNativeModule();
  if (native == null) {
    return trimmed;
  }

  const cached = resolvedFileUriByContentUri.get(trimmed);
  if (cached) {
    return cached;
  }

  let pending = inFlightByContentUri.get(trimmed);
  if (!pending) {
    pending = native.ensureLocalArtworkFile(trimmed).then(fileUri => {
      resolvedFileUriByContentUri.set(trimmed, fileUri);
      inFlightByContentUri.delete(trimmed);
      return fileUri;
    }).catch(err => {
      inFlightByContentUri.delete(trimmed);
      throw err;
    });
    inFlightByContentUri.set(trimmed, pending);
  }

  return pending;
}

/**
 * Clears the in-memory map (for tests).
 */
export function clearPodcastArtworkDisplayUriCacheForTesting(): void {
  resolvedFileUriByContentUri.clear();
  inFlightByContentUri.clear();
}
