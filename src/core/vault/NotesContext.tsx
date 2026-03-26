import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {InteractionManager} from 'react-native';

import {
  createNote,
  listInboxNotesAndSyncIndex,
  readNote,
  writeNoteContent,
} from '../storage/noteboxStorage';
import {NoteDetail, NoteSummary} from '../../types';
import {useVaultContext} from './VaultContext';

type RefreshOptions = {
  silent?: boolean;
};

type NotesContextValue = {
  create: (title: string, content: string) => Promise<NoteSummary>;
  error: string | null;
  isLoading: boolean;
  notes: NoteSummary[];
  read: (noteUri: string) => Promise<NoteDetail>;
  refresh: (options?: RefreshOptions) => Promise<void>;
  write: (noteUri: string, content: string) => Promise<void>;
};

const NotesContext = createContext<NotesContextValue | null>(null);

function sortByLastModifiedDesc(left: NoteSummary, right: NoteSummary): number {
  const leftLastModified = left.lastModified ?? 0;
  const rightLastModified = right.lastModified ?? 0;
  return rightLastModified - leftLastModified;
}

export function mergeInboxNoteOptimistic(
  previousNotes: NoteSummary[],
  createdNote: NoteSummary,
): NoteSummary[] {
  const nextNotes = previousNotes.filter(note => note.uri !== createdNote.uri);
  nextNotes.push(createdNote);
  nextNotes.sort(sortByLastModifiedDesc);
  return nextNotes;
}

type NotesProviderProps = {
  children: ReactNode;
};

export function NotesProvider({children}: NotesProviderProps) {
  const {baseUri, consumeInboxPrefetch} = useVaultContext();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState<NoteSummary[]>([]);

  const refresh = useCallback(
    async (options?: RefreshOptions) => {
      if (!baseUri) {
        setNotes([]);
        return;
      }

      const isSilent = options?.silent === true;
      setError(null);
      if (!isSilent) {
        setIsLoading(true);
      }
      try {
        const prefetched = consumeInboxPrefetch(baseUri);
        if (prefetched !== null) {
          setNotes(prefetched);
          return;
        }
        const nextNotes = await listInboxNotesAndSyncIndex(baseUri);
        setNotes(nextNotes);
      } catch (loadError) {
        const fallbackMessage = 'Could not load notes from Vault.';
        setError(loadError instanceof Error ? loadError.message : fallbackMessage);
      } finally {
        if (!isSilent) {
          setIsLoading(false);
        }
      }
    },
    [baseUri, consumeInboxPrefetch],
  );

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const create = useCallback(
    async (title: string, content: string) => {
      if (!baseUri) {
        throw new Error('No notes directory selected.');
      }

      const createdNote = await createNote(baseUri, title, content);
      setNotes(previousNotes => mergeInboxNoteOptimistic(previousNotes, createdNote));
      InteractionManager.runAfterInteractions(() => {
        refresh({silent: true}).catch(() => undefined);
      });
      return createdNote;
    },
    [baseUri, refresh],
  );

  const read = useCallback(async (noteUri: string): Promise<NoteDetail> => {
    return readNote(noteUri);
  }, []);

  const write = useCallback(
    async (noteUri: string, content: string) => {
      await writeNoteContent(noteUri, content);
      await refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({
      create,
      error,
      isLoading,
      notes,
      read,
      refresh,
      write,
    }),
    [create, error, isLoading, notes, read, refresh, write],
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotesContext(): NotesContextValue {
  const context = useContext(NotesContext);
  if (context === null) {
    throw new Error('useNotes must be used inside NotesProvider.');
  }
  return context;
}
