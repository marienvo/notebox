import {useState} from 'react';
import {Button, StyleSheet, Text, TextInput, View} from 'react-native';

import {useNotes} from '../../vault/hooks/useNotes';

export function InboxScreen() {
  const {create} = useNotes();
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [title, setTitle] = useState('');

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) {
      setStatusText('Title is required.');
      return;
    }

    if (!trimmedContent) {
      setStatusText('Note content is required.');
      return;
    }

    setStatusText(null);
    setIsSaving(true);
    try {
      await create(trimmedTitle, trimmedContent);
      setTitle('');
      setContent('');
      setStatusText('Saved to Vault.');
    } catch (error) {
      const fallbackMessage = 'Could not save this note.';
      setStatusText(error instanceof Error ? error.message : fallbackMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inbox</Text>
      <Text style={styles.description}>Capture an idea and store it as markdown.</Text>
      <TextInput
        onChangeText={setTitle}
        placeholder="Title"
        style={styles.input}
        value={title}
      />
      <TextInput
        multiline
        onChangeText={setContent}
        placeholder="Write your idea..."
        style={[styles.input, styles.textArea]}
        textAlignVertical="top"
        value={content}
      />
      <View style={styles.buttonRow}>
        <Button
          disabled={isSaving}
          onPress={handleSave}
          title={isSaving ? 'Saving...' : 'Save to Vault'}
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
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  description: {
    marginTop: 8,
  },
  input: {
    borderColor: '#9e9e9e',
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  status: {
    marginTop: 16,
    textAlign: 'center',
  },
  textArea: {
    minHeight: 140,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
});
