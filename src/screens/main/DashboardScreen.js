import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  FAB,
  DataTable,
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useDatabase } from '../../context/DatabaseContext';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';

export default function DashboardScreen({ navigation }) {
  const [stats, setStats] = useState({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [groupedTransactions, setGroupedTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loansStats, setLoansStats] = useState({
    totalLent: 0,
    totalBorrowed: 0,
  });
  const { user } = useAuth();
  const { db } = useDatabase();
  const { isDark, theme } = useTheme();

  const loadStats = async () => {
    try {
      const dashboardStats = await db.getDashboardStats(user.id);
      const loansData = await db.getLoansDebtsStats(user.id);
      setStats(dashboardStats);
      setLoansStats(loansData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const filters = { dateFrom: today, dateTo: today };
      const transactionData = await db.getTransactions(user.id, filters);
      setTransactions(transactionData);
      groupTransactionsByDate(transactionData);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const groupTransactionsByDate = (transactions) => {
    const grouped = transactions.reduce((acc, transaction) => {
      const date = transaction.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(transaction);
      return acc;
    }, {});

    const groupedArray = Object.keys(grouped)
      .sort((a, b) => new Date(b) - new Date(a))
      .map((date) => ({
        date,
        transactions: grouped[date],
      }));

    setGroupedTransactions(groupedArray);
  };

  useFocusEffect(
    useCallback(() => {
      loadStats();
      loadTransactions();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    await loadTransactions();
    setRefreshing(false);
  };

  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const formatDateHeader = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return "Today's Transactions";
    }
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
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

  const renderTransactionGroup = (group, groupIndex) => {
    return (
      <View key={group.date} style={styles.dateGroup}>
        <View style={[styles.dateHeader, { backgroundColor: theme.colors.card }]}>
          <Paragraph style={[styles.dateTitle, { color: theme.colors.text }]}>
            {formatDateHeader(group.date)}
          </Paragraph>
        </View>
        <Card style={[styles.tableCard, { backgroundColor: theme.colors.card }]}>
          <DataTable>
            <DataTable.Header style={[styles.tableHeader, { backgroundColor: isDark ? '#2a2a2a' : '#f8f9fa' }]}>
              <DataTable.Title style={styles.modeCell}><Paragraph style={{ color: theme.colors.text }}>Mode</Paragraph></DataTable.Title>
              <DataTable.Title style={styles.particularsCell}><Paragraph style={{ color: theme.colors.text }}>Description</Paragraph></DataTable.Title>
              <DataTable.Title style={styles.typeCell}><Paragraph style={{ color: theme.colors.text }}>Type</Paragraph></DataTable.Title>
              <DataTable.Title style={styles.amountCell}><Paragraph style={{ color: theme.colors.text }}>Amount</Paragraph></DataTable.Title>
            </DataTable.Header>

            {group.transactions.map((item, index) => (
              <DataTable.Row key={item.id} onPress={() => navigation.navigate('EditTransaction', { transaction: item })} style={{ backgroundColor: theme.colors.card }}>
                <DataTable.Cell style={styles.modeCell}>
                  <View style={styles.modeContainer}><MaterialIcons name={getModeIcon(item.mode)} size={16} color={theme.colors.textSecondary} /><Paragraph style={[styles.modeText, { color: theme.colors.text }]}>{item.mode}</Paragraph></View>
                </DataTable.Cell>
                <DataTable.Cell style={styles.particularsCell}><View style={styles.particularsContainer}><Paragraph style={[styles.particularsText, { color: theme.colors.text }]} numberOfLines={2}>{item.particulars}</Paragraph></View></DataTable.Cell>
                <DataTable.Cell style={styles.typeCell}><View style={styles.typeContainer}><Paragraph style={[styles.typeText, { color: item.type === 'income' ? '#2e7d32' : '#d32f2f' }]}>{item.type === 'income' ? 'Inc' : 'Exp'}</Paragraph></View></DataTable.Cell>
                <DataTable.Cell style={styles.amountCell}><View style={styles.amountContainer}><Paragraph style={[styles.amountText, { color: item.type === 'income' ? '#2e7d32' : '#d32f2f' }]}>{item.type === 'expense' ? '-' : '+'}{formatCurrency(item.amount)}</Paragraph></View></DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        </Card>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.summaryContainer}>
          <Card style={[styles.summaryCard, { backgroundColor: isDark ? '#1f4e79' : '#e3f2fd' }]}>
            <Card.Content style={styles.cardContent}><MaterialIcons name='account-balance-wallet' size={32} color='#1976d2' /><View style={styles.cardText}><Paragraph style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>Total Balance</Paragraph><Title style={[styles.cardValue, { color: stats.totalBalance >= 0 ? '#2e7d32' : '#d32f2f' }]}>{formatCurrency(stats.totalBalance)}</Title></View></Card.Content>
          </Card>
          <Card style={[styles.summaryCard, { backgroundColor: isDark ? '#1b4332' : '#e8f5e8' }]}>
            <Card.Content style={styles.cardContent}><MaterialIcons name='trending-up' size={32} color='#2e7d32' /><View style={styles.cardText}><Paragraph style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>Monthly Income</Paragraph><Title style={[styles.cardValue, { color: '#2e7d32' }]}>{formatCurrency(stats.monthlyIncome)}</Title></View></Card.Content>
          </Card>
          <Card style={[styles.summaryCard, { backgroundColor: isDark ? '#4a1e1e' : '#ffebee' }]}>
            <Card.Content style={styles.cardContent}><MaterialIcons name='trending-down' size={32} color='#d32f2f' /><View style={styles.cardText}><Paragraph style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>Monthly Expense</Paragraph><Title style={[styles.cardValue, { color: '#d32f2f' }]}>{formatCurrency(stats.monthlyExpense)}</Title></View></Card.Content>
          </Card>
          <Card style={[styles.summaryCard, { backgroundColor: isDark ? '#2d4a3d' : '#f0f8f0' }]}>
            <Card.Content style={styles.cardContent}><MaterialIcons name='handshake' size={32} color='#4caf50' /><View style={styles.cardText}><Paragraph style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>Money Lent</Paragraph><Title style={[styles.cardValue, { color: '#4caf50' }]}>{formatCurrency(loansStats.totalLent)}</Title></View></Card.Content>
          </Card>
          <Card style={[styles.summaryCard, { backgroundColor: isDark ? '#4a2d2d' : '#fff0f0' }]}>
            <Card.Content style={styles.cardContent}><MaterialIcons name='account-balance' size={32} color='#ff5722' /><View style={styles.cardText}><Paragraph style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>Money Owed</Paragraph><Title style={[styles.cardValue, { color: '#ff5722' }]}>{formatCurrency(loansStats.totalBorrowed)}</Title></View></Card.Content>
          </Card>
        </View>

        <View style={styles.transactionsSection}>
          <Title style={[styles.sectionTitle, { color: theme.colors.text }]}>Today's Transactions</Title>

          {groupedTransactions.length > 0 ? (
            groupedTransactions.map((group, index) => renderTransactionGroup(group, index))
          ) : (
            <Card style={[styles.tableCard, { backgroundColor: theme.colors.card }]}>
                <Paragraph style={styles.noTransactionsText}>No transactions for today.</Paragraph>
            </Card>
          )}

          <View style={[styles.viewAllContainer, { backgroundColor: theme.colors.card }]}>
              <Paragraph style={styles.viewAllText} onPress={() => navigation.navigate('Transactions')}>
                View All Transactions →
              </Paragraph>
          </View>
        </View>
      </ScrollView>

      <FAB
        style={styles.fab}
        icon='plus'
        onPress={() => navigation.navigate('AddTransaction')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryContainer: { padding: 16 },
  summaryCard: { marginBottom: 12, elevation: 2 },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  cardText: { marginLeft: 16, flex: 1 },
  cardLabel: { fontSize: 14 },
  cardValue: { fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  transactionsSection: { padding: 16, paddingTop: 0 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  dateGroup: { marginBottom: 12 },
  dateHeader: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, marginBottom: 4, elevation: 1 },
  dateTitle: { fontSize: 14, fontWeight: '600' },
  tableCard: { elevation: 2 },
  tableHeader: {},
  modeCell: { flex: 1, justifyContent: 'center' },
  particularsCell: { flex: 2, justifyContent: 'center' },
  typeCell: { flex: 0.6, justifyContent: 'center' },
  amountCell: { flex: 1.2, justifyContent: 'center' },
  modeContainer: { flexDirection: 'row', alignItems: 'center' },
  modeText: { fontSize: 12, marginLeft: 4 },
  particularsContainer: { justifyContent: 'center' },
  particularsText: { fontSize: 14, fontWeight: '500', textAlign: 'left' },
  typeContainer: { justifyContent: 'center' },
  typeText: { fontSize: 14, fontWeight: 'bold' },
  amountContainer: { justifyContent: 'center', alignItems: 'flex-end' },
  amountText: { fontSize: 14, fontWeight: 'bold' },
  viewAllContainer: { marginTop: 12, padding: 16, alignItems: 'center', borderRadius: 8, elevation: 1 },
  viewAllText: { color: '#0077ffc2', fontWeight: '500' },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#0077ffc2' },
  noTransactionsText: { padding: 20, textAlign: 'center', fontStyle: 'italic' }
});