import React, { useState } from 'react';
import {StyleSheet,Text,View,TextInput,SafeAreaView,TouchableOpacity,Modal,StatusBar,ImageBackground} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';

const Login = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Simple email regex
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address.');
    } else {
      setEmailError('');
    }
  };

  const validatePassword = (password) => {
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
    } else {
      setPasswordError('');
    }
  };

  const onHandleLogin = () => {
    if (emailError || passwordError || !email.trim() || !password.trim()) {
      setAlertMessage('Please fix the errors before logging in.');
      setAlertVisible(true);
      return;
    }

    signInWithEmailAndPassword(auth, email, password)
      .then(() => {
        console.log('Login success');
        navigation.navigate('Main');
      })
      .catch((err) => {
        let errorMessage = 'An unknown error occurred. Please try again.';

        switch (err.code) {
          case 'auth/invalid-email':
            errorMessage = 'The email address format is incorrect.';
            break;
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email.';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Incorrect password. Please try again.';
            break;
          default:
            errorMessage = err.message;
        }

        setAlertMessage(errorMessage);
        setAlertVisible(true);
      });
  };

  return (
    <ImageBackground
      source={require('../assets/startbackground.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.container}>
        <SafeAreaView style={styles.form}>
          <Text style={styles.title}>Log In</Text>
          <TextInput
            style={[
              styles.input,
              { borderColor: emailError ? 'orange' : 'rgba(255, 255, 255, 0.3)' },
            ]}
            placeholder="Enter email"
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoFocus={true}
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
            autoCorrect={false}
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

          <TouchableOpacity style={styles.button} onPress={onHandleLogin}>
            <Text style={styles.buttonText}>Log In</Text>
          </TouchableOpacity>
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signupLink}> Sign Up</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <Modal transparent={true} visible={alertVisible} animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.alertBox}>
              <Text style={{fontSize: 36, color: '#FF6B6B', marginBottom: 8}}>!</Text>
              <Text style={styles.alertText}>{alertMessage}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setAlertVisible(false)}>
                <Text style={styles.closeButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <StatusBar barStyle="light-content" />
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
    backgroundColor: 'rgba(253, 228, 3, 0.3)',
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
    borderRadius: 25,
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
    height: 50,
    borderRadius: 25,
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
  signupContainer: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
  },
  signupText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  signupLink: {
    color: '#FFA500',
    fontWeight: '600',
    fontSize: 14,
    fontFamily: 'serif',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 8, 7, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBox: {
    width: 300,
    padding: 20,
    backgroundColor: 'rgba(238, 237, 162, 0.95)',
    borderRadius: 15,
    alignItems: 'center',
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.3)',
  },
  alertText: {
    fontSize: 16,
    fontFamily: 'serif',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  closeButton: {
    backgroundColor: 'rgba(255, 165, 0, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  closeButtonText: {
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
    fontSize: 12,
    marginTop: -10,
    marginBottom: 10,
    fontFamily: 'serif',
  },
});

export default Login;
