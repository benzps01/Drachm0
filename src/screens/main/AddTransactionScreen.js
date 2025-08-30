import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native';
import { TextInput, Button, Title, Card, SegmentedButtons, Divider, List, Modal, Portal } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../context/AuthContext';
import { useDatabase } from '../../context/DatabaseContext';
import { useTheme } from '../../context/ThemeContext';

export default function AddTransactionScreen({ navigation, route }) {
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [mode, setMode] = useState('UPI');
  const [particulars, setParticulars] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState(route.params?.type || 'expense');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  const { db } = useDatabase();
  const { theme } = useTheme();

  const modes = [
    { value: 'CC', label: 'Credit Card' },
    { value: 'UPI', label: 'UPI' },
    { value: 'Cash', label: 'Cash' },
    { value: 'Debit', label: 'Debit Card' },
  ];

  const typeButtons = [
    { value: 'expense', label: 'Expense' },
    { value: 'income', label: 'Income' },
  ];

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoryData = await db.getCategories(type);
        setCategories(categoryData);
        if (categoryData.length > 0) {
          setCategoryId(categoryData[0].id.toString());
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };
    loadCategories();
  }, [type]);
  
  const clearForm = () => {
    setDate(new Date());
    setMode('UPI');
    setParticulars('');
    setAmount('');
    setCategoryMenuVisible(false);
    setNewCategoryName('');
    setShowAddCategory(false);
    // No need to call loadCategories, useEffect will handle it when type is reset if needed
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter category name');
      return;
    }
    try {
      const newCategoryId = await db.addCategory(newCategoryName.trim(), type);
      setNewCategoryName('');
      setShowAddCategory(false);
      const categoryData = await db.getCategories(type);
      setCategories(categoryData);
      setCategoryId(newCategoryId.toString());
      Alert.alert('Success', 'Category added successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to add category');
    }
  };

  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const formatDate = (date) => date.toLocaleDateString('en-CA');
  const formatDisplayDate = (date) => date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const handleSubmit = async () => {
    if (!date || !particulars || !amount || !categoryId) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (type === 'expense' && !mode) {
      Alert.alert('Error', 'Please select a payment mode for expenses');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    setLoading(true);
    try {
      await db.addTransaction(user.id, formatDate(date), type === 'expense' ? mode : 'N/A', particulars, numAmount, type, parseInt(categoryId));
      Alert.alert('Success', 'Transaction added successfully', [{ text: 'OK', onPress: () => { navigation.goBack(); } }]);
    } catch (error) {
      console.error('Add transaction error:', error);
      Alert.alert('Error', 'Failed to add transaction: ' + error.message);
    }
    setLoading(false);
  };

  const getSelectedCategoryName = () => {
    const category = categories.find((cat) => cat.id.toString() === categoryId);
    return category ? category.name : 'Select Category';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView>
        <Card style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Card.Content>
            <Title style={[styles.title, { color: theme.colors.text }]}>Add New Transaction</Title>

            <SegmentedButtons
              value={type}
              onValueChange={(newType) => {
                setCategories([]);
                setCategoryId('');
                setType(newType);
              }}
              buttons={typeButtons}
              style={styles.segmentedButtons}
            />

            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
              <TextInput label='Date' value={formatDisplayDate(date)} style={styles.input} mode='outlined' editable={false} right={<TextInput.Icon icon='calendar' />} pointerEvents='none' textColor={theme.colors.text} theme={{ colors: { onSurfaceVariant: theme.colors.textSecondary, outline: theme.colors.border } }} />
            </TouchableOpacity>

            {showDatePicker && (<DateTimePicker testID='dateTimePicker' value={date} mode='date' is24Hour={true} display='default' onChange={handleDateChange} maximumDate={new Date()} />)}

            {type === 'expense' && (
              <View style={styles.modeContainer}>
                <Title style={[styles.sectionTitle, { color: theme.colors.text }]}>Payment Mode</Title>
                <View style={styles.modeButtons}>
                  {modes.map((modeOption) => (<Button key={modeOption.value} mode={mode === modeOption.value ? 'contained' : 'outlined'} onPress={() => setMode(modeOption.value)} style={styles.modeButton} compact>{modeOption.label}</Button>))}
                </View>
              </View>
            )}

            <TextInput label='Description' value={particulars} onChangeText={setParticulars} style={styles.input} mode='outlined' multiline textColor={theme.colors.text} theme={{ colors: { onSurfaceVariant: theme.colors.textSecondary, outline: theme.colors.border } }} />
            <TextInput label='Amount' value={amount} onChangeText={setAmount} style={styles.input} mode='outlined' keyboardType='numeric' left={<TextInput.Icon icon='currency-inr' />} textColor={theme.colors.text} theme={{ colors: { onSurfaceVariant: theme.colors.textSecondary, outline: theme.colors.border } }} />

            <TouchableOpacity onPress={() => setCategoryMenuVisible(true)}>
              <TextInput label='Category' value={getSelectedCategoryName()} style={styles.input} mode='outlined' right={<TextInput.Icon icon={'chevron-down'} />} editable={false} pointerEvents='none' textColor={theme.colors.text} theme={{ colors: { onSurfaceVariant: theme.colors.textSecondary, outline: theme.colors.border } }} />
            </TouchableOpacity>

            <View style={styles.actionButtons}>
              <Button mode='outlined' onPress={clearForm} style={styles.actionButton}>Clear</Button>
              <Button mode='contained' onPress={handleSubmit} loading={loading} style={styles.actionButton}>Add Transaction</Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <Portal>
        <Modal visible={categoryMenuVisible} onDismiss={() => setCategoryMenuVisible(false)} contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.card }]}>
          <ScrollView>
            {showAddCategory ? (
              <View>
                <Title style={{color: theme.colors.text}}>Add New Category</Title>
                <TextInput label='New Category Name' value={newCategoryName} onChangeText={setNewCategoryName} style={styles.input} mode='outlined' textColor={theme.colors.text} theme={{ colors: { onSurfaceVariant: theme.colors.textSecondary, outline: theme.colors.border } }} />
                <View style={styles.categoryButtons}>
                  <Button mode='outlined' onPress={() => setShowAddCategory(false)}>Cancel</Button>
                  <Button mode='contained' onPress={handleAddCategory}>Add</Button>
                </View>
              </View>
            ) : (
              <>
                {categories.map((category) => (
                  <List.Item key={category.id} title={category.name} onPress={() => { setCategoryId(category.id.toString()); setCategoryMenuVisible(false); }} titleStyle={{ color: theme.colors.text }} />
                ))}
                <Divider />
                <List.Item title='+ Add New Category' onPress={() => setShowAddCategory(true)} titleStyle={styles.addCategoryText} />
              </>
            )}
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { margin: 16 },
  title: { textAlign: 'center', marginBottom: 16 },
  segmentedButtons: { marginBottom: 16 },
  input: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, marginBottom: 8 },
  modeContainer: { marginBottom: 16 },
  modeButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modeButton: { marginRight: 8, marginBottom: 8 },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  actionButton: { flex: 0.48, paddingVertical: 8 },
  modalContainer: { margin: 20, padding: 20, borderRadius: 8, maxHeight: '70%' },
  addCategoryText: { color: '#0077ffc2', fontWeight: '500' },
  categoryButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 8 },
});