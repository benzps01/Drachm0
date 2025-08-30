import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import { useTheme } from '../context/ThemeContext';

const Stack = createStackNavigator();

export default function AuthNavigator() {
  const { isDark, theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name='Login'
        component={LoginScreen}
        options={{
          headerShown: false, // Login screen handles its own styling
        }}
      />
      <Stack.Screen
        name='Register'
        component={RegisterScreen}
        options={{
          title: 'Create Account',
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.text,
        }}
      />
    </Stack.Navigator>
  );
}
