import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Title, Card } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { useDatabase } from '../../context/DatabaseContext';
import { useTheme } from '../../context/ThemeContext';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { db } = useDatabase();
  const { isDark, theme } = useTheme();

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const user = await db.loginUser(username, password);
      if (user) {
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
