import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme !== null) {
        setIsDark(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDark;
      setIsDark(newTheme);
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const theme = {
    colors: {
      background: isDark ? '#121212' : '#f5f5f5',
      surface: isDark ? '#1e1e1e' : '#ffffff',
      card: isDark ? '#1e1e1e' : '#ffffff',
      text: isDark ? '#ffffff' : '#000000',
      textSecondary: isDark ? '#bbbbbb' : '#666666',
      border: isDark ? '#2a2a2a' : '#f0f0f0',
      primary: '#0077ffc2',
      success: '#2e7d32',
      error: '#d32f2f',
    },
  };

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        toggleTheme,
        theme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
