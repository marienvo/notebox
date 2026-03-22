import {createContext, ReactNode, useContext, useMemo} from 'react';

import {PodcastEpisode, PodcastSection} from '../../../types';
import {usePlayer} from '../hooks/usePlayer';
import {usePodcasts} from '../hooks/usePodcasts';
import {PlayerProgress, PlayerState} from '../services/audioPlayer';

type PlayerContextValue = {
  activeEpisode: PodcastEpisode | null;
  allEpisodes: PodcastEpisode[];
  playbackError: string | null;
  playbackLoading: boolean;
  playbackState: PlayerState;
  playEpisode: (episode: PodcastEpisode) => Promise<void>;
  progress: PlayerProgress;
  podcastError: string | null;
  podcastsLoading: boolean;
  refreshPodcasts: () => Promise<void>;
  sections: PodcastSection[];
  seekTo: (positionMs: number) => Promise<void>;
  togglePlayback: () => Promise<void>;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

type PlayerProviderProps = {
  children: ReactNode;
};

export function PlayerProvider({children}: PlayerProviderProps) {
  const {
    allEpisodes,
    error: podcastError,
    isLoading: podcastsLoading,
    refresh: refreshPodcasts,
    sections,
  } = usePodcasts();

  const episodesById = useMemo(
    () => new Map(allEpisodes.map(episode => [episode.id, episode])),
    [allEpisodes],
  );

  const {
    activeEpisode,
    error: playbackError,
    isLoading: playbackLoading,
    playEpisode,
    progress,
    seekTo,
    state: playbackState,
    togglePlayback,
  } = usePlayer(episodesById);

  const value = useMemo(
    () => ({
      activeEpisode,
      allEpisodes,
      playbackError,
      playbackLoading,
      playbackState,
      playEpisode,
      progress,
      podcastError,
      podcastsLoading,
      refreshPodcasts,
      sections,
      seekTo,
      togglePlayback,
    }),
    [
      activeEpisode,
      allEpisodes,
      playbackError,
      playbackLoading,
      playbackState,
      playEpisode,
      podcastError,
      podcastsLoading,
      progress,
      refreshPodcasts,
      sections,
      seekTo,
      togglePlayback,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayerContext(): PlayerContextValue {
  const context = useContext(PlayerContext);

  if (!context) {
    throw new Error('usePlayerContext must be used inside PlayerProvider.');
  }

  return context;
}
