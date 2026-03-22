import {
  readPodcastImageCacheEntry,
  writePodcastImageCacheEntry,
} from '../../../core/storage/noteboxStorage';
import {PodcastImageCacheEntry} from '../../../types';
import {fetchRssArtworkUrl} from './rssArtwork';

export const PODCAST_IMAGE_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function isEntryFresh(entry: PodcastImageCacheEntry): boolean {
  const fetchedAt = Date.parse(entry.fetchedAt);
  if (!Number.isFinite(fetchedAt)) {
    return false;
  }

  return Date.now() - fetchedAt < PODCAST_IMAGE_CACHE_TTL_MS;
}

export function getPodcastImageCacheKey(rssFeedUrl: string): string {
  const normalized = rssFeedUrl.trim().toLowerCase();
  let hash = 5381;
  const maxPrime = 4_294_967_291;

  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 33 + normalized.charCodeAt(index)) % maxPrime;
  }

  return `rss-${Math.floor(hash).toString(16)}`;
}

export async function getCachedPodcastArtworkUri(
  baseUri: string,
  rssFeedUrl: string,
): Promise<string | null> {
  const normalizedRssFeedUrl = rssFeedUrl.trim();
  if (!baseUri || !normalizedRssFeedUrl) {
    return null;
  }

  const cacheKey = getPodcastImageCacheKey(normalizedRssFeedUrl);
  const cachedEntry = await readPodcastImageCacheEntry(baseUri, cacheKey);
  if (!cachedEntry?.imageUrl || !isEntryFresh(cachedEntry)) {
    return null;
  }

  return cachedEntry.imageUrl;
}

export async function getPodcastArtworkUri(
  baseUri: string,
  rssFeedUrl: string,
): Promise<string | null> {
  const normalizedRssFeedUrl = rssFeedUrl.trim();
  if (!baseUri || !normalizedRssFeedUrl) {
    return null;
  }

  const cacheKey = getPodcastImageCacheKey(normalizedRssFeedUrl);
  const cachedEntry = await readPodcastImageCacheEntry(baseUri, cacheKey);
  if (cachedEntry?.imageUrl && isEntryFresh(cachedEntry)) {
    return cachedEntry.imageUrl;
  }

  const imageUrl = await fetchRssArtworkUrl(normalizedRssFeedUrl);
  if (!imageUrl) {
    return cachedEntry?.imageUrl ?? null;
  }

  await writePodcastImageCacheEntry(baseUri, cacheKey, {
    fetchedAt: new Date().toISOString(),
    imageUrl,
  });
  return imageUrl;
}

export function warmPodcastArtworkCache(
  baseUri: string,
  rssFeedUrl: string,
): void {
  getPodcastArtworkUri(baseUri, rssFeedUrl).catch(() => undefined);
}
