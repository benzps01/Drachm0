import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Title, Card } from 'react-native-paper';
import { useDatabase } from '../../context/DatabaseContext';
import { useTheme } from '../../context/ThemeContext';

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { db } = useDatabase();
  const { isDark, theme } = useTheme();

  const handleRegister = async () => {
    if (!username || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const result = await db.registerUser(username, password);
      if (result.success) {
        Alert.alert('Success', 'Account created successfully', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Registration failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Registration failed');
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
            Create Account
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

          <TextInput
            label='Confirm Password'
            value={confirmPassword}
            onChangeText={setConfirmPassword}
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
            onPress={handleRegister}
            loading={loading}
            style={styles.button}
          >
            Register
          </Button>

          <Button
            mode='text'
            onPress={() => navigation.navigate('Login')}
            style={styles.linkButton}
            textColor={theme.colors.primary}
          >
            Already have an account? Login
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
