import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Title, Card } from 'react-native-paper';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useDatabase } from '../../context/DatabaseContext';
import { useTheme } from '../../context/ThemeContext';

const BIOMETRIC_USER_KEY = 'biometricUser';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { db } = useDatabase();
  const { isDark, theme } = useTheme();

  useEffect(() => {
    // This function will run when the screen loads
    const checkBiometric = async () => {
      // 1. Check if hardware is compatible
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) return;

      // 2. Check if user has enrolled biometrics
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) return;
      
      // 3. Check if we have a saved user
      const savedUsername = await AsyncStorage.getItem(BIOMETRIC_USER_KEY);
      if (!savedUsername) return;

      // If all checks pass, prompt for biometric login
      handleBiometricLogin(savedUsername);
    };

    checkBiometric();
  }, []);

  const handleBiometricLogin = async (savedUsername) => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Log in with Biometrics',
        disableDeviceFallback: true, // Prevents OS from showing password/pin fallback
        cancelLabel: 'Use Password',
      });

      if (result.success) {
        setLoading(true);
        // On successful biometric auth, fetch user data and log them in
        const user = await db.getUserByUsername(savedUsername);
        if (user) {
          login(user);
        } else {
          // This case is unlikely but good to handle
          Alert.alert('Error', 'User not found. Please log in manually.');
          await AsyncStorage.removeItem(BIOMETRIC_USER_KEY); // Clear invalid user
        }
        setLoading(false);
      }
      // If result.success is false, it means user cancelled or failed.
      // We do nothing, allowing them to use the manual login form.
    } catch (error) {
      console.error('Biometric authentication error:', error);
      Alert.alert('Error', 'Biometric authentication failed.');
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const user = await db.loginUser(username, password);
      if (user) {
        // --- MODIFICATION HERE ---
        // On successful manual login, save the username for next time
        await AsyncStorage.setItem(BIOMETRIC_USER_KEY, user.username);
        // -------------------------
        login(user);
      } else {
        Alert.alert('Error', 'Invalid credentials');
      }
    } catch (error) {
      Alert.alert('Error', 'Login failed');
    }
    setLoading(false);
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Card style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Card.Content>
          <Title style={[styles.title, { color: theme.colors.text }]}>
            Drachm0
          </Title>

          <TextInput
            label='Username'
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            mode='outlined'
            textColor={theme.colors.text}
            theme={{
              colors: {
                onSurfaceVariant: theme.colors.textSecondary,
                outline: theme.colors.border,
              },
            }}
          />

          <TextInput
            label='Password'
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            mode='outlined'
            textColor={theme.colors.text}
            theme={{
              colors: {
                onSurfaceVariant: theme.colors.textSecondary,
                outline: theme.colors.border,
              },
            }}
          />

          <Button
            mode='contained'
            onPress={handleLogin}
            loading={loading}
            style={styles.button}
          >
            Login
          </Button>

          <Button
            mode='text'
            onPress={() => navigation.navigate('Register')}
            style={styles.linkButton}
            textColor={theme.colors.primary}
          >
            Don't have an account? Register
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    elevation: 4,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
    fontSize: 24,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 8,
  },
  linkButton: {
    marginTop: 8,
  },
});