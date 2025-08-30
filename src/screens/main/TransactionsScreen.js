import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Chip, FAB, Searchbar, Menu, Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useDatabase } from '../../context/DatabaseContext';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';

export default function TransactionsScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const { user } = useAuth();
  const { db } = useDatabase();
  const { theme } = useTheme();

  const modes = ['CC', 'UPI', 'Cash', 'Debit'];

  const loadTransactions = async () => {
    try {
      const filters = selectedMode ? { mode: selectedMode } : {};
      const data = await db.getTransactions(user.id, filters);
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  useFocusEffect(useCallback(() => { loadTransactions(); }, [selectedMode]));

  useEffect(() => {
    const filtered = transactions.filter(
      (transaction) =>
        transaction.particulars.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.category_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredTransactions(filtered);
  }, [searchQuery, transactions]);

  const handleDelete = (transaction) => {
    Alert.alert('Delete Transaction', 'Are you sure you want to delete this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await db.deleteTransaction(transaction.id);
            loadTransactions();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete transaction');
          }
      }},
    ]);
  };

  const handleEdit = (transaction) => {
    navigation.navigate('EditTransaction', { transaction });
  };

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'CC': return 'credit-card';
      case 'UPI': return 'smartphone';
      case 'Cash': return 'money';
      case 'Debit': return 'payment';
      default: return 'payment';
    }
  };

  const formatCurrency = (amount) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-IN');

  const renderTransaction = ({ item, index }) => (
    <TouchableOpacity onLongPress={() => handleEdit(item)} onPress={() => handleEdit(item)}>
      <Card style={[styles.transactionCard, { backgroundColor: theme.colors.card }]}>
        <Card.Content>
          <View style={styles.transactionHeader}>
            <View style={styles.transactionInfo}>
              <View style={styles.transactionTitle}>
                <MaterialIcons name={getModeIcon(item.mode)} size={20} color={theme.colors.textSecondary} style={styles.modeIcon} />
                <Paragraph style={[styles.serialNumber, { color: theme.colors.textSecondary }]}>#{index + 1}</Paragraph>
                <Paragraph style={[styles.date, { color: theme.colors.textSecondary }]}>{formatDate(item.date)}</Paragraph>
              </View>
              <Paragraph style={[styles.particulars, { color: theme.colors.text }]}>{item.particulars}</Paragraph>
              <Paragraph style={[styles.category, { color: theme.colors.textSecondary }]}>{item.category_name}</Paragraph>
            </View>
            <View style={styles.transactionAmount}>
              <Title style={[styles.amount, { color: item.type === 'income' ? '#2e7d32' : '#d32f2f' }]}>{item.type === 'expense' ? '-' : '+'}{formatCurrency(item.amount)}</Title>
              <TouchableOpacity onPress={() => handleDelete(item)}><MaterialIcons name='delete' size={20} color='#d32f2f' /></TouchableOpacity>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
        <Searchbar placeholder='Search transactions...' onChangeText={setSearchQuery} value={searchQuery} style={[styles.searchbar, { backgroundColor: theme.colors.card }]} inputStyle={{ color: theme.colors.text }} iconColor={theme.colors.textSecondary} placeholderTextColor={theme.colors.textSecondary} />
        <Menu 
          visible={menuVisible} 
          onDismiss={() => setMenuVisible(false)} 
          anchor={
            <Button 
              mode='outlined' 
              onPress={() => setMenuVisible(true)} 
              style={styles.filterButton} 
              icon={({ size, color }) => <MaterialIcons name="filter-list" size={size} color={color} />}
              textColor={theme.colors.text}
            >
              {selectedMode || 'Filter'}
            </Button>
          } 
          contentStyle={{ backgroundColor: theme.colors.card }}
        >
          <Menu.Item onPress={() => { setSelectedMode(''); setMenuVisible(false); }} title='All Modes' titleStyle={{ color: theme.colors.text }} />
          {modes.map((mode) => (<Menu.Item key={mode} onPress={() => { setSelectedMode(mode); setMenuVisible(false); }} title={mode} titleStyle={{ color: theme.colors.text }} />))}
        </Menu>
      </View>
      <View style={styles.chipContainer}>
        <Chip selected={!selectedMode} onPress={() => setSelectedMode('')} style={styles.chip} textStyle={{ color: theme.colors.text }}>All</Chip>
        {modes.map((mode) => (
          <Chip 
            key={mode} 
            selected={selectedMode === mode} 
            onPress={() => setSelectedMode(mode)} 
            style={styles.chip} 
            icon={() => <MaterialIcons name={getModeIcon(mode)} size={18} color={theme.colors.text} />}
            textStyle={{ color: theme.colors.text }}
          >
            {mode}
          </Chip>
        ))}
      </View>

      <FlatList data={filteredTransactions} renderItem={renderTransaction} keyExtractor={(item) => item.id.toString()} style={styles.list} showsVerticalScrollIndicator={false} />
      <FAB style={styles.fab} icon='plus' onPress={() => navigation.navigate('AddTransaction')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  searchbar: { flex: 1, marginRight: 8 },
  filterButton: { minWidth: 80 },
  chipContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8 },
  chip: { marginRight: 8 },
  list: { flex: 1, paddingHorizontal: 16 },
  transactionCard: { marginBottom: 8, elevation: 2 },
  transactionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  transactionInfo: { flex: 1 },
  transactionTitle: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  modeIcon: { marginRight: 8 },
  serialNumber: { fontSize: 12, marginRight: 8 },
  date: { fontSize: 12 },
  particulars: { fontSize: 16, fontWeight: '500', marginBottom: 2 },
  category: { fontSize: 12 },
  transactionAmount: { alignItems: 'flex-end' },
  amount: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#0077ffc2' },
});