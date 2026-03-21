import {StackNavigationProp} from '@react-navigation/stack';
import {useNavigation} from '@react-navigation/native';
import {useState} from 'react';
import {
  ActivityIndicator,
  Button,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {openDocumentTree} from 'react-native-saf-x';

import {RootStackParamList} from '../navigation/types';
import {saveUri} from '../storage/appStorage';

type SetupNavigation = StackNavigationProp<RootStackParamList, 'Setup'>;

export function SetupScreen() {
  const navigation = useNavigation<SetupNavigation>();
  const [statusText, setStatusText] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAndroid = Platform.OS === 'android';

  const handleChooseDirectory = async () => {
    if (!isAndroid || isSubmitting) {
      return;
    }

    setStatusText(null);
    setIsSubmitting(true);

    try {
      const selectedDirectory = await openDocumentTree(true);

      if (!selectedDirectory?.uri) {
        setStatusText('Selection canceled.');
        return;
      }

      await saveUri(selectedDirectory.uri);
      navigation.navigate('Home');
    } catch (error) {
      const fallbackMessage =
        'Could not save this directory. Please try again.';
      setStatusText(error instanceof Error ? error.message : fallbackMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set up Notebox</Text>
      <Text style={styles.description}>
        Choose the directory where Notebox can store its app data.
      </Text>
      {!isAndroid ? (
        <Text style={styles.statusText}>
          Directory selection is currently supported on Android only.
        </Text>
      ) : null}
      <View style={styles.buttonRow}>
        <Button
          disabled={!isAndroid || isSubmitting}
          onPress={handleChooseDirectory}
          title="Choose Notes Directory"
        />
      </View>
      {isSubmitting ? <ActivityIndicator style={styles.spinner} /> : null}
      {statusText ? <Text style={styles.statusText}>{statusText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  description: {
    marginTop: 12,
    textAlign: 'center',
  },
  buttonRow: {
    marginTop: 20,
  },
  spinner: {
    marginTop: 16,
  },
  statusText: {
    marginTop: 16,
    textAlign: 'center',
  },
});
