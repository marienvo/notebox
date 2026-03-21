import {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState} from 'react';

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

  const setSessionUri = useCallback(async (nextUri: string | null) => {
    if (!nextUri) {
      setBaseUri(null);
      setSettings(null);
      return;
    }

    await initNotebox(nextUri);
    const nextSettings = await readSettings(nextUri);
    setBaseUri(nextUri);
    setSettings(nextSettings);
  }, []);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    const savedUri = await getSavedUri();

    if (!savedUri) {
      setBaseUri(null);
      setSettings(null);
      setIsLoading(false);
      return;
    }

    await setSessionUri(savedUri);
    setIsLoading(false);
  }, [setSessionUri]);

  useEffect(() => {
    refreshSession().catch(() => {
      setBaseUri(null);
      setSettings(null);
      setIsLoading(false);
    });
  }, [refreshSession]);

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
