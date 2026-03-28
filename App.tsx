/**
 * @format
 */

import {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import {GluestackUIProvider} from '@gluestack-ui/themed';
import {config} from '@gluestack-ui/config';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {KeyboardProvider} from 'react-native-keyboard-controller';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {resolveInitialRoute} from './src/core/bootstrap/resolveInitialRoute';
import {reportUnexpectedError} from './src/core/observability/reportUnexpectedError';
import {VaultProvider} from './src/core/vault/VaultContext';
import {prepareVaultSession} from './src/core/vault/applyVaultSession';
import {RootNavigator} from './src/navigation/RootNavigator';
import {RootStackParamList} from './src/navigation/types';
import {clearUri} from './src/core/storage/appStorage';
import {readPlaylistCoalesced} from './src/core/storage/noteboxStorage';
import {setPodcastBootstrapPayload} from './src/features/podcasts/services/podcastBootstrapCache';
import {runPodcastPhase1} from './src/features/podcasts/services/podcastPhase1';
import {NoteSummary, NoteboxSettings} from './src/types';
import {appBreadcrumb} from './src/core/observability/appBreadcrumb';
import {elapsedMsSinceJsBundleEval} from './src/core/observability/startupTiming';
import {NotesProvider} from './src/core/vault/NotesContext';
import {StartupSplashContent} from './src/core/ui/StartupSplashContent';

type InitialRoute = keyof RootStackParamList;

type VaultInitialSession = {
  uri: string;
  settings: NoteboxSettings;
  inboxContentByUri: Record<string, string> | null;
  inboxPrefetch: NoteSummary[] | null;
};

const STARTUP_SPINNER_FADE_MS = 400;
const STARTUP_SPINNER_DELAY_MS = 90;

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [initialRoute, setInitialRoute] = useState<InitialRoute | null>(null);
  const [initialSession, setInitialSession] = useState<VaultInitialSession | null>(null);

  const startupSpinnerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const easing = Easing.out(Easing.cubic);
    Animated.sequence([
      Animated.delay(STARTUP_SPINNER_DELAY_MS),
      Animated.timing(startupSpinnerOpacity, {
        toValue: 1,
        duration: STARTUP_SPINNER_FADE_MS,
        easing,
        useNativeDriver: true,
      }),
    ]).start();
  }, [startupSpinnerOpacity]);

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
            appBreadcrumb({
              category: 'app',
              message: 'bootstrap.podcast_phase1.start',
              data: {
                elapsed_ms: elapsedMsSinceJsBundleEval(),
              },
            });

            const podcastPhase1Promise = runPodcastPhase1(savedUri)
              .then(phase1 => {
                setPodcastBootstrapPayload(savedUri, {
                  allEpisodes: phase1.allEpisodes,
                  didFullVaultListingThisRefresh: phase1.didFullVaultListingThisRefresh,
                  error: phase1.error,
                  podcastRelevantFiles: phase1.podcastRelevantFiles,
                  rssFeedFiles: phase1.rssFeedFiles,
                  sections: phase1.sections,
                });
                appBreadcrumb({
                  category: 'app',
                  message: 'bootstrap.podcast_phase1.complete',
                  data: {
                    elapsed_ms: elapsedMsSinceJsBundleEval(),
                    episode_count: phase1.allEpisodes.length,
                    has_error: Boolean(phase1.error),
                  },
                });
                return phase1;
              })
              .catch(error => {
                reportUnexpectedError(error, {flow: 'app_bootstrap', step: 'podcast_phase1'});
                setPodcastBootstrapPayload(savedUri, {
                  allEpisodes: [],
                  didFullVaultListingThisRefresh: false,
                  error: 'Could not load podcasts from vault.',
                  podcastRelevantFiles: [],
                  rssFeedFiles: [],
                  sections: [],
                });
                return null;
              });

            const [prepared] = await Promise.all([
              vaultPreloadPromise,
              playlistPrimePromise,
              podcastPhase1Promise,
            ]);

            const initial: VaultInitialSession = {
              uri: savedUri,
              settings: prepared.settings,
              inboxContentByUri: prepared.inboxContentByUri,
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
        <KeyboardProvider>
          <SafeAreaProvider>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            {initialRoute === null ? (
              <View
                accessibilityLabel="Loading"
                style={[
                  styles.loadingContainer,
                  isDarkMode ? styles.loadingContainerDark : styles.loadingContainerLight,
                ]}>
                <View style={styles.startupLogoVerticalBalance} />
                <StartupSplashContent isDarkMode={isDarkMode} />
                <View style={styles.startupSpinnerSlot}>
                  <Animated.View style={{opacity: startupSpinnerOpacity}}>
                    <ActivityIndicator
                      color={isDarkMode ? '#ffffff' : '#333333'}
                      style={styles.startupSpinner}
                    />
                  </Animated.View>
                </View>
              </View>
            ) : (
              <VaultProvider initialSession={initialSession}>
                <NotesProvider>
                  <RootNavigator initialRouteName={initialRoute} />
                </NotesProvider>
              </VaultProvider>
            )}
          </SafeAreaProvider>
        </KeyboardProvider>
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
  },
  /** Equal flex regions so the logo sits on the vertical midline; spinner lives below without shifting the logo. */
  startupLogoVerticalBalance: {
    paddingTop: 10,
    flex: 1,
  },
  startupSpinnerSlot: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 24,
    width: '100%',
  },
  loadingContainerDark: {
    backgroundColor: '#121212',
  },
  loadingContainerLight: {
    backgroundColor: '#f5f5f5',
  },
  startupSpinner: {},
});

export default App;
