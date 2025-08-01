import React, { useState, useEffect } from 'react';
import { View, FlatList, TextInput, ActivityIndicator, TouchableOpacity, Text, StyleSheet, Modal, Animated, Alert, ImageBackground } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import CategoryPicker from '../component/CategoryPicker';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { 
  getUserTasksRef,
  addTaskToFirestore,
  toggleTaskInFirestore,
  deleteTaskFromFirestore,
  getTasks
} from '../services/FirebaseService';
import { onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

const TaskListScreen = () => {
  const { user } = useAuth();
  const [newTask, setNewTask] = useState('');
  const [tasks, setTasks] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.95));
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [deadline, setDeadline] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const categories = ['All', 'General', 'Venue', 'Catering', 'Attire', 'Photography', 'Other'];
  
  const categoryColors = {
    General: '#4ECDC4',
    Venue: '#FF6B6B',
    Catering: '#FFD93D',
    Attire: '#6B5B95',
    Photography: '#45B7D1',
    Other: '#96CEB4'
  };

  // Animation setup
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

  // Initial load when component mounts
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(getUserTasksRef(), (querySnapshot) => {
      try {
        const tasksData = [];
        querySnapshot.forEach((doc) => {
          tasksData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setTasks(tasksData);
        setError(null);
      } catch (err) {
        console.error('Error fetching tasks:', err);
        setError('Failed to load tasks');
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error('Error in tasks subscription:', error);
      setError('Failed to load tasks');
      setLoading(false);
    });

    // Set up timer for deadline countdown
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [user]);

  const filteredTasks = selectedCategory === 'All' 
    ? tasks 
    : tasks.filter(task => task.category === selectedCategory);

  const handleAddTask = async () => {
    if (!newTask.trim()) return;

    const newTaskData = {
      text: newTask.trim(),
      completed: false,
      category: 'General',
      createdAt: new Date().toISOString(),
      deadline: deadline ? deadline.toISOString() : null
    };

    // Create a temporary task with an ID for optimistic update
    const tempId = Date.now().toString();
    const tempTask = { ...newTaskData, id: tempId };

    try {
      // Optimistically update the UI
      setTasks(prevTasks => [...prevTasks, tempTask]);
      setNewTask('');
      setDeadline(null);

      // Add to Firestore
      await addTaskToFirestore(newTaskData);
    } catch (error) {
      // Revert optimistic update on error
      setTasks(prevTasks => prevTasks.filter(task => task.id !== tempId));
      Alert.alert('Error', 'Failed to add task');
      console.error(error);
    }
  };

  const toggleTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    const originalTasks = [...tasks];
    
    try {
      // Optimistically update the UI
      setTasks(prevTasks => 
        prevTasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
      );
      
      await toggleTaskInFirestore(id, !task.completed);
    } catch (error) {
      // Revert optimistic update on error
      setTasks(originalTasks);
      Alert.alert('Error', 'Failed to update task');
      console.error(error);
    }
  };

  const deleteTask = async (id) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            // Store the original state for potential revert
            const taskToDelete = tasks.find(task => task.id === id);
            const originalTasks = [...tasks];
            
            try {
              // Optimistically update the UI
              setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
              
              await deleteTaskFromFirestore(id);
            } catch (error) {
              // Revert optimistic update on error
              setTasks(originalTasks);
              Alert.alert('Error', 'Failed to delete task');
              console.error(error);
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  const formatTimeRemaining = (deadline) => {
    if (!deadline) return null;
    
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate - currentTime;

    if (diff <= 0) return 'Overdue';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const handleDateConfirm = (date) => {
    setDatePickerVisible(false);
    setDeadline(date);
  };

  if (!user) {
    return (
      <View style={styles.authContainer}>
        <Text style={styles.authText}>Please sign in to view your tasks</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Loading tasks...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-triangle" size={50} color="#FF6B6B" />
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
            <Text style={styles.title}>Wedding Tasks</Text>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Add a new task..."
              placeholderTextColor="#999"
              value={newTask}
              onChangeText={setNewTask}
              onSubmitEditing={handleAddTask}
              editable={!isSubmitting}
            />
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setDatePickerVisible(true)}
              disabled={isSubmitting}
            >
              <Feather name="calendar" size={20} color={deadline ? "#4ECDC4" : "#999"} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.addButton, isSubmitting && styles.disabledButton]}
              onPress={handleAddTask}
              disabled={isSubmitting}
            >
              <View style={styles.addButtonContent}>
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Feather name="plus" size={24} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
          </View>

          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="datetime"
            onConfirm={handleDateConfirm}
            onCancel={() => setDatePickerVisible(false)}
            minimumDate={new Date()}
          />

          {filteredTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="check-circle" size={50} color="#e0e0e0" />
              <Text style={styles.emptyText}>No tasks found</Text>
            </View>
          ) : (
            <FlatList
              data={filteredTasks}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <Animated.View 
                  style={[
                    styles.taskCard,
                    { borderLeftColor: categoryColors[item.category] || '#4ECDC4' }
                  ]}
                >
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => toggleTask(item.id)}
                    disabled={isSubmitting}
                  >
                    {item.completed ? (
                      <View style={styles.checkboxCompleted}>
                        <Feather name="check" size={20} color="#fff" />
                      </View>
                    ) : (
                      <View style={styles.checkboxEmpty} />
                    )}
                  </TouchableOpacity>
                  <View style={styles.taskContent}>
                    <Text 
                      style={[
                        styles.taskTitle,
                        item.completed && styles.completedTask
                      ]}
                    >
                      {item.text}
                    </Text>
                    <Text 
                      style={[
                        styles.taskDescription,
                        item.completed && styles.completedTask
                      ]}
                    >
                      {item.category}
                    </Text>
                    <View style={styles.taskFooter}>
                      {item.deadline && (
                        <Text style={[
                          styles.deadlineText,
                          new Date(item.deadline) < new Date() && styles.overdueText
                        ]}>
                          {formatTimeRemaining(item.deadline)}
                        </Text>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => deleteTask(item.id)}
                    disabled={isSubmitting}
                  >
                    <Feather name="trash-2" size={20} color="#FF6B6B" />
                  </TouchableOpacity>
                </Animated.View>
              )}
            />
          )}

          <Modal
            visible={showCategoryPicker}
            transparent={true}
            animationType="slide"
          >
            <CategoryPicker
              categories={categories}
              selectedCategory={selectedCategory}
              onSelect={setSelectedCategory}
              onClose={() => setShowCategoryPicker(false)}
            />
          </Modal>
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
    height: 150,
    backgroundColor: 'rgba(247, 231, 6, 0.2)',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  
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
  taskCard: {
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
  taskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 5,
  },
  taskDescription: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 15,
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
  input: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 15,
    marginRight: 10,
    fontSize: 16,
    color: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateButton: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#4ECDC4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskContent: {
    flex: 1,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deadlineText: {
    fontSize: 12,
    color: '#4ECDC4',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  overdueText: {
    color: '#FF6B6B',
  },
  deleteButton: {
    marginLeft: 10,
    padding: 8,
    backgroundColor: '#fff5f5',
    borderRadius: 12,
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
  listContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 20,
    fontSize: 16,
    color: '#FF6B6B',
    marginBottom: 20,
  },
  retryButton: {
    padding: 15,
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.7,
  },
  checkbox: {
    marginRight: 15,
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  checkboxCompleted: {
    width: '100%',
    height: '100%',
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxEmpty: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
  },
  completedTask: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

export default TaskListScreen;