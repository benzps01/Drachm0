import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { View } from 'react-native';
import DashboardScreen from '../screens/main/DashboardScreen';
import TransactionsScreen from '../screens/main/TransactionsScreen';
import AnalyticsScreen from '../screens/main/AnalyticsScreen';
import LoansScreen from '../screens/main/LoansScreen';
import AddTransactionScreen from '../screens/main/AddTransactionScreen';
import EditTransactionScreen from '../screens/main/EditTransactionScreen';
import AddLoanScreen from '../screens/main/AddLoanScreen';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();

// --- Reusable Header Icons Component ---
const HeaderIcons = () => {
  const { isDark, theme, toggleTheme } = useTheme();
  const { logout } = useAuth();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
      <MaterialIcons name={isDark ? 'light-mode' : 'dark-mode'} size={24} color={theme.colors.text} onPress={toggleTheme} style={{ padding: 8 }} />
      <MaterialIcons name='logout' size={24} color={theme.colors.text} onPress={logout} style={{ padding: 8 }} />
    </View>
  );
};

// --- This is the Tab Navigator for the main screens ---
function MainTabs() {
  const { theme } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerRight: () => <HeaderIcons />,
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') iconName = 'dashboard';
          else if (route.name === 'Transactions') iconName = 'list';
          else if (route.name === 'Analytics') iconName = 'analytics';
          else if (route.name === 'Loans') iconName = 'handshake';
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0077ffc2',
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
      })}
    >
      <Tab.Screen name='Dashboard' component={DashboardScreen} />
      <Tab.Screen name='Transactions' component={TransactionsScreen} />
      <Tab.Screen name='Analytics' component={AnalyticsScreen} />
      <Tab.Screen name='Loans' component={LoansScreen} />
    </Tab.Navigator>
  );
}

// --- This is the new Root Navigator that handles the tabs AND the modals ---
export default function MainNavigator() {
  const { theme } = useTheme();
  return (
    <RootStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <RootStack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
      <RootStack.Group screenOptions={{ presentation: 'modal' }}>
        <RootStack.Screen name="AddTransaction" component={AddTransactionScreen} options={{ title: 'Add Transaction' }} />
        <RootStack.Screen name="EditTransaction" component={EditTransactionScreen} options={{ title: 'Edit Transaction' }} />
        <RootStack.Screen name="AddLoan" component={AddLoanScreen} options={{ title: 'Add Loan/Debt' }} />
      </RootStack.Group>
    </RootStack.Navigator>
  );
}