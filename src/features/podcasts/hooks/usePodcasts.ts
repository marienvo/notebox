import {useCallback, useEffect, useState} from 'react';

import {
  clearPlaylist,
  listGeneralMarkdownFiles,
  readPlaylist,
  readPodcastFileContent,
} from '../../../core/storage/noteboxStorage';
import {PodcastEpisode, PodcastSection} from '../../../types';
import {useVaultContext} from '../../../core/vault/VaultContext';
import {groupBySection, isPodcastFile, parsePodcastFile} from '../services/podcastParser';
import {
  extractRssFeedUrl,
  extractRssPodcastTitle,
  normalizeSeriesKey,
} from '../services/rssParser';

const RSS_PODCAST_FILE_PATTERN = /^📻\s+.+\.md$/;

type FileContentCacheEntry = {lastModified: number; content: string};
const fileContentCache = new Map<string, FileContentCacheEntry>();

type UsePodcastsResult = {
  allEpisodes: PodcastEpisode[];
  error: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  sections: PodcastSection[];
};

export function usePodcasts(): UsePodcastsResult {
  const {baseUri} = useVaultContext();
  const [allEpisodes, setAllEpisodes] = useState<PodcastEpisode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sections, setSections] = useState<PodcastSection[]>([]);

  const refresh = useCallback(async () => {
    if (!baseUri) {
      setAllEpisodes([]);
      setSections([]);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const files = await listGeneralMarkdownFiles(baseUri);
      const podcastFiles = files.filter(
        file => isPodcastFile(file.name) || RSS_PODCAST_FILE_PATTERN.test(file.name),
      );

      const contentsByFile = await Promise.all(
        podcastFiles.map(async file => {
          const lastModified = file.lastModified ?? -1;
          const cached = fileContentCache.get(file.uri);
          if (cached && lastModified > 0 && cached.lastModified === lastModified) {
            return {content: cached.content, file};
          }
          const content = await readPodcastFileContent(file.uri);
          if (lastModified > 0) {
            fileContentCache.set(file.uri, {lastModified, content});
          }
          return {content, file};
        }),
      );

      const rssBySeriesName = new Map<string, string>();
      const rssByNormalizedSeriesName = new Map<string, string>();
      const legacyEpisodes: PodcastEpisode[] = [];

      for (const {content, file} of contentsByFile) {
        if (isPodcastFile(file.name)) {
          legacyEpisodes.push(...parsePodcastFile(file.name, content));
        }

        if (!RSS_PODCAST_FILE_PATTERN.test(file.name)) {
          continue;
        }

        const rssFeedUrl = extractRssFeedUrl(content);
        const sectionTitle = extractRssPodcastTitle(file.name, content);
        if (rssFeedUrl) {
          rssBySeriesName.set(sectionTitle, rssFeedUrl);
          const normalizedSectionKey = normalizeSeriesKey(sectionTitle);
          if (normalizedSectionKey) {
            rssByNormalizedSeriesName.set(normalizedSectionKey, rssFeedUrl);
          }
        }
      }

      const legacyEpisodesWithRss = legacyEpisodes.map(episode => ({
        ...episode,
        rssFeedUrl:
          rssBySeriesName.get(episode.seriesName) ??
          rssByNormalizedSeriesName.get(normalizeSeriesKey(episode.seriesName)),
      }));

      const dedupedEpisodes = new Map<string, PodcastEpisode>();
      for (const episode of legacyEpisodesWithRss) {
        if (!dedupedEpisodes.has(episode.id)) {
          dedupedEpisodes.set(episode.id, episode);
        }
      }

      const nextAllEpisodes = Array.from(dedupedEpisodes.values()).sort((left, right) =>
        right.date.localeCompare(left.date),
      );

      const nextSections = groupBySection(nextAllEpisodes.filter(episode => !episode.isListened)).map(
        section => {
          const rssFeedUrl =
            section.episodes.find(episode => episode.rssFeedUrl)?.rssFeedUrl ??
            rssBySeriesName.get(section.title) ??
            rssByNormalizedSeriesName.get(normalizeSeriesKey(section.title));

          if (!rssFeedUrl && section.episodes.length > 0) {
            console.warn(
              `[Podcasts] Missing rssFeedUrl for section "${section.title}". Artwork cannot be resolved.`,
            );
          }

          return {
            ...section,
            rssFeedUrl,
          };
        },
      );

      setAllEpisodes(nextAllEpisodes);
      setSections(nextSections);

      const playlistEntry = await readPlaylist(baseUri);
      if (playlistEntry) {
        const knownEpisodeIds = new Set(
          nextAllEpisodes.map(episode => episode.id),
        );

        if (!knownEpisodeIds.has(playlistEntry.episodeId)) {
          await clearPlaylist(baseUri);
        }
      }
    } catch (loadError) {
      const fallbackMessage = 'Could not load podcasts from vault.';
      setError(loadError instanceof Error ? loadError.message : fallbackMessage);
      setAllEpisodes([]);
      setSections([]);
    } finally {
      setIsLoading(false);
    }
  }, [baseUri]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  return {
    allEpisodes,
    error,
    isLoading,
    refresh,
    sections,
  };
}
