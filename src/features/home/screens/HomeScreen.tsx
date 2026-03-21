import {StyleSheet, Text, View} from 'react-native';

import {useVaultContext} from '../../../core/vault/VaultContext';

export function HomeScreen() {
  const {settings} = useVaultContext();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.subtitle}>
        {settings?.displayName ?? 'Notebox'}
      </Text>
      <Text style={styles.description}>
        Inbox for fast capture, Vault for your full note collection.
      </Text>
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
  description: {
    marginTop: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginTop: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
});
