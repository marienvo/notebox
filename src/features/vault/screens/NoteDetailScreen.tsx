import {StackScreenProps} from '@react-navigation/stack';
import {useEffect, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, Text, View} from 'react-native';
import Markdown from 'react-native-markdown-display';

import {VaultStackParamList} from '../../../navigation/types';
import {useNotes} from '../hooks/useNotes';

type NoteDetailScreenProps = StackScreenProps<VaultStackParamList, 'NoteDetail'>;

export function NoteDetailScreen({route}: NoteDetailScreenProps) {
  const {read} = useNotes();
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadNote = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const note = await read(route.params.noteUri);

        if (!isActive) {
          return;
        }

        setContent(note.content);
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        const fallbackMessage = 'Could not load this note.';
        setError(loadError instanceof Error ? loadError.message : fallbackMessage);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadNote().catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, [read, route.params.noteUri]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{route.params.noteTitle}</Text>
      {isLoading ? <ActivityIndicator style={styles.spinner} /> : null}
      {error ? <Text style={styles.status}>{error}</Text> : null}
      {!isLoading && !error ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Markdown>{content || '*Empty note*'}</Markdown>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  content: {
    paddingBottom: 24,
  },
  spinner: {
    marginVertical: 10,
  },
  status: {
    marginVertical: 10,
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
});
