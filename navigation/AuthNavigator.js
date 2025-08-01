import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/Login';
import SignupScreen from '../screens/Signup';

const AuthStack = createStackNavigator();

const AuthNavigator = () => (
  <AuthStack.Navigator 
    screenOptions={{ headerShown: false }}
    initialRouteName="Login"
  >
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Signup" component={SignupScreen} />
  </AuthStack.Navigator>
);

export default AuthNavigator;