/**
 * @format
 */

import {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import {GluestackUIProvider} from '@gluestack-ui/themed';
import {config} from '@gluestack-ui/config';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {resolveInitialRoute} from './src/core/bootstrap/resolveInitialRoute';
import {reportUnexpectedError} from './src/core/observability/reportUnexpectedError';
import {VaultProvider} from './src/core/vault/VaultContext';
import {prepareVaultSession} from './src/core/vault/applyVaultSession';
import {RootNavigator} from './src/navigation/RootNavigator';
import {RootStackParamList} from './src/navigation/types';
import {clearUri} from './src/core/storage/appStorage';
import {readPlaylistCoalesced} from './src/core/storage/noteboxStorage';
import {loadPersistentRssFeedUrlCache} from './src/features/podcasts/services/rssFeedUrlCache';
import {NoteSummary, NoteboxSettings} from './src/types';
import {appBreadcrumb} from './src/core/observability/appBreadcrumb';
import {elapsedMsSinceJsBundleEval} from './src/core/observability/startupTiming';

type InitialRoute = keyof RootStackParamList;

type VaultInitialSession = {
  uri: string;
  settings: NoteboxSettings;
  inboxPrefetch: NoteSummary[] | null;
};

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [initialRoute, setInitialRoute] = useState<InitialRoute | null>(null);
  const [initialSession, setInitialSession] = useState<VaultInitialSession | null>(null);

  useEffect(() => {
    let isActive = true;

    const bootstrap = async () => {
      try {
        const {route, savedUri} = await resolveInitialRoute();
        if (isActive) {
          if (route === 'MainTabs' && savedUri) {
            appBreadcrumb({
              category: 'app',
              message: 'bootstrap.vault_preload.start',
              data: {
                elapsed_ms: elapsedMsSinceJsBundleEval(),
              },
            });

            const vaultPreloadPromise = prepareVaultSession(savedUri);
            const playlistPrimePromise = readPlaylistCoalesced(savedUri)
              .then(entry => {
                appBreadcrumb({
                  category: 'app',
                  message: 'bootstrap.playlist_prime.complete',
                  data: {
                    has_playlist: Boolean(entry),
                    elapsed_ms: elapsedMsSinceJsBundleEval(),
                  },
                });
                return entry;
              })
              .catch(error => {
                reportUnexpectedError(error, {flow: 'app_bootstrap', step: 'playlist_prime'});
                return null;
              });
            const rssPrimePromise = loadPersistentRssFeedUrlCache(savedUri).catch(error => {
              reportUnexpectedError(error, {flow: 'app_bootstrap', step: 'rss_prime'});
              return;
            });

            const [prepared] = await Promise.all([
              vaultPreloadPromise,
              playlistPrimePromise,
              rssPrimePromise,
            ]);

            const initial: VaultInitialSession = {
              uri: savedUri,
              settings: prepared.settings,
              inboxPrefetch: prepared.inboxPrefetch,
            };

            setInitialSession(initial);
            appBreadcrumb({
              category: 'app',
              message: 'bootstrap.vault_preload.complete',
              data: {
                elapsed_ms: elapsedMsSinceJsBundleEval(),
              },
            });
          }

          setInitialRoute(route);
        }
      } catch (error) {
        reportUnexpectedError(error, {flow: 'app_bootstrap', step: 'resolve_initial_route'});
        await clearUri();
        if (isActive) {
          setInitialSession(null);
          setInitialRoute('Setup');
        }
      }
    };

    bootstrap().catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <GluestackUIProvider colorMode={isDarkMode ? 'dark' : 'light'} config={config}>
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
          {initialRoute === null ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
            </View>
          ) : (
            <VaultProvider initialSession={initialSession}>
              <RootNavigator initialRouteName={initialRoute} />
            </VaultProvider>
          )}
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </GluestackUIProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});

export default App;
