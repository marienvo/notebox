import {useEffect, useState} from 'react';

import {getPodcastArtworkUri} from '../services/podcastImageCache';

export function usePodcastArtwork(
  baseUri: string | null,
  rssFeedUrl: string | undefined,
): string | null {
  const [artworkUri, setArtworkUri] = useState<string | null>(null);

  useEffect(() => {
    const normalizedFeedUrl = rssFeedUrl?.trim();
    if (!baseUri || !normalizedFeedUrl) {
      setArtworkUri(null);
      return;
    }

    let isMounted = true;

    getPodcastArtworkUri(baseUri, normalizedFeedUrl)
      .then(nextUri => {
        if (!isMounted) {
          return;
        }
        setArtworkUri(nextUri);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setArtworkUri(null);
      });

    return () => {
      isMounted = false;
    };
  }, [baseUri, rssFeedUrl]);

  return artworkUri;
}
