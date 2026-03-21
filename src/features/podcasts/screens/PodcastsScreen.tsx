import {useState} from 'react';
import {Button, StyleSheet, Text, View} from 'react-native';
import TrackPlayer from 'react-native-track-player';

export function PodcastsScreen() {
  const [isInitializing, setIsInitializing] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(
    'Player not initialized for this session.',
  );

  const handleInitializePlayer = async () => {
    setStatusText(null);
    setIsInitializing(true);
    try {
      await TrackPlayer.setupPlayer();
      setStatusText('Audio player initialized. Device validation required.');
    } catch (error) {
      const fallbackMessage = 'Could not initialize podcast audio player.';
      setStatusText(error instanceof Error ? error.message : fallbackMessage);
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Podcasts</Text>
      <Text style={styles.description}>
        MVP spike for native podcast playback integration.
      </Text>
      <View style={styles.buttonRow}>
        <Button
          disabled={isInitializing}
          onPress={handleInitializePlayer}
          title={isInitializing ? 'Initializing...' : 'Initialize Audio Player'}
        />
      </View>
      {statusText ? <Text style={styles.status}>{statusText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    marginTop: 16,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  description: {
    marginTop: 8,
    textAlign: 'center',
  },
  status: {
    marginTop: 16,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
});
