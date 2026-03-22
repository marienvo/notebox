import {
  getPodcastArtworkUri,
  getPodcastImageCacheKey,
  PODCAST_IMAGE_CACHE_TTL_MS,
} from '../src/features/podcasts/services/podcastImageCache';
import {
  readPodcastImageCacheEntry,
  writePodcastImageCacheEntry,
} from '../src/core/storage/noteboxStorage';
import {fetchRssArtworkUrl} from '../src/features/podcasts/services/rssArtwork';

jest.mock('../src/core/storage/noteboxStorage', () => ({
  readPodcastImageCacheEntry: jest.fn(),
  writePodcastImageCacheEntry: jest.fn(),
}));

jest.mock('../src/features/podcasts/services/rssArtwork', () => ({
  fetchRssArtworkUrl: jest.fn(),
}));

describe('podcastImageCache', () => {
  const readCacheMock = readPodcastImageCacheEntry as jest.MockedFunction<
    typeof readPodcastImageCacheEntry
  >;
  const writeCacheMock = writePodcastImageCacheEntry as jest.MockedFunction<
    typeof writePodcastImageCacheEntry
  >;
  const fetchRssArtworkUrlMock = fetchRssArtworkUrl as jest.MockedFunction<
    typeof fetchRssArtworkUrl
  >;

  const baseUri = 'content://vault';
  const rssFeedUrl = 'https://feed.example.com/podcast.xml';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns fresh cache entry without fetching RSS', async () => {
    readCacheMock.mockResolvedValueOnce({
      fetchedAt: new Date(Date.now() - 60_000).toISOString(),
      imageUrl: 'https://cdn.example.com/cached.jpg',
    });

    await expect(getPodcastArtworkUri(baseUri, rssFeedUrl)).resolves.toBe(
      'https://cdn.example.com/cached.jpg',
    );
    expect(fetchRssArtworkUrlMock).not.toHaveBeenCalled();
    expect(writeCacheMock).not.toHaveBeenCalled();
  });

  test('fetches and stores new artwork when cache is stale', async () => {
    readCacheMock.mockResolvedValueOnce({
      fetchedAt: new Date(Date.now() - PODCAST_IMAGE_CACHE_TTL_MS - 60_000).toISOString(),
      imageUrl: 'https://cdn.example.com/stale.jpg',
    });
    fetchRssArtworkUrlMock.mockResolvedValueOnce('https://cdn.example.com/new.jpg');

    await expect(getPodcastArtworkUri(baseUri, rssFeedUrl)).resolves.toBe(
      'https://cdn.example.com/new.jpg',
    );

    expect(writeCacheMock).toHaveBeenCalledWith(
      baseUri,
      getPodcastImageCacheKey(rssFeedUrl),
      expect.objectContaining({
        imageUrl: 'https://cdn.example.com/new.jpg',
      }),
    );
  });

  test('retries download after cached entry was deleted', async () => {
    readCacheMock.mockResolvedValue(null);
    fetchRssArtworkUrlMock
      .mockResolvedValueOnce('https://cdn.example.com/first.jpg')
      .mockResolvedValueOnce('https://cdn.example.com/second.jpg');

    await expect(getPodcastArtworkUri(baseUri, rssFeedUrl)).resolves.toBe(
      'https://cdn.example.com/first.jpg',
    );
    await expect(getPodcastArtworkUri(baseUri, rssFeedUrl)).resolves.toBe(
      'https://cdn.example.com/second.jpg',
    );

    expect(fetchRssArtworkUrlMock).toHaveBeenCalledTimes(2);
  });
});
