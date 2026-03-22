import React, {useEffect} from 'react';
import TestRenderer, {act} from 'react-test-renderer';

import {usePodcastArtwork} from '../src/features/podcasts/hooks/usePodcastArtwork';
import {getPodcastArtworkUri} from '../src/features/podcasts/services/podcastImageCache';

jest.mock('../src/features/podcasts/services/podcastImageCache', () => ({
  getPodcastArtworkUri: jest.fn(),
}));

type HookHarnessProps = {
  baseUri: string | null;
  onResult: (value: string | null) => void;
  rssFeedUrl?: string;
};

function HookHarness({baseUri, onResult, rssFeedUrl}: HookHarnessProps) {
  const artworkUri = usePodcastArtwork(baseUri, rssFeedUrl);

  useEffect(() => {
    onResult(artworkUri);
  }, [artworkUri, onResult]);

  return null;
}

function flushPromises(): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
}

describe('usePodcastArtwork', () => {
  const getPodcastArtworkUriMock = getPodcastArtworkUri as jest.MockedFunction<
    typeof getPodcastArtworkUri
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns null immediately and resolves artwork asynchronously', async () => {
    getPodcastArtworkUriMock.mockResolvedValueOnce('https://cdn.example.com/art.jpg');
    const values: Array<string | null> = [];

    await act(async () => {
      TestRenderer.create(
        React.createElement(HookHarness, {
          baseUri: 'content://vault',
          onResult: value => values.push(value),
          rssFeedUrl: 'https://feed.example.com/rss.xml',
        }),
      );
      await flushPromises();
    });

    expect(values[0]).toBeNull();
    expect(values).toContain('https://cdn.example.com/art.jpg');
  });

  test('stays null when feed URL is missing', async () => {
    const values: Array<string | null> = [];

    await act(async () => {
      TestRenderer.create(
        React.createElement(HookHarness, {
          baseUri: 'content://vault',
          onResult: value => values.push(value),
        }),
      );
      await flushPromises();
    });

    expect(values).toEqual([null]);
    expect(getPodcastArtworkUriMock).not.toHaveBeenCalled();
  });
});
