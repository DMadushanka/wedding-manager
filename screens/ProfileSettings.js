import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  ScrollView,
  Platform,
  Animated,
  KeyboardAvoidingView,
  Modal,
  ImageBackground
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getAuth, signOut, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTheme } from '../context/ThemeContext';

const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/dppgmvcoh/image/upload';
const UPLOAD_PRESET = 'profile';

const ProfileSettings = ({ navigation }) => {
  const auth = getAuth();
  const db = getFirestore();
  const user = auth.currentUser;
  const { theme, currentTheme, toggleTheme } = useTheme();
  
  const [profileData, setProfileData] = useState({
    name: '',
    avatar: null,
    weddingDate: '',
    email: user?.email || '',
    phone: '',
    partnerName: '',
    venue: '',
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [tempDate, setTempDate] = useState(new Date());
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [phoneError, setPhoneError] = useState(''); // State to track phone number validation error

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    
    const fetchProfile = async () => {
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfileData(docSnap.data());
            if (docSnap.data().weddingDate) {
              setTempDate(new Date(docSnap.data().weddingDate));
            }
          }
        } catch (error) {
          Alert.alert('Error', 'Failed to load profile data');
          console.error('Error fetching profile:', error);
        }
      }
    };
    fetchProfile();
  }, [user]);

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'We need access to your photos to set a profile picture');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setUploading(true);
        // Compress image first
        const compressedImage = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 800 } }],
          { compress: 0.7, format: 'jpeg' }
        );
        
        // Update local state immediately
        setProfileData(prev => ({ ...prev, avatar: compressedImage.uri }));
        
        // Upload to Cloudinary
        const imageUrl = await uploadImageToCloudinary(compressedImage.uri);
        if (imageUrl) {
          await updateProfile({ avatar: imageUrl });
          Alert.alert('Success', 'Profile picture updated successfully!');
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to update profile picture');
    } finally {
      setUploading(false);
    }
  };

  const uploadImageToCloudinary = async (uri) => {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      });
      formData.append('upload_preset', UPLOAD_PRESET);

      const response = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', 'Could not upload image to server');
      return null;
    }
  };

  const updateProfile = async (newData) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to update your profile');
      return;
    }

    try {
      setLoading(true);
      await setDoc(
        doc(db, 'users', user.uid),
        { ...profileData, ...newData },
        { merge: true }
      );
    } catch (error) {
      console.error('Firestore update error:', error);
      Alert.alert('Error', 'Failed to save profile data');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = () => {
    const formattedDate = tempDate.toISOString().split('T')[0];
    setProfileData(prev => ({ ...prev, weddingDate: formattedDate }));
    setShowDatePicker(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              navigation.reset({
                index: 0,
                routes: [{ name: 'Auth' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const handleDeleteAccount = () => {
    setShowPasswordModal(true);
  };

  const confirmDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, passwordInput);
      await reauthenticateWithCredential(user, credential);
      // Delete user data from Firestore
      await deleteDoc(doc(db, 'users', user.uid));
      // Delete user from Firebase Auth
      await deleteUser(user);
      setShowPasswordModal(false);
      setPasswordInput('');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Signup', params: { accountDeleted: true } }],
      });
    } catch (error) {
      Alert.alert('Error', 'Re-authentication failed. Please check your password and try again.');
      console.error('Re-auth error:', error);
    } finally {
      setDeletingAccount(false);
    }
  };

  const validatePhoneNumber = (phone) => {
    if (!phone.startsWith('0')) {
      setPhoneError('Phone number must start with 0');
    } else if (!/^[0-9]+$/.test(phone)) {
      setPhoneError('Phone number must contain only numbers');
    } else if (phone.length !== 10) {
      setPhoneError('Phone number must be exactly 10 digits long');
    } else {
      setPhoneError(''); // Clear the error if the phone number is valid
    }
  };

  const renderSettingItem = (icon, label, value, onPress, isSwitch = false, switchValue = false, onSwitchChange = null) => (
    <TouchableOpacity 
      style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}
      onPress={onPress}
      disabled={isSwitch}
    >
      <View style={styles.settingItemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
          <Feather name={icon} size={20} color={theme.primary} />
        </View>
        <Text style={[styles.settingLabel, { color: theme.text }]}>{label}</Text>
      </View>
      {isSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: theme.primary, true: theme.accent }}
          thumbColor={theme.secondary}
        />
      ) : (
        <View style={styles.settingItemRight}>
          <Text style={[styles.settingValue, { color: theme.text + '80' }]}>{value}</Text>
          <Feather name="chevron-right" size={16} color={theme.text + '80'} />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderDatePickerModal = () => (
    <Modal
      visible={showDatePicker}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowDatePicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Wedding Date</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(false)}>
              <Feather name="x" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.dateInputContainer}>
            <Text style={[styles.dateLabel, { color: theme.text }]}>Year:</Text>
            <TextInput
              style={[styles.dateInput, { 
                backgroundColor: theme.background,
                color: theme.text,
                borderColor: theme.borderColor
              }]}
              keyboardType="number-pad"
              value={tempDate.getFullYear().toString()}
              onChangeText={(text) => {
                const year = parseInt(text) || tempDate.getFullYear();
                const newDate = new Date(tempDate);
                newDate.setFullYear(year);
                setTempDate(newDate);
              }}
              maxLength={4}
            />
          </View>
          
          <View style={styles.dateInputContainer}>
            <Text style={[styles.dateLabel, { color: theme.text }]}>Month:</Text>
            <TextInput
              style={[styles.dateInput, { 
                backgroundColor: theme.background,
                color: theme.text,
                borderColor: theme.borderColor
              }]}
              keyboardType="number-pad"
              value={(tempDate.getMonth() + 1).toString()}
              onChangeText={(text) => {
                const month = parseInt(text) || 1;
                const newDate = new Date(tempDate);
                newDate.setMonth(month - 1);
                setTempDate(newDate);
              }}
              maxLength={2}
            />
          </View>
          
          <View style={styles.dateInputContainer}>
            <Text style={[styles.dateLabel, { color: theme.text }]}>Day:</Text>
            <TextInput
              style={[styles.dateInput, { 
                backgroundColor: theme.background,
                color: theme.text,
                borderColor: theme.borderColor
              }]}
              keyboardType="number-pad"
              value={tempDate.getDate().toString()}
              onChangeText={(text) => {
                const day = parseInt(text) || 1;
                const newDate = new Date(tempDate);
                newDate.setDate(day);
                setTempDate(newDate);
              }}
              maxLength={2}
            />
          </View>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton, { borderColor: theme.borderColor }]}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={[styles.modalButtonText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.confirmButton, { backgroundColor: theme.primary }]}
              onPress={handleDateChange}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <ImageBackground
      source={require('../assets/background.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile Settings</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.profileSection, { opacity: fadeAnim }]}>
            <TouchableOpacity onPress={pickImage} style={styles.profileImageContainer}>
              <Image
                source={profileData.avatar ? { uri: profileData.avatar } : require('../assets/profile.png')}
                style={styles.profileImage}
              />
              {uploading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#FFA500" />
                </View>
              )}
              <View style={styles.editIconContainer}>
                <Feather name="camera" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.profileName}>
              {profileData.name || 'Add your name'}
            </Text>
            <Text style={styles.profileEmail}>
              {profileData.email}
            </Text>
          </Animated.View>

          <Animated.View style={[styles.settingsSection, { opacity: fadeAnim }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Personal Information</Text>
            
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Your Name</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.cardBackground,
                  color: theme.text,
                  borderColor: theme.borderColor
                }]}
                placeholder="Enter your name"
                placeholderTextColor={theme.text + '80'}
                value={profileData.name}
                onChangeText={(text) => setProfileData(prev => ({ ...prev, name: text }))}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Partner's Name</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.cardBackground,
                  color: theme.text,
                  borderColor: theme.borderColor
                }]}
                placeholder="Enter partner's name"
                placeholderTextColor={theme.text + '80'}
                value={profileData.partnerName}
                onChangeText={(text) => setProfileData(prev => ({ ...prev, partnerName: text }))}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Phone Number</Text>
              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: theme.cardBackground,
                    color: theme.text,
                    borderColor: phoneError ? 'red' : theme.borderColor, // Highlight border in red if there's an error
                  },
                ]}
                placeholder="Enter phone number"
                placeholderTextColor={theme.text + '80'}
                keyboardType="phone-pad"
                value={profileData.phone}
                onChangeText={(text) => {
                  setProfileData((prev) => ({ ...prev, phone: text }));
                  validatePhoneNumber(text); // Validate the phone number in real-time
                }}
              />
              {phoneError ? (
                <Text style={styles.errorText}>{phoneError}</Text> // Display error message
              ) : null}
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Wedding Venue</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.cardBackground,
                  color: theme.text,
                  borderColor: theme.borderColor
                }]}
                placeholder="Enter wedding venue"
                placeholderTextColor={theme.text + '80'}
                value={profileData.venue}
                onChangeText={(text) => setProfileData(prev => ({ ...prev, venue: text }))}
              />
            </View>

            <TouchableOpacity 
              style={[styles.datePickerButton, { backgroundColor: theme.cardBackground }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.datePickerButtonText, { color: theme.text }]}>
                Wedding Date: {profileData.weddingDate || 'Select Date'}
              </Text>
              <Feather name="calendar" size={20} color={theme.primary} />
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[styles.settingsSection, { opacity: fadeAnim }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>App Settings</Text>
            
            {renderSettingItem(
              'moon',
              'Dark Mode',
              '',
              null,
              true,
              currentTheme === 'dark',
              toggleTheme
            )}
            
            {renderSettingItem(
              'bell',
              'Notifications',
              'On',
              () => Alert.alert('Coming Soon', 'Notification settings will be available soon!')
            )}
            
            {renderSettingItem(
              'lock',
              'Privacy',
              'Public',
              () => Alert.alert('Coming Soon', 'Privacy settings will be available soon!')
            )}
          </Animated.View>

          <Animated.View style={[styles.settingsSection, { opacity: fadeAnim }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Account</Text>
            
            {renderSettingItem(
              'key',
              'Change Password',
              '',
              () => Alert.alert('Coming Soon', 'Password change will be available soon!')
            )}
            
            {renderSettingItem(
              'trash-2',
              'Delete Account',
              '',
              handleDeleteAccount,
             
            )}
          </Animated.View>

          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: theme.primary }]}
            onPress={async () => {
              if (phoneError || !profileData.phone) {
                Alert.alert(
                  "Can't Save Your Data",
                  'Please fill in the information correctly before saving.'
                );
                return;
              }

              try {
                await updateProfile(profileData);
                Alert.alert('Success', 'Profile updated successfully!');
              } catch (error) {
                Alert.alert('Error', 'Failed to update profile');
              }
            }}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: theme.secondary }]}
            onPress={handleLogout}
          >
            <Feather name="log-out" size={20} color="#fff" style={styles.logoutIcon} />
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      
      {renderDatePickerModal()}

      {/* Password Modal for Account Deletion */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 15, padding: 24, width: '85%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Confirm Account Deletion</Text>
            <Text style={{ marginBottom: 16 }}>Please enter your password to confirm account deletion:</Text>
            <TextInput
              placeholder="Password"
              secureTextEntry
              value={passwordInput}
              onChangeText={setPasswordInput}
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 20 }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)} style={{ marginRight: 16 }} disabled={deletingAccount}>
                <Text style={{ color: '#888', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDeleteAccount} disabled={deletingAccount || !passwordInput}>
                <Text style={{ color: '#FF6B6B', fontWeight: 'bold' }}>{deletingAccount ? 'Deleting...' : 'Delete'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: 'rgba(243, 188, 9, 0.3)',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(247, 171, 7, 0.3)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 202, 11, 0.2)',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(245, 210, 14, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: 'rgba(32, 30, 12, 0.3)',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 202, 11, 0.2)',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#fff',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 165, 0, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
    textShadowColor: 'rgba(245, 210, 14, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  profileEmail: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textShadowColor: 'rgba(245, 210, 14, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  settingsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    height: 50,
    borderRadius: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    fontSize: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  settingItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 14,
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: 15,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  dateLabel: {
    width: 60,
    fontSize: 16,
  },
  dateInput: {
    flex: 1,
    height: 45,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    height: 45,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    padding: 5,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 80,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    
  },
  logoutIcon: {
    marginRight: 10,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  datePickerButtonText: {
    fontSize: 16,
  },
  errorText: {
    color: '#660000',
    fontSize: 14,
    marginTop: 4,
  },
});

export default ProfileSettings;