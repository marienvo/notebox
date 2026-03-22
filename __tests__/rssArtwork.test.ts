import {fetchRssArtworkUrl} from '../src/features/podcasts/services/rssArtwork';

describe('fetchRssArtworkUrl', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global as unknown as {fetch: typeof fetch}).fetch = fetchMock as never;
  });

  test('prioritizes itunes:image over other fields', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
          <channel>
            <itunes:image href="https://cdn.example.com/itunes.jpg" />
            <image>
              <url>https://cdn.example.com/rss.jpg</url>
            </image>
          </channel>
        </rss>`,
    });

    await expect(fetchRssArtworkUrl('https://feed.example.com/rss.xml')).resolves.toBe(
      'https://cdn.example.com/itunes.jpg',
    );
  });

  test('falls back to channel image url when itunes:image is missing', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <image>
              <url>https://cdn.example.com/rss.jpg</url>
            </image>
          </channel>
        </rss>`,
    });

    await expect(fetchRssArtworkUrl('https://feed.example.com/rss.xml')).resolves.toBe(
      'https://cdn.example.com/rss.jpg',
    );
  });

  test('falls back to media:thumbnail then googleplay:image', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        text: async () => `<?xml version="1.0" encoding="UTF-8"?>
          <rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
            <channel>
              <media:thumbnail url="https://cdn.example.com/media.jpg" />
            </channel>
          </rss>`,
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => `<?xml version="1.0" encoding="UTF-8"?>
          <rss version="2.0" xmlns:googleplay="http://www.google.com/schemas/play-podcasts/1.0">
            <channel>
              <googleplay:image href="https://cdn.example.com/google.jpg" />
            </channel>
          </rss>`,
      });

    await expect(fetchRssArtworkUrl('https://feed.example.com/with-media.xml')).resolves.toBe(
      'https://cdn.example.com/media.jpg',
    );
    await expect(fetchRssArtworkUrl('https://feed.example.com/with-google.xml')).resolves.toBe(
      'https://cdn.example.com/google.jpg',
    );
  });

  test('returns null for malformed xml or missing artwork', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '<rss><channel><title>Invalid XML',
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '<?xml version="1.0"?><rss><channel><title>Only title</title></channel></rss>',
      });

    await expect(fetchRssArtworkUrl('https://feed.example.com/malformed.xml')).resolves.toBeNull();
    await expect(fetchRssArtworkUrl('https://feed.example.com/no-artwork.xml')).resolves.toBeNull();
  });
});
