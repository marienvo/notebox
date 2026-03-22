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

const RSS_PODCAST_FILE_PATTERN = /^📻\s+.+\.md$/;
const FRONTMATTER_PATTERN = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*/;
const RSS_FEED_URL_PATTERN = /^\s*rssFeedUrl\s*:\s*(.+)\s*$/im;
const H1_TITLE_PATTERN = /^\s*#\s+(.+?)\s*$/m;
const DATE_HEADER_PATTERN = /^\s*##\s+(.+?)\s*$/;
const EPISODE_LINE_PATTERN =
  /^\s*-\s*(?:\[🌐\]\(([^)]+)\)\s*)?(.+?)\s*\[▶️?\]\(([^)]+)\)\s*$/;

type UsePodcastsResult = {
  allEpisodes: PodcastEpisode[];
  error: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  sections: PodcastSection[];
};

function trimWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function extractRssFeedUrl(content: string): string | undefined {
  const frontmatterMatch = FRONTMATTER_PATTERN.exec(content);
  if (!frontmatterMatch) {
    return undefined;
  }

  const rssFeedMatch = RSS_FEED_URL_PATTERN.exec(frontmatterMatch[1]);
  if (!rssFeedMatch) {
    return undefined;
  }

  const rssFeedUrl = trimWrappingQuotes(rssFeedMatch[1]);
  return rssFeedUrl || undefined;
}

function normalizeDateString(rawDate: string): string {
  const withoutOrdinal = rawDate.replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, '$1');
  const parsed = Date.parse(withoutOrdinal);
  if (!Number.isFinite(parsed)) {
    return new Date().toISOString().slice(0, 10);
  }

  return new Date(parsed).toISOString().slice(0, 10);
}

function extractRssPodcastTitle(fileName: string, content: string): string {
  const headingMatch = H1_TITLE_PATTERN.exec(content);
  if (headingMatch?.[1]?.trim()) {
    return headingMatch[1].trim();
  }

  const withoutExtension = fileName.replace(/\.md$/i, '');
  return withoutExtension.replace(/^📻\s+/, '').trim();
}

function normalizeSeriesKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseRssPodcastEpisodes(
  fileName: string,
  content: string,
  sectionTitle: string,
  rssFeedUrl?: string,
): PodcastEpisode[] {
  const bodyWithoutFrontmatter = content.replace(FRONTMATTER_PATTERN, '').trim();
  const lines = bodyWithoutFrontmatter.split(/\r?\n/);
  const episodes: PodcastEpisode[] = [];
  let activeDate = new Date().toISOString().slice(0, 10);

  for (const line of lines) {
    const dateHeader = DATE_HEADER_PATTERN.exec(line);
    if (dateHeader?.[1]) {
      activeDate = normalizeDateString(dateHeader[1]);
      continue;
    }

    const episodeMatch = EPISODE_LINE_PATTERN.exec(line);
    if (!episodeMatch) {
      continue;
    }

    const articleUrl = episodeMatch[1]?.trim() || undefined;
    const title = episodeMatch[2]?.trim();
    const mp3Url = episodeMatch[3]?.trim();
    if (!title || !mp3Url) {
      continue;
    }

    episodes.push({
      articleUrl,
      date: activeDate,
      id: mp3Url,
      isListened: false,
      mp3Url,
      rssFeedUrl,
      sectionTitle,
      seriesName: sectionTitle,
      sourceFile: fileName,
      title,
    });
  }

  return episodes;
}

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
        podcastFiles.map(async file => ({
          content: await readPodcastFileContent(file.uri),
          file,
        })),
      );

      const rssBySeriesName = new Map<string, string>();
      const rssByNormalizedSeriesName = new Map<string, string>();
      const legacyEpisodes: PodcastEpisode[] = [];
      const rssEpisodes: PodcastEpisode[] = [];

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
        rssEpisodes.push(
          ...parseRssPodcastEpisodes(file.name, content, sectionTitle, rssFeedUrl),
        );
      }

      const legacyEpisodesWithRss = legacyEpisodes.map(episode => ({
        ...episode,
        rssFeedUrl:
          rssBySeriesName.get(episode.seriesName) ??
          rssByNormalizedSeriesName.get(normalizeSeriesKey(episode.seriesName)),
      }));

      const dedupedEpisodes = new Map<string, PodcastEpisode>();
      for (const episode of [...rssEpisodes, ...legacyEpisodesWithRss]) {
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
