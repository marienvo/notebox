export type NoteboxSettings = {
  displayName: string;
};

export type NoteSummary = {
  lastModified: number | null;
  name: string;
  uri: string;
};

export type NoteDetail = {
  content: string;
  summary: NoteSummary;
};

export type RootMarkdownFile = {
  lastModified: number | null;
  name: string;
  uri: string;
};

export type PodcastEpisode = {
  articleUrl?: string;
  date: string;
  id: string;
  isListened: boolean;
  mp3Url: string;
  sectionTitle: string;
  seriesName: string;
  sourceFile: string;
  title: string;
};

export type PodcastSection = {
  episodes: PodcastEpisode[];
  title: string;
};

export type PlaylistEntry = {
  durationMs: number | null;
  episodeId: string;
  mp3Url: string;
  positionMs: number;
};
