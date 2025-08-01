import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import TaskListScreen from '../screens/TaskListScreen';
import BudgetTrackerScreen from '../screens/BudgetTrackerScreen';
import NotesScreen from '../screens/NotesScreen';
import ProfileSettings from '../screens/ProfileSettings';
import { Feather } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HomeScreen" component={HomeScreen} />
    <Stack.Screen name="ProfileSettings" component={ProfileSettings} />
  </Stack.Navigator>
);

const MainNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        elevation: 0,
        backgroundColor: 'rgba(255, 215, 0, 0.7)', // Transparent gold (70% opacity)
        height: 40,
        borderTopWidth: 0,
        paddingBottom: 3,
        paddingTop: 3,
      },
      tabBarActiveTintColor: '#000',
      tabBarInactiveTintColor: '#666',
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '500',
        letterSpacing: 0.3,
      },
      tabBarIcon: ({ color, size }) => {
        let iconName;
        if (route.name === 'Home') iconName = 'home';
        if (route.name === 'Tasks') iconName = 'check-square';
        if (route.name === 'Budget') iconName = 'dollar-sign';
        if (route.name === 'Notes') iconName = 'edit';
        return <Feather name={iconName} size={22} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeStack} />
    <Tab.Screen name="Tasks" component={TaskListScreen} />
    <Tab.Screen name="Budget" component={BudgetTrackerScreen} />
    <Tab.Screen name="Notes" component={NotesScreen} />
  </Tab.Navigator>
);

export default MainNavigator;