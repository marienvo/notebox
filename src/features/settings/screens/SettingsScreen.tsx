import {useNavigation} from '@react-navigation/native';
import {NavigationProp} from '@react-navigation/native';
import {useEffect, useState} from 'react';
import {Button, StyleSheet, Text, TextInput, View} from 'react-native';

import {RootStackParamList} from '../../../navigation/types';
import {useSettings} from '../hooks/useSettings';

type SettingsNavigation = NavigationProp<RootStackParamList>;

export function SettingsScreen() {
  const navigation = useNavigation<SettingsNavigation>();
  const {baseUri, clearDirectory, isSaving, saveSettings, settings} =
    useSettings();
  const [displayName, setDisplayName] = useState('');
  const [statusText, setStatusText] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(settings?.displayName ?? '');
  }, [settings?.displayName]);

  const handleSave = async () => {
    const trimmedDisplayName = displayName.trim();

    if (!trimmedDisplayName) {
      setStatusText('Display name cannot be empty.');
      return;
    }

    setStatusText(null);

    try {
      await saveSettings({displayName: trimmedDisplayName});
      setDisplayName(trimmedDisplayName);
      setStatusText('Settings saved.');
    } catch (error) {
      const fallbackMessage = 'Could not save settings. Please try again.';
      setStatusText(error instanceof Error ? error.message : fallbackMessage);
    }
  };

  const handleChangeDirectory = async () => {
    setStatusText(null);

    try {
      await clearDirectory();
      navigation.navigate('Setup');
    } catch (error) {
      const fallbackMessage =
        'Could not clear the directory selection. Please try again.';
      setStatusText(error instanceof Error ? error.message : fallbackMessage);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.label}>Selected directory</Text>
      <Text numberOfLines={2} style={styles.value}>
        {baseUri ?? 'No directory selected'}
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

      {statusText ? <Text style={styles.statusText}>{statusText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    marginTop: 16,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  input: {
    borderColor: '#9e9e9e',
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  label: {
    fontWeight: '600',
    marginTop: 10,
  },
  statusText: {
    marginTop: 18,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  value: {
    marginTop: 6,
  },
});
