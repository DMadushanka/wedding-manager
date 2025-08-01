import React, { useState, useEffect } from 'react';
import {StyleSheet,Text,View,TextInput,SafeAreaView,TouchableOpacity,StatusBar,Modal,ImageBackground} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const Signup = ({ navigation, route }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState(''); // State for email validation error
  const [passwordError, setPasswordError] = useState(''); // State for password validation error
  const [modalVisible, setModalVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [showDeletedMessage, setShowDeletedMessage] = useState(false);

  const db = getFirestore();

  useEffect(() => {
    if (route?.params?.accountDeleted) {
      setShowDeletedMessage(true);
      const timer = setTimeout(() => setShowDeletedMessage(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [route?.params?.accountDeleted]);

  // Email validation function
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Simple email regex
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address.');
    } else {
      setEmailError('');
    }
  };

  // Password validation function
  const validatePassword = (password) => {
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
    } else {
      setPasswordError('');
    }
  };

  const onHandleSignup = () => {
    if (emailError || passwordError || !email.trim() || !password.trim()) {
      setAlertMessage('Please fix the errors before signing up.');
      setModalVisible(true);
      return;
    }

    createUserWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        const userName = email.split('@')[0];
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name: userName,
          avatar: null,
          email: email,
        }, { merge: true });

        await setDoc(doc(db, 'users', userCredential.user.uid, 'budget', 'current'), {
          amount: 10000,
          percentage: 0,
        });

        console.log('Signup success');
        navigation.navigate('Main');
      })
      .catch((err) => {
        let errorMessage = 'An unknown error occurred. Please try again.';

        switch (err.code) {
          case 'auth/invalid-email':
            errorMessage = 'The email address format is incorrect.';
            break;
          case 'auth/email-already-in-use':
            errorMessage = 'This email is already registered. Try logging in.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password should be at least 6 characters.';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'Signup is currently disabled. Please try again later.';
            break;
          default:
            errorMessage = err.message;
        }

        setAlertMessage(errorMessage);
        setModalVisible(true);
      });
  };

  return (
    <ImageBackground
      source={require('../assets/startbackground.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      {showDeletedMessage && (
        <View style={{ position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center', zIndex: 10 }}>
          <View style={{ backgroundColor: 'rgba(76, 205, 196, 0.95)', padding: 14, borderRadius: 10, marginHorizontal: 30 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Your account has been successfully deleted.</Text>
          </View>
        </View>
      )}
      <View style={styles.container}>
        <SafeAreaView style={styles.form}>
          <Text style={styles.title}>Sign Up</Text>
          <TextInput
            style={[
              styles.input,
              { borderColor: emailError ? 'orange' : 'rgba(255, 255, 255, 0.3)' },
            ]}
            placeholder="Enter email"
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              validateEmail(text); // Validate email in real-time
            }}
          />
          {emailError ? (
            <Text style={styles.validationMessage}>{emailError}</Text>
          ) : null}

          <TextInput
            style={[
              styles.input,
              { borderColor: passwordError ? 'orange' : 'rgba(255, 255, 255, 0.3)' },
            ]}
            placeholder="Enter password"
            autoCapitalize="none"
            secureTextEntry={true}
            textContentType="password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              validatePassword(text); // Validate password in real-time
            }}
          />
          {passwordError ? (
            <Text style={styles.validationMessage}>{passwordError}</Text>
          ) : null}

          <TouchableOpacity style={styles.button} onPress={onHandleSignup}>
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>
          <View style={styles.loginRedirect}>
            <Text style={styles.text}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkText}> Log In</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        <StatusBar barStyle="light-content" />

        <Modal transparent={true} visible={modalVisible} animationType="slide">
          <View style={styles.overlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Signup Error</Text>
              <Text style={styles.modalMessage}>{alertMessage}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalButton}>
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
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
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    alignSelf: 'center',
    paddingBottom: 24,
    fontFamily: 'serif',
    textShadowColor: 'rgba(245, 210, 14, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  input: {
    backgroundColor: '#F6F7FB',
    height: 42,
    marginBottom: 20,
    fontSize: 16,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  form: {
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 30,
    backgroundColor: 'rgba(150, 123, 66, 0.3)',
    padding: 30,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 202, 11, 0.2)',
  },
  button: {
    backgroundColor: 'rgba(255, 165, 0, 0.9)',
    height: 42,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonText: {
    fontWeight: 'bold',
    color: '#fff',
    fontSize: 18,
    fontFamily: 'serif',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  loginRedirect: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
  },
  text: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    textShadowColor: 'rgba(245, 210, 14, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  linkText: {
    color: '#FFA500',
    fontWeight: '600',
    fontSize: 14,
    fontFamily: 'serif',
    textShadowColor: 'rgba(245, 210, 14, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 8, 8, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: 300,
    backgroundColor: 'rgba(187, 174, 119, 0.95)',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 202, 11, 0.2)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'serif',
    color: '#fff',
    marginBottom: 10,
    textShadowColor: 'rgba(245, 210, 14, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  modalMessage: {
    fontSize: 16,
    fontFamily: 'serif',
    textAlign: 'center',
    marginBottom: 20,
    color: '#fff',
    textShadowColor: 'rgba(245, 210, 14, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  modalButton: {
    backgroundColor: 'rgba(255, 165, 0, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  validationMessage: {
    color: 'brown',
    fontSize: 14,
    marginBottom: 10,
    fontFamily: 'serif',
    textAlign: 'left',
    width: '100%',
  },
});

export default Signup;
