// App.js
import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { store, persistor } from './redux/store';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext'; 
import { auth } from './config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

import AuthNavigator from './navigation/AuthNavigator';
import MainNavigator from './navigation/MainNavigator';
import LoadingScreen from './screens/LoadingScreen';

const RootStack = createStackNavigator();

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (initializing) setInitializing(false);
    });

    return unsubscribe;
  }, []);

  if (initializing) {
    return <LoadingScreen />;
  }

  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingScreen />} persistor={persistor}>
        <AuthProvider>
          <ThemeProvider>
            <NavigationContainer>
              <RootStack.Navigator
                screenOptions={{ headerShown: false }}
                initialRouteName={user ? 'Main' : 'Auth'}
              >
                <RootStack.Screen name="Auth" component={AuthNavigator} />
                <RootStack.Screen name="Main" component={MainNavigator} />
              </RootStack.Navigator>
            </NavigationContainer>
          </ThemeProvider>
        </AuthProvider>
      </PersistGate>
    </Provider>
  );
}
