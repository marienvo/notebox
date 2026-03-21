import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {RootStackParamList} from '../navigation/types';
import {clearUri, getSavedUri} from '../storage/appStorage';
import {
  initNotebox,
  readSettings,
  writeSettings,
} from '../storage/noteboxStorage';

type HomeNavigation = StackNavigationProp<RootStackParamList, 'Home'>;

export function HomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const [directoryUri, setDirectoryUri] = useState<string>('');
  const [displayName, setDisplayName] = useState('');
  const [statusText, setStatusText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadHomeData = async () => {
      try {
        const savedUri = await getSavedUri();

        if (!savedUri) {
          navigation.navigate('Setup');
          return;
        }

        await initNotebox(savedUri);
        const settings = await readSettings(savedUri);

        if (!isActive) {
          return;
        }

        setDirectoryUri(savedUri);
        setDisplayName(settings.displayName);
      } catch (error) {
        if (!isActive) {
          return;
        }

        const fallbackMessage =
          'Could not load settings. Please choose a directory again.';
        setStatusText(error instanceof Error ? error.message : fallbackMessage);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadHomeData().catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, [navigation]);

  const handleSave = async () => {
    const trimmedDisplayName = displayName.trim();

    if (!trimmedDisplayName) {
      setStatusText('Display name cannot be empty.');
      return;
    }

    if (!directoryUri) {
      setStatusText('No notes directory selected.');
      return;
    }

    setStatusText(null);
    setIsSaving(true);

    try {
      await writeSettings(directoryUri, {displayName: trimmedDisplayName});
      setDisplayName(trimmedDisplayName);
      setStatusText('Settings saved.');
    } catch (error) {
      const fallbackMessage = 'Could not save settings. Please try again.';
      setStatusText(error instanceof Error ? error.message : fallbackMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeDirectory = async () => {
    setStatusText(null);
    setIsSaving(true);

    try {
      await clearUri();
      navigation.navigate('Setup');
    } catch (error) {
      const fallbackMessage =
        'Could not clear the directory selection. Please try again.';
      setStatusText(error instanceof Error ? error.message : fallbackMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notebox Settings</Text>
      {isLoading ? (
        <ActivityIndicator style={styles.spinner} />
      ) : (
        <>
          <Text style={styles.label}>Selected directory</Text>
          <Text numberOfLines={2} style={styles.value}>
            {directoryUri}
          </Text>

          <Text style={styles.label}>Display name</Text>
          <TextInput
            onChangeText={setDisplayName}
            placeholder="Enter display name"
            style={styles.input}
            value={displayName}
          />

          <View style={styles.actionsRow}>
            <Button disabled={isSaving} onPress={handleSave} title="Save" />
          </View>
          <View style={styles.actionsRow}>
            <Button
              disabled={isSaving}
              onPress={handleChangeDirectory}
              title="Change directory"
            />
          </View>
        </>
      )}
      {statusText ? <Text style={styles.statusText}>{statusText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  spinner: {
    marginBottom: 12,
  },
  label: {
    fontWeight: '600',
    marginTop: 10,
  },
  value: {
    marginTop: 6,
  },
  input: {
    borderColor: '#9e9e9e',
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionsRow: {
    marginTop: 16,
  },
  statusText: {
    marginTop: 18,
    textAlign: 'center',
  },
});
