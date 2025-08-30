import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  FAB,
  Button,
  Divider,
  Checkbox,
  TextInput,
  Modal,
  Portal,
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useDatabase } from '../../context/DatabaseContext';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';

export default function LoansScreen({ navigation }) {
  const [personLoansDebts, setPersonLoansDebts] = useState([]);
  const [stats, setStats] = useState({ totalLent: 0, totalBorrowed: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [expandedPersons, setExpandedPersons] = useState(new Set());
  const [selectedTransactions, setSelectedTransactions] = useState(new Set());
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementPerson, setSettlementPerson] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [settlementReason, setSettlementReason] = useState('');
  const [personTransactions, setPersonTransactions] = useState([]);

  const { user } = useAuth();
  const { db } = useDatabase();
  const { isDark, theme } = useTheme();

  const loadData = async () => {
    try {
      const personsData = await db.getLoansDebtsByPerson(user.id, 'pending');
      const statsData = await db.getLoansDebtsStats(user.id);
      setPersonLoansDebts(personsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading loans/debts:', error);
    }
  };

  const loadPersonTransactions = async (personId) => {
    try {
      const transactions = await db.getPersonLoansDebts(user.id, personId, 'pending');
      setPersonTransactions(transactions);
    } catch (error) {
      console.error('Error loading person transactions:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
      setExpandedPersons(new Set());
      setSelectedTransactions(new Set());
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setExpandedPersons(new Set());
    setSelectedTransactions(new Set());
    setRefreshing(false);
  };

  const togglePersonExpansion = async (personId) => {
    const newExpanded = new Set(expandedPersons);
    if (newExpanded.has(personId)) {
      newExpanded.delete(personId);
    } else {
      newExpanded.add(personId);
      await loadPersonTransactions(personId);
    }
    setExpandedPersons(newExpanded);
  };

  const toggleTransactionSelection = (transactionId) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId);
    } else {
      newSelected.add(transactionId);
    }
    setSelectedTransactions(newSelected);
  };

  const openSettlementModal = (person) => {
    setSettlementPerson(person);
    setSelectedTransactions(new Set());
    setCustomAmount('');
    setSettlementReason('');
    loadPersonTransactions(person.person_id);
    setShowSettlementModal(true);
  };

  const closeSettlementModal = () => {
    setShowSettlementModal(false);
    setSettlementPerson(null);
    setSelectedTransactions(new Set());
    setCustomAmount('');
    setSettlementReason('');
  };

  const calculateSelectedAmount = () => {
    return personTransactions
      .filter((t) => selectedTransactions.has(t.id))
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const handleSettlement = async () => {
    const customAmountNum = parseFloat(customAmount);

    if (selectedTransactions.size === 0 && !customAmount) {
      Alert.alert('Error', 'Please select transactions or enter a custom amount');
      return;
    }
    if (customAmount && (isNaN(customAmountNum) || customAmountNum <= 0)) {
      Alert.alert('Error', 'Please enter a valid custom amount');
      return;
    }

    let settlementType, settlementFinalAmount;
    if (customAmount) {
      const netBalance = settlementPerson.total_lent - settlementPerson.total_borrowed;
      settlementType = netBalance > 0 ? 'income' : 'expense';
      settlementFinalAmount = customAmountNum;
    } else {
      let totalReceived = 0;
      let totalPaid = 0;
      personTransactions
        .filter((t) => selectedTransactions.has(t.id))
        .forEach((t) => {
          if (t.type === 'lent') totalReceived += t.amount;
          else if (t.type === 'borrowed') totalPaid += t.amount;
        });
      const net = totalReceived - totalPaid;

      if (net > 0) {
        settlementType = 'income';
        settlementFinalAmount = net;
      } else if (net < 0) {
        settlementType = 'expense';
        settlementFinalAmount = Math.abs(net);
      } else {
        Alert.alert('Nothing to settle', 'Net settlement is zero!');
        return;
      }
    }
    
    const categoryId = await getCategoryId('Loans & Debts', settlementType);

    Alert.alert(
      'Confirm Settlement',
      `Settlement of ₹${settlementFinalAmount.toLocaleString('en-IN')} as ${
        settlementType === 'income' ? 'income (received)' : 'expense (paid)'
      }\nwith ${settlementPerson.person_name}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Settle',
          onPress: async () => {
            try {
              const today = new Date().toLocaleDateString('en-CA');
              if (customAmount) {
                await db.addTransaction(
                  user.id, today, 'UPI', `${settlementReason || 'Partial settlement'} with ${settlementPerson.person_name}`,
                  settlementFinalAmount, settlementType, categoryId
                );
              } else {
                for (const transactionId of selectedTransactions) {
                  await db.settleLoanDebt(transactionId, today);
                }
                await db.addTransaction(
                  user.id, today, 'UPI', `Settlement with ${settlementPerson.person_name}`,
                  settlementFinalAmount, settlementType, categoryId
                );
              }
              Alert.alert('Success', 'Settlement recorded successfully');
              await loadData();
              await loadPersonTransactions(settlementPerson.person_id);
              closeSettlementModal();
            } catch (error) {
              Alert.alert('Error', `Failed to record settlement: ${error.message}`);
            }
          },
        },
      ]
    );
  };

  const getCategoryId = async (categoryName, type) => {
    try {
      const categories = await db.getCategories(type);
      let category = categories.find((cat) => cat.name === categoryName);
      if (!category) {
        category = categories.find((cat) => cat.name === 'Other');
      }
      return category ? category.id : categories[0].id;
    } catch (error) {
      console.error('Error getting category:', error);
      throw error;
    }
  };

  const formatCurrency = (amount) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-IN');
  const getNetBalance = (person) => person.total_lent - person.total_borrowed;
  const getNetBalanceColor = (netBalance) => {
    if (netBalance > 0) return '#2e7d32';
    if (netBalance < 0) return '#d32f2f';
    return theme.colors.textSecondary;
  };
  const getNetBalanceText = (netBalance) => {
    if (netBalance > 0) return `+${formatCurrency(netBalance)}`;
    if (netBalance < 0) return `-${formatCurrency(Math.abs(netBalance))}`;
    return formatCurrency(0);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.summaryContainer}>
          <Card style={[styles.summaryCard, { backgroundColor: isDark ? '#2d4a3d' : '#f0f8f0' }]}>
            <Card.Content style={styles.summaryContent}>
              <MaterialIcons name='handshake' size={32} color='#4caf50' />
              <View style={styles.summaryText}>
                <Title style={[styles.summaryAmount, { color: '#4caf50' }]}>
                  {formatCurrency(stats.totalLent)}
                </Title>
                <Paragraph style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                  Total Lent
                </Paragraph>
              </View>
            </Card.Content>
          </Card>

          <Card style={[styles.summaryCard, { backgroundColor: isDark ? '#4a2d2d' : '#fff0f0' }]}>
            <Card.Content style={styles.summaryContent}>
              <MaterialIcons name='account-balance' size={32} color='#ff5722' />
              <View style={styles.summaryText}>
                <Title style={[styles.summaryAmount, { color: '#ff5722' }]}>
                  {formatCurrency(stats.totalBorrowed)}
                </Title>
                <Paragraph style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                  Total Owed
                </Paragraph>
              </View>
            </Card.Content>
          </Card>
        </View>

        <Card style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}>
          <Card.Content>
            <Title style={[styles.sectionTitle, { color: theme.colors.text }]}>
              People ({personLoansDebts.length})
            </Title>
            {personLoansDebts.length > 0 ? (
              personLoansDebts.map((person, index) => {
                const netBalance = getNetBalance(person);
                const isExpanded = expandedPersons.has(person.person_id);
                return (
                  <View key={person.person_id}>
                    <TouchableOpacity onPress={() => togglePersonExpansion(person.person_id)} style={styles.personHeader}>
                      <View style={styles.personInfo}>
                        <Title style={[styles.personName, { color: theme.colors.text }]}>{person.person_name}</Title>
                        <View style={styles.personAmounts}>
                          <Paragraph style={[styles.amountText, { color: '#2e7d32' }]}>Lent: {formatCurrency(person.total_lent)}</Paragraph>
                          <Paragraph style={[styles.amountText, { color: '#d32f2f' }]}>Borrowed: {formatCurrency(person.total_borrowed)}</Paragraph>
                        </View>
                      </View>
                      <View style={styles.personActions}>
                        <Title style={[styles.netBalance, { color: getNetBalanceColor(netBalance) }]}>{getNetBalanceText(netBalance)}</Title>
                        <MaterialIcons name={isExpanded ? 'expand-less' : 'expand-more'} size={24} color={theme.colors.textSecondary} />
                      </View>
                    </TouchableOpacity>
                    {isExpanded && (
                      <View style={styles.expandedContent}>
                        <Paragraph style={[styles.netBalanceLabel, { color: theme.colors.textSecondary }]}>Net Balance: {netBalance > 0 ? 'They owe you' : netBalance < 0 ? 'You owe them' : 'Settled'}</Paragraph>
                        <View style={styles.transactionsSection}>
                          <Title style={[styles.transactionsSectionTitle, { color: theme.colors.text }]}>Pending Transactions</Title>
                          {personTransactions
                            .filter((t) => t.person_id === person.person_id)
                            .map((transaction) => (
                              <View key={transaction.id} style={[styles.transactionItem, { borderBottomColor: theme.colors.border }]}>
                                <View style={styles.transactionDetails}>
                                  <Paragraph style={[styles.transactionReason, { color: theme.colors.text }]}>{transaction.reason}</Paragraph>
                                  <Paragraph style={[styles.transactionDate, { color: theme.colors.textSecondary }]}>{formatDate(transaction.date_created)} • {transaction.type === 'lent' ? 'You lent' : 'You borrowed'}</Paragraph>
                                </View>
                                <View style={styles.transactionAmount}>
                                  <Paragraph style={[styles.amount, { color: transaction.type === 'lent' ? '#2e7d32' : '#d32f2f' }]}>{transaction.type === 'lent' ? '+' : '-'}{formatCurrency(transaction.amount)}</Paragraph>
                                </View>
                              </View>
                            ))}
                        </View>
                        <Button mode='contained' onPress={() => openSettlementModal(person)} style={[styles.settleButton, { backgroundColor: netBalance > 0 ? '#2e7d32' : '#d32f2f' }]} disabled={netBalance === 0}>
                          {netBalance > 0 ? 'Record Payment' : netBalance < 0 ? 'Record Payment' : 'Settled'}
                        </Button>
                      </View>
                    )}
                    {index < personLoansDebts.length - 1 && (<Divider style={styles.divider} />)}
                  </View>
                );
              })
            ) : (
              <Paragraph style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No pending loans or debts</Paragraph>
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      <Portal>
        <Modal visible={showSettlementModal} onDismiss={closeSettlementModal} contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.card }]}>
          <ScrollView>
            <Title style={[styles.modalTitle, { color: theme.colors.text }]}>Settlement with {settlementPerson?.person_name}</Title>
            <View style={styles.modalSection}>
              <Title style={[styles.sectionTitle, { color: theme.colors.text }]}>Select Transactions to Settle</Title>
              {personTransactions.map((transaction) => (
                <TouchableOpacity key={transaction.id} onPress={() => toggleTransactionSelection(transaction.id)} style={[styles.selectableTransaction, { borderBottomColor: theme.colors.border }]}>
                  <Checkbox status={selectedTransactions.has(transaction.id) ? 'checked' : 'unchecked'} onPress={() => toggleTransactionSelection(transaction.id)} />
                  <View style={styles.transactionDetails}>
                    <Paragraph style={[styles.transactionReason, { color: theme.colors.text }]}>{transaction.reason}</Paragraph>
                    <Paragraph style={[styles.transactionDate, { color: theme.colors.textSecondary }]}>{formatDate(transaction.date_created)}</Paragraph>
                  </View>
                  <Paragraph style={[styles.amount, { color: transaction.type === 'lent' ? '#2e7d32' : '#d32f2f' }]}>{formatCurrency(transaction.amount)}</Paragraph>
                </TouchableOpacity>
              ))}
              {selectedTransactions.size > 0 && (
                <View style={styles.selectedSummary}><Paragraph style={[styles.selectedText, { color: theme.colors.text }]}>Selected: {formatCurrency(calculateSelectedAmount())}</Paragraph></View>
              )}
            </View>
            <Divider style={styles.modalDivider} />
            <View style={styles.modalSection}>
              <Title style={[styles.sectionTitle, { color: theme.colors.text }]}>Or Enter Custom Amount</Title>
              <TextInput label='Custom Settlement Amount' value={customAmount} onChangeText={setCustomAmount} keyboardType='numeric' mode='outlined' style={styles.input} textColor={theme.colors.text} theme={{ colors: { onSurfaceVariant: theme.colors.textSecondary, outline: theme.colors.border } }} left={<TextInput.Icon icon='currency-inr' />} />
              <TextInput label='Settlement Reason (Optional)' value={settlementReason} onChangeText={setSettlementReason} mode='outlined' style={styles.input} textColor={theme.colors.text} theme={{ colors: { onSurfaceVariant: theme.colors.textSecondary, outline: theme.colors.border } }} />
            </View>
            <View style={styles.modalActions}>
              <Button mode='outlined' onPress={closeSettlementModal} style={styles.modalButton}>Cancel</Button>
              <Button mode='contained' onPress={handleSettlement} style={styles.modalButton}>Record Settlement</Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      <FAB style={styles.fab} icon='plus' onPress={() => navigation.navigate('AddLoan')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryContainer: { flexDirection: 'row', padding: 16, gap: 12 },
  summaryCard: { flex: 1, elevation: 2 },
  summaryContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 12 },
  summaryText: { marginLeft: 16, flex: 1 },
  summaryAmount: { fontSize: 18, fontWeight: 'bold' },
  summaryLabel: { fontSize: 12, marginTop: 4 },
  sectionCard: { margin: 16, marginTop: 0, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  personHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  personInfo: { flex: 1 },
  personName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  personAmounts: { flexDirection: 'row', gap: 16 },
  amountText: { fontSize: 12 },
  personActions: { alignItems: 'flex-end', flexDirection: 'row', gap: 8 },
  netBalance: { fontSize: 16, fontWeight: 'bold' },
  expandedContent: { paddingLeft: 16, paddingBottom: 12 },
  netBalanceLabel: { fontSize: 14, marginBottom: 8, fontStyle: 'italic' },
  transactionsSection: { marginVertical: 12 },
  transactionsSectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  transactionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  transactionDetails: { flex: 1 },
  transactionReason: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  transactionDate: { fontSize: 12 },
  transactionAmount: { alignItems: 'flex-end' },
  amount: { fontSize: 14, fontWeight: 'bold' },
  settleButton: { alignSelf: 'flex-start', paddingHorizontal: 16, marginTop: 8 },
  divider: { marginVertical: 8 },
  emptyText: { textAlign: 'center', fontStyle: 'italic', paddingVertical: 20 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#0077ffc2' },
  modalContainer: { margin: 20, padding: 20, borderRadius: 8, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  modalSection: { marginBottom: 16 },
  selectableTransaction: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  selectedSummary: { marginTop: 8, padding: 8, backgroundColor: 'rgba(98, 0, 238, 0.1)', borderRadius: 4 },
  selectedText: { fontWeight: 'bold', textAlign: 'center' },
  modalDivider: { marginVertical: 16 },
  input: { marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  modalButton: { flex: 0.48 },
});