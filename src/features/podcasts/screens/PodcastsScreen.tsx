import {StyleSheet, Text, View} from 'react-native';

export function PodcastsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Podcasts</Text>
      <Text style={styles.description}>
        Podcast playback is coming in a future release. The native audio library
        requires New Architecture support before it can be integrated.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  description: {
    marginTop: 8,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
});
