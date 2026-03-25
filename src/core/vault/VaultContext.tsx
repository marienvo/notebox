import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {appBreadcrumb, reportUnexpectedError, syncVaultSessionContext} from '../observability';
import {elapsedMsSinceJsBundleEval} from '../observability/startupTiming';
import {tryPrepareNoteboxSessionNative} from '../storage/androidVaultListing';
import {getSavedUri} from '../storage/appStorage';
import {initNotebox, parseNoteboxSettings, readSettings} from '../storage/noteboxStorage';
import {NoteboxSettings, NoteSummary} from '../../types';

type VaultContextValue = {
  baseUri: string | null;
  consumeInboxPrefetch: (forUri: string) => NoteSummary[] | null;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
  setSessionUri: (nextUri: string | null) => Promise<void>;
  settings: NoteboxSettings | null;
  setSettings: (nextSettings: NoteboxSettings) => void;
};

const VaultContext = createContext<VaultContextValue | null>(null);

type VaultProviderProps = {
  children: ReactNode;
};

export function VaultProvider({children}: VaultProviderProps) {
  const [baseUri, setBaseUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<NoteboxSettings | null>(null);
  const inboxPrefetchRef = useRef<{notes: NoteSummary[]; uri: string} | null>(null);

  const consumeInboxPrefetch = useCallback((forUri: string): NoteSummary[] | null => {
    const pending = inboxPrefetchRef.current;
    if (pending == null || pending.uri !== forUri) {
      return null;
    }
    inboxPrefetchRef.current = null;
    return pending.notes;
  }, []);

  const applyVaultSessionUri = useCallback(async (nextUri: string) => {
    inboxPrefetchRef.current = null;
    appBreadcrumb({
      category: 'vault',
      message: 'session.apply.start',
      data: {},
    });
    let nextSettings: NoteboxSettings;
    let sessionPrep: 'native' | 'legacy' = 'legacy';
    let hasInboxPrefetch = false;
    try {
      const prepared = await tryPrepareNoteboxSessionNative(nextUri);
      if (prepared !== null) {
        nextSettings = parseNoteboxSettings(prepared.settingsJson);
        sessionPrep = 'native';
        if (prepared.inboxPrefetch !== null) {
          inboxPrefetchRef.current = {uri: nextUri, notes: prepared.inboxPrefetch};
          hasInboxPrefetch = true;
        }
      } else {
        await initNotebox(nextUri);
        nextSettings = await readSettings(nextUri);
      }
    } catch {
      await initNotebox(nextUri);
      nextSettings = await readSettings(nextUri);
      sessionPrep = 'legacy';
    }
    setBaseUri(nextUri);
    setSettings(nextSettings);
    appBreadcrumb({
      category: 'vault',
      message: 'session.apply.complete',
      data: {has_inbox_prefetch: hasInboxPrefetch, session_prep: sessionPrep},
    });
  }, []);

  const setSessionUri = useCallback(
    async (nextUri: string | null) => {
      if (!nextUri) {
        inboxPrefetchRef.current = null;
        setBaseUri(null);
        setSettings(null);
        return;
      }

      try {
        await applyVaultSessionUri(nextUri);
      } catch (error) {
        reportUnexpectedError(error, {flow: 'vault_session', step: 'apply'});
        throw error;
      }
    },
    [applyVaultSessionUri],
  );

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const savedUri = await getSavedUri();

      appBreadcrumb({
        category: 'vault',
        message: 'vault.session.restore.start',
        data: {has_saved_uri: Boolean(savedUri)},
      });

      if (!savedUri) {
        inboxPrefetchRef.current = null;
        setBaseUri(null);
        setSettings(null);
        appBreadcrumb({
          category: 'vault',
          message: 'vault.session.restore.complete',
          data: {
            has_session: false,
            elapsed_ms: elapsedMsSinceJsBundleEval(),
          },
        });
        return;
      }

      await applyVaultSessionUri(savedUri);
      appBreadcrumb({
        category: 'vault',
        message: 'vault.session.restore.complete',
        data: {
          has_session: true,
          elapsed_ms: elapsedMsSinceJsBundleEval(),
        },
      });
    } catch (error) {
      inboxPrefetchRef.current = null;
      setBaseUri(null);
      setSettings(null);
      reportUnexpectedError(error, {flow: 'vault_restore'});
      appBreadcrumb({
        category: 'vault',
        message: 'vault.session.restore.fail',
        level: 'error',
        data: {},
      });
    } finally {
      setIsLoading(false);
    }
  }, [applyVaultSessionUri]);

  useEffect(() => {
    refreshSession().catch(() => undefined);
  }, [refreshSession]);

  useEffect(() => {
    syncVaultSessionContext(Boolean(baseUri));
  }, [baseUri]);

  const value = useMemo(
    () => ({
      baseUri,
      consumeInboxPrefetch,
      isLoading,
      refreshSession,
      setSessionUri,
      settings,
      setSettings,
    }),
    [baseUri, consumeInboxPrefetch, isLoading, refreshSession, setSessionUri, settings],
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVaultContext(): VaultContextValue {
  const context = useContext(VaultContext);

  if (!context) {
    throw new Error('useVaultContext must be used inside VaultProvider.');
  }

  return context;
}
