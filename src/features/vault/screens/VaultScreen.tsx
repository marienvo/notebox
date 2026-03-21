import {StackScreenProps} from '@react-navigation/stack';
import {useCallback} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {getNoteTitle} from '../../../core/storage/noteboxStorage';
import {VaultStackParamList} from '../../../navigation/types';
import {useNotes} from '../hooks/useNotes';

type VaultScreenProps = StackScreenProps<VaultStackParamList, 'Vault'>;

export function VaultScreen({navigation}: VaultScreenProps) {
  const {error, isLoading, notes, refresh} = useNotes();

  const openNote = useCallback(
    (noteUri: string, noteName: string) => {
      navigation.navigate('NoteDetail', {
        noteTitle: getNoteTitle(noteName),
        noteUri,
      });
    },
    [navigation],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vault</Text>
      <View style={styles.folderRow}>
        <Text style={styles.folderLabel}>Folder</Text>
        <Text style={styles.folderValue}>Inbox</Text>
      </View>
      {isLoading && notes.length === 0 ? (
        <ActivityIndicator style={styles.spinner} />
      ) : null}
      {error ? <Text style={styles.status}>{error}</Text> : null}
      <FlatList
        contentContainerStyle={styles.listContent}
        data={notes}
        keyExtractor={item => item.uri}
        refreshControl={
          <RefreshControl onRefresh={refresh} refreshing={isLoading} />
        }
        renderItem={({item}) => (
          <Pressable
            onPress={() => openNote(item.uri, item.name)}
            style={styles.noteRow}>
            <Text style={styles.noteTitle}>{getNoteTitle(item.name)}</Text>
            <Text numberOfLines={1} style={styles.noteMeta}>
              {item.uri}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={styles.status}>
              No markdown notes found in Inbox. Add one from the Inbox tab.
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  folderLabel: {
    color: '#616161',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  folderRow: {
    alignItems: 'center',
    borderColor: '#d6d6d6',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  folderValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  noteMeta: {
    color: '#616161',
    fontSize: 12,
    marginTop: 4,
  },
  noteRow: {
    borderBottomColor: '#d6d6d6',
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  spinner: {
    marginVertical: 10,
  },
  status: {
    marginVertical: 10,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
});
