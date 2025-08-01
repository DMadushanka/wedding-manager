import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  Alert,
  ActivityIndicator,
  Animated,
  ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import ProgressRing from '../component/ProgressRing';

const HomeScreen = ({ route }) => {
  const navigation = useNavigation();
  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;
  
  const [profileData, setProfileData] = useState({
    name: '',
    avatar: null,
    weddingDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.95));

  // Sample data
  const tasksCompleted = 12;
  const totalTasks = 25;
  const budgetSpent = 4500;
  const totalBudget = 10000;

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

    // Set up real-time listener for profile changes
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setProfileData(doc.data());
      }
    }, (error) => {
      // Only show the error if user still exists
      if (auth.currentUser) {
        console.error('Error listening to profile changes:', error);
        Alert.alert('Error', 'Failed to load profile data');
      }
    });

    // Cleanup listener on unmount or user change
    return () => unsubscribe();
  }, [user]);

  const navigateTo = (screen) => {
    navigation.navigate(screen);
  };

  const renderContent = () => {
    return (
      <View style={styles.container}>
        <View style={styles.topDecoration} />
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          
            {/* Profile Section in Header */}
            <View style={styles.header}>
              <View style={styles.greetingContainer}>
                <Text style={styles.greeting}>
                  Hello, {profileData.name || user?.email?.split('@')[0] || 'User'}!
                </Text>
                <Text style={styles.subtitle}>Welcome to your wedding planner</Text>
              </View>
              <TouchableOpacity 
                style={styles.profileButton}
                onPress={() => navigateTo('ProfileSettings')}
              >
                <Image
                  source={profileData.avatar ? { uri: profileData.avatar } : require('../assets/profile.png')}
                  style={styles.profileImage}
                />
                <View style={styles.editIconContainer}>
                  <Feather name="edit-2" size={16} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>
            <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >

            {/* Wedding Info Summary */}
            {profileData.weddingDate && (
              <View style={styles.weddingInfo}>
                <Feather name="calendar" size={24} color="#6B5B95" />
                <Text style={styles.weddingText}>
                  Wedding Date: {profileData.weddingDate}
                </Text>
              </View>
            )}

            {/* Stats Overview */}
            <View style={styles.statsContainer}>
              <View style={[styles.statCard, styles.taskStatCard]}>
                <ProgressRing
                  radius={40}
                  strokeWidth={8}
                  progress={tasksCompleted / totalTasks}
                  color="#FF6B6B"
                />
              </View>
            </View>
            
            {/* Quick Access Cards */}
            <TouchableOpacity 
              style={[styles.card, styles.taskCard]}
              onPress={() => navigateTo('Tasks')}
            >
              <View style={styles.cardIconContainer}>
                <Feather name="check-circle" size={24} color="#FF6B6B" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Task List</Text>
                <Text style={styles.cardText}>Manage your wedding tasks</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#999" style={styles.arrowIcon} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.card, styles.budgetCard]}
              onPress={() => navigateTo('Budget')}
            >
              <View style={styles.cardIconContainer}>
                <Feather name="dollar-sign" size={24} color="#4ECDC4" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Budget Tracker</Text>
                <Text style={styles.cardText}>Track your expenses</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#999" style={styles.arrowIcon} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.card, styles.notesCard]}
              onPress={() => navigateTo('Notes')}
            >
              <View style={styles.cardIconContainer}>
                <Feather name="edit" size={24} color="#6B5B95" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Wedding Notes</Text>
                <Text style={styles.cardText}>Save important ideas</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#999" style={styles.arrowIcon} />
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    );
  };

  return (
    <ImageBackground
      source={require('../assets/background.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      {renderContent()}
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 170,
    backgroundColor: 'rgba(231, 209, 8, 0.2)',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,


  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
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
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 25,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#ffcc00',
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },
  profileButton: {
    position: 'relative',
    width: 70,
    height: 70,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'black',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4ECDC4',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weddingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  weddingText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    backdropFilter: 'blur(10px)',
  },
  taskStatCard: {
    marginRight: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
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
  cardIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(209, 174, 16, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 5,
  },
  cardText: {
    fontSize: 14,
    color: '#cca300',
  },
  arrowIcon: {
    marginLeft: 10,
  },
});

export default HomeScreen;