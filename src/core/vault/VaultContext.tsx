import {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState} from 'react';

import {appBreadcrumb, reportUnexpectedError, syncVaultSessionContext} from '../observability';
import {getSavedUri} from '../storage/appStorage';
import {initNotebox, readSettings} from '../storage/noteboxStorage';
import {NoteboxSettings} from '../../types';

type VaultContextValue = {
  baseUri: string | null;
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

  const applyVaultSessionUri = useCallback(async (nextUri: string) => {
    appBreadcrumb({
      category: 'vault',
      message: 'session.apply.start',
      data: {},
    });
    try {
      await initNotebox(nextUri);
    } catch (error) {
      reportUnexpectedError(error, {flow: 'vault_session', step: 'init_notebox'});
      throw error;
    }
    try {
      const nextSettings = await readSettings(nextUri);
      setBaseUri(nextUri);
      setSettings(nextSettings);
    } catch (error) {
      reportUnexpectedError(error, {flow: 'vault_session', step: 'read_settings'});
      throw error;
    }
    appBreadcrumb({
      category: 'vault',
      message: 'session.apply.complete',
      data: {},
    });
  }, []);

  const setSessionUri = useCallback(
    async (nextUri: string | null) => {
      if (!nextUri) {
        setBaseUri(null);
        setSettings(null);
        return;
      }

      await applyVaultSessionUri(nextUri);
    },
    [applyVaultSessionUri],
  );

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    appBreadcrumb({
      category: 'vault',
      message: 'vault.restore.start',
      data: {},
    });
    try {
      let savedUri: string | null;
      try {
        savedUri = await getSavedUri();
      } catch (error) {
        reportUnexpectedError(error, {flow: 'vault_restore', step: 'get_saved_uri'});
        throw error;
      }

      if (!savedUri) {
        setBaseUri(null);
        setSettings(null);
        appBreadcrumb({
          category: 'vault',
          message: 'vault.restore.complete',
          data: {has_session: false},
        });
        return;
      }

      await applyVaultSessionUri(savedUri);
      appBreadcrumb({
        category: 'vault',
        message: 'vault.restore.complete',
        data: {has_session: true},
      });
    } catch {
      setBaseUri(null);
      setSettings(null);
      appBreadcrumb({
        category: 'vault',
        message: 'vault.restore.fail',
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
      isLoading,
      refreshSession,
      setSessionUri,
      settings,
      setSettings,
    }),
    [baseUri, isLoading, refreshSession, setSessionUri, settings],
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
