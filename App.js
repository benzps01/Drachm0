import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import {
  Provider as PaperProvider,
  DefaultTheme,
  MD3DarkTheme,
} from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DatabaseProvider } from './src/context/DatabaseContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const { isDark, theme } = useTheme();

  // Create custom themes based on our theme context
  const lightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: theme.colors.background,
      surface: theme.colors.surface,
      text: theme.colors.text,
      onSurface: theme.colors.text,
      primary: theme.colors.primary,
    },
  };

  const darkTheme = {
    ...MD3DarkTheme,
    colors: {
      ...MD3DarkTheme.colors,
      background: theme.colors.background,
      surface: theme.colors.surface,
      text: theme.colors.text,
      onSurface: theme.colors.text,
      primary: theme.colors.primary,
    },
  };

  const paperTheme = isDark ? darkTheme : lightTheme;

  return (
    <PaperProvider theme={paperTheme}>
      <NavigationContainer>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
      </NavigationContainer>
    </PaperProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <DatabaseProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </DatabaseProvider>
    </ThemeProvider>
  );
}
