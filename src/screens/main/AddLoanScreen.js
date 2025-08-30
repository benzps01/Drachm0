import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  TextInput,
  Button,
  Title,
  Card,
  List,
  Divider,
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../context/AuthContext';
import { useDatabase } from '../../context/DatabaseContext';
import { useTheme } from '../../context/ThemeContext';

export default function AddLoanScreen({ navigation }) {
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [selectedPersonName, setSelectedPersonName] = useState('');
  const [persons, setPersons] = useState([]);
  const [personMenuVisible, setPersonMenuVisible] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [showAddPerson, setShowAddPerson] = useState(false);

  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(new Date());
  const [type, setType] = useState('lent');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  const { db } = useDatabase();
  const { isDark, theme } = useTheme();

  useEffect(() => {
    loadPersons();
  }, []);

  const loadPersons = async () => {
    try {
      const personsData = await db.getPersons(user.id);
      setPersons(personsData);
    } catch (error) {
      console.error('Error loading persons:', error);
    }
  };

  const handleAddNewPerson = async () => {
    if (!newPersonName.trim()) {
      Alert.alert('Error', 'Please enter person name');
      return;
    }

    try {
      const personId = await db.addPerson(user.id, newPersonName.trim());
      if (personId) {
        setSelectedPersonId(personId.toString());
        setSelectedPersonName(newPersonName.trim());
        setNewPersonName('');
        setShowAddPerson(false);
        setPersonMenuVisible(false);
        await loadPersons();
        Alert.alert('Success', 'Person added successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add person');
    }
  };

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const formatDateForDB = (date) => {
    return date.toISOString().split('T')[0];
  };

  const handleSubmit = async () => {
    if (!selectedPersonId || !amount.trim() || !reason.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      await db.addLoanDebt(
        user.id,
        parseInt(selectedPersonId),
        amt,
        type,
        reason.trim(),
        formatDateForDB(date)
      );

      Alert.alert('Success', 'Record added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to add record');
    }
    setLoading(false);
  };

  const clearForm = () => {
    setSelectedPersonId('');
    setSelectedPersonName('');
    setAmount('');
    setReason('');
    setDate(new Date());
    setType('lent');
    setPersonMenuVisible(false);
    setShowAddPerson(false);
    setNewPersonName('');
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView>
        <Card style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Card.Content>
            <Title style={[styles.title, { color: theme.colors.text }]}>
              Add Loan/Debt Record
            </Title>

            {/* Person Selection */}
            <View style={styles.personContainer}>
              <TouchableOpacity
                onPress={() => setPersonMenuVisible(!personMenuVisible)}
                style={styles.personSelector}
              >
                <TextInput
                  label='Select Person'
                  value={selectedPersonName || 'Choose person...'}
                  style={styles.input}
                  mode='outlined'
                  editable={false}
                  textColor={theme.colors.text}
                  theme={{
                    colors: {
                      outline: theme.colors.border,
                      onSurfaceVariant: theme.colors.textSecondary,
                    },
                  }}
                  right={
                    <TextInput.Icon
                      icon={personMenuVisible ? 'chevron-up' : 'chevron-down'}
                    />
                  }
                  pointerEvents='none'
                />
              </TouchableOpacity>

              {personMenuVisible && (
                <Card
                  style={[
                    styles.personMenu,
                    { backgroundColor: theme.colors.card },
                  ]}
                >
                  <ScrollView style={styles.personList} nestedScrollEnabled>
                    {persons.map((person) => (
                      <List.Item
                        key={person.id}
                        title={person.name}
                        onPress={() => {
                          setSelectedPersonId(person.id.toString());
                          setSelectedPersonName(person.name);
                          setPersonMenuVisible(false);
                        }}
                        style={[
                          styles.personItem,
                          selectedPersonId === person.id.toString() &&
                            styles.selectedPersonItem,
                        ]}
                        titleStyle={[
                          styles.personItemText,
                          { color: theme.colors.text },
                          selectedPersonId === person.id.toString() &&
                            styles.selectedPersonText,
                        ]}
                      />
                    ))}
                    <Divider />
                    <List.Item
                      title='+ Add New Person'
                      onPress={() => {
                        setPersonMenuVisible(false);
                        setShowAddPerson(true);
                      }}
                      style={styles.addPersonItem}
                      titleStyle={styles.addPersonText}
                    />
                  </ScrollView>
                </Card>
              )}
            </View>

            {/* Add New Person */}
            {showAddPerson && (
              <View style={styles.addPersonContainer}>
                <TextInput
                  label='New Person Name'
                  value={newPersonName}
                  onChangeText={setNewPersonName}
                  style={styles.input}
                  mode='outlined'
                  textColor={theme.colors.text}
                  theme={{
                    colors: {
                      outline: theme.colors.border,
                      onSurfaceVariant: theme.colors.textSecondary,
                    },
                  }}
                />
                <View style={styles.personButtons}>
                  <Button
                    mode='outlined'
                    onPress={() => {
                      setShowAddPerson(false);
                      setNewPersonName('');
                    }}
                    style={styles.personButton}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode='contained'
                    onPress={handleAddNewPerson}
                    style={styles.personButton}
                  >
                    Add
                  </Button>
                </View>
              </View>
            )}

            <TextInput
              label='Amount'
              value={amount}
              onChangeText={setAmount}
              style={styles.input}
              mode='outlined'
              keyboardType='numeric'
              textColor={theme.colors.text}
              theme={{
                colors: {
                  outline: theme.colors.border,
                  onSurfaceVariant: theme.colors.textSecondary,
                },
              }}
              left={<TextInput.Icon icon='currency-inr' />}
            />

            <TextInput
              label='Reason'
              value={reason}
              onChangeText={setReason}
              style={styles.input}
              mode='outlined'
              multiline
              numberOfLines={3}
              textColor={theme.colors.text}
              theme={{
                colors: {
                  outline: theme.colors.border,
                  onSurfaceVariant: theme.colors.textSecondary,
                },
              }}
            />

            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
              <TextInput
                label='Date'
                value={date.toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
                style={styles.input}
                mode='outlined'
                editable={false}
                textColor={theme.colors.text}
                theme={{
                  colors: {
                    outline: theme.colors.border,
                    onSurfaceVariant: theme.colors.textSecondary,
                  },
                }}
                right={<TextInput.Icon icon='calendar' />}
                pointerEvents='none'
              />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode='date'
                display='default'
                onChange={onChangeDate}
                maximumDate={new Date()}
              />
            )}

            <View style={styles.segmentedContainer}>
              <Button
                mode={type === 'lent' ? 'contained' : 'outlined'}
                onPress={() => setType('lent')}
                style={styles.typeButton}
                icon='trending-up'
              >
                I Lent Money
              </Button>
              <Button
                mode={type === 'borrowed' ? 'contained' : 'outlined'}
                onPress={() => setType('borrowed')}
                style={styles.typeButton}
                icon='trending-down'
              >
                I Borrowed Money
              </Button>
            </View>

            <View style={styles.actionButtons}>
              <Button
                mode='outlined'
                onPress={clearForm}
                style={styles.actionButton}
              >
                Clear
              </Button>
              <Button
                mode='contained'
                onPress={handleSubmit}
                loading={loading}
                style={styles.actionButton}
              >
                Save Record
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    margin: 16,
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
  },
  personContainer: {
    marginBottom: 16,
  },
  personSelector: {
    position: 'relative',
  },
  personMenu: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
  },
  personList: {
    maxHeight: 180,
  },
  personItem: {
    paddingVertical: 8,
  },
  selectedPersonItem: {
    backgroundColor: '#e3f2fd',
  },
  personItemText: {
    fontSize: 16,
  },
  selectedPersonText: {
    color: '#1976d2',
    fontWeight: 'bold',
  },
  addPersonItem: {
    paddingVertical: 8,
  },
  addPersonText: {
    color: '#0077ffc2',
    fontWeight: '500',
  },
  addPersonContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  personButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  personButton: {
    flex: 0.48,
  },
  segmentedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
    gap: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    flex: 0.48,
    paddingVertical: 8,
  },
});
