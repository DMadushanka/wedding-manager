import React, { useState, useEffect } from 'react';
import { View, FlatList, TextInput, ActivityIndicator, TouchableOpacity, Text, StyleSheet, Alert, Animated, ScrollView, ImageBackground } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { onSnapshot } from 'firebase/firestore';
import { getUserNotesRef, addNoteToFirestore, deleteNoteFromFirestore } from '../services/FirebaseService';

const colorOptions = ['#4ECDC4', '#FF6B6B', '#FFD93D', '#6A67CE'];
const emojiOptions = ['📝', '💡', '📌', '✅', '🧠', '🎯'];

const NoteScreen = () => {
  const { user } = useAuth();
  const [newTitle, setNewTitle] = useState('');
  const [newNote, setNewNote] = useState('');
  const [notes, setNotes] = useState([]);
  const [selectedColor, setSelectedColor] = useState(colorOptions[0]);
  const [selectedEmoji, setSelectedEmoji] = useState(emojiOptions[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.95));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(getUserNotesRef(), (querySnapshot) => {
      try {
        const notesData = [];
        querySnapshot.forEach((doc) => {
          notesData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setNotes(notesData);
        setError(null);
      } catch (err) {
        console.error('Error fetching notes:', err);
        setError('Failed to load notes');
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error('Error in notes subscription:', error);
      setError('Failed to load notes');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const cycleColor = () => {
    const index = colorOptions.indexOf(selectedColor);
    const nextIndex = (index + 1) % colorOptions.length;
    setSelectedColor(colorOptions[nextIndex]);
  };

  const cycleEmoji = () => {
    const index = emojiOptions.indexOf(selectedEmoji);
    const nextIndex = (index + 1) % emojiOptions.length;
    setSelectedEmoji(emojiOptions[nextIndex]);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    const newNoteData = {
      title: newTitle.trim() || 'Untitled',
      text: newNote.trim(),
      color: selectedColor,
      emoji: selectedEmoji,
      createdAt: new Date().toISOString(),
    };

    // Create a temporary note with an ID for optimistic update
    const tempId = Date.now().toString();
    const tempNote = { ...newNoteData, id: tempId };

    try {
      // Optimistically update the UI
      setNotes(prevNotes => [...prevNotes, tempNote]);
      setNewNote('');
      setNewTitle('');

      // Add to Firestore
      await addNoteToFirestore(newNoteData);
    } catch (error) {
      // Revert optimistic update on error
      setNotes(prevNotes => prevNotes.filter(note => note.id !== tempId));
      Alert.alert('Error', 'Failed to add note');
      console.error(error);
    }
  };

  const handleDeleteNote = async (id) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            // Store the original state for potential revert
            const noteToDelete = notes.find(note => note.id === id);
            const originalNotes = [...notes];
            
            try {
              // Optimistically update the UI
              setNotes(prevNotes => prevNotes.filter(note => note.id !== id));
              
              await deleteNoteFromFirestore(id);
            } catch (error) {
              // Revert optimistic update on error
              setNotes(originalNotes);
              Alert.alert('Error', 'Failed to delete note');
              console.error(error);
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  if (!user) {
    return (
      <View style={styles.authContainer}>
        <Text style={styles.authText}>Please sign in to view your notes</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Loading notes...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={50} color="#FF6B6B" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            setError(null);
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('../assets/background.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.container}>
        <View style={styles.topDecoration} />
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          
            <View style={styles.header}>
              <Text style={styles.title}>My Notes</Text>
            
            </View>
            <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Title"
                placeholderTextColor="#999"
                value={newTitle}
                onChangeText={setNewTitle}
              />
              <TextInput
                style={[styles.input, styles.noteInput]}
                placeholder="Write your note..."
                placeholderTextColor="#999"
                value={newNote}
                onChangeText={setNewNote}
                multiline
              />

              <View style={styles.tagRow}>
                <TouchableOpacity onPress={cycleColor} style={styles.colorButton}>
                  <View style={[styles.colorTag, { backgroundColor: selectedColor }]} />
                  <Text style={styles.colorText}>Color</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={cycleEmoji} style={styles.emojiButton}>
                  <Text style={styles.emoji}>{selectedEmoji}</Text>
                  <Text style={styles.emojiText}>Emoji</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.addButton} onPress={handleAddNote}>
                  <Feather name="plus" size={24} color="#fff" />
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Your Notes</Text>
            
            {notes.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="file-text" size={50} color="#e0e0e0" />
                <Text style={styles.emptyText}>No notes found</Text>
                <Text style={styles.emptySubtext}>Add your first note to get started</Text>
              </View>
            ) : (
              <View style={styles.notesList}>
                {notes.map((item) => (
                  <Animated.View 
                    key={item.id}
                    style={[
                      styles.noteCard, 
                      { 
                        borderLeftColor: item.color || '#4ECDC4',
                        borderLeftWidth: 5,
                        transform: [{ scale: 1 }]
                      }
                    ]}
                  >
                    <View style={styles.noteContent}>
                      <Text style={styles.noteTitle}>{item.title}</Text>
                      <Text style={styles.noteText}>{item.text}</Text>
                    </View>
                    <View style={styles.noteFooter}>
                      <Text style={styles.emoji}>{item.emoji}</Text>
                      <TouchableOpacity 
                        onPress={() => handleDeleteNote(item.id)}
                        style={styles.deleteButton}
                      >
                        <Feather name="trash-2" size={20} color="#FF6B6B" />
                      </TouchableOpacity>
                    </View>
                  </Animated.View>
                ))}
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(245, 229, 6, 0.8)',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    opacity: 0.2,
  },

  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    backdropFilter: 'blur(10px)',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 5,
    letterSpacing: 0.5,
  },

  inputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    backdropFilter: 'blur(10px)',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 15,
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  noteInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  colorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  colorTag: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 8,
  },
  colorText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  emojiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emoji: {
    fontSize: 24,
    marginRight: 8,
  },
  emojiText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#4ECDC4',
    padding: 10,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 15,
    letterSpacing: 0.3,
  },
  noteCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 20,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    backdropFilter: 'blur(10px)',
  },
  noteContent: {
    flex: 1,
    marginRight: 10,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  noteText: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
  },
  noteFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 10,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
    letterSpacing: 0.3,
  },
  emptySubtext: {
    marginTop: 5,
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  authText: {
    fontSize: 16,
    color: '#666',
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  notesList: {
    marginTop: 10,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

export default NoteScreen;
