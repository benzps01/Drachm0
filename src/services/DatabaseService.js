import * as SQLite from 'expo-sqlite';

class DatabaseService {
  constructor() {
    this.db = null;
  }

  async init() {
    this.db = await SQLite.openDatabaseAsync('expenseTracker.db');
    await this.db.execAsync('PRAGMA foreign_keys = ON;');

    let { user_version } = await this.db.getFirstAsync('PRAGMA user_version');

    if (user_version < 2) {
      console.log('Running migration to version 2...');
      if (user_version === 0) {
        await this.createTables();
        await this.insertDefaultCategories();
      }
      
      const loansCategoryExists = await this.db.getFirstAsync(
        "SELECT id FROM categories WHERE name = 'Loans & Debts'"
      );
      if (!loansCategoryExists) {
        await this.db.runAsync(
          "INSERT INTO categories (name, type, user_created) VALUES (?, 'both', 0)",
          ['Loans & Debts']
        );
        console.log("'Loans & Debts' category added successfully.");
      }
      await this.db.execAsync('PRAGMA user_version = 2');
      console.log('Database migrated to version 2.');
    }
  }

  async createTables() {
    await this.db.execAsync(`
      PRAGMA journal_mode = WAL;
      
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'both')),
        user_created INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, type)
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        mode TEXT NOT NULL CHECK(mode IN ('CC', 'UPI', 'Cash', 'Debit', 'N/A')),
        particulars TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        category_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (category_id) REFERENCES categories (id)
      );

      CREATE TABLE IF NOT EXISTS persons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, name)
    );
    
    CREATE TABLE IF NOT EXISTS loans_debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      person_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('lent', 'borrowed')),
      reason TEXT NOT NULL,
      date_created TEXT NOT NULL,
      date_settled TEXT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'settled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (person_id) REFERENCES persons (id)
    );
    `);
  }

  async insertDefaultCategories() {
    const defaultCategories = [
      { name: 'Food & Dining', type: 'expense' }, { name: 'Transport', type: 'expense' },
      { name: 'Groceries', type: 'expense' }, { name: 'Bills & Utilities', type: 'expense' },
      { name: 'Entertainment', type: 'expense' }, { name: 'Health', type: 'expense' },
      { name: 'Shopping', type: 'expense' }, { name: 'Miscellaneous', type: 'expense' },
      { name: 'Salary', type: 'income' }, { name: 'Business', type: 'income' },
      { name: 'Interest', type: 'income' }, { name: 'Gift', type: 'income' },
      { name: 'Loans & Debts', type: 'both' },
      { name: 'Other', type: 'both' },
    ];
    for (const category of defaultCategories) {
      // Use a "INSERT OR IGNORE" to avoid crashing if categories already exist
      await this.db.runAsync('INSERT OR IGNORE INTO categories (name, type, user_created) VALUES (?, ?, 0)', [category.name, category.type]);
    }
  }

  async registerUser(username, password) {
    try {
      const result = await this.db.runAsync('INSERT INTO users (username, password) VALUES (?, ?)', [username, password]);
      return { success: true, userId: result.lastInsertRowId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async loginUser(username, password) {
    return await this.db.getFirstAsync('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]) || null;
  }

  async getCategories(type = null) {
    const query = type ? 'SELECT * FROM categories WHERE type = ? OR type = "both" ORDER BY user_created, name' : 'SELECT * FROM categories ORDER BY user_created, name';
    const params = type ? [type] : [];
    return await this.db.getAllAsync(query, params);
  }

  async addCategory(name, type) {
    const trimmedName = name.trim();
  
    // 1. Check if the category already exists (case-insensitive)
    const existingCategory = await this.db.getFirstAsync(
      'SELECT id FROM categories WHERE lower(name) = lower(?) AND (type = ? OR type = "both")',
      [trimmedName, type]
    );
  
    // 2. If it exists, return the ID of the existing category
    if (existingCategory) {
      console.log(`Category "${trimmedName}" already exists.`);
      return existingCategory.id;
    }
  
    // 3. If it does not exist, insert the new category
    const result = await this.db.runAsync('INSERT INTO categories (name, type, user_created) VALUES (?, ?, 1)', [trimmedName, type]);
    return result.lastInsertRowId;
  }

  async addTransaction(userId, date, mode, particulars, amount, type, categoryId) {
    const result = await this.db.runAsync('INSERT INTO transactions (user_id, date, mode, particulars, amount, type, category_id) VALUES (?, ?, ?, ?, ?, ?, ?)', [userId, date, mode, particulars, amount, type, categoryId]);
    return result.lastInsertRowId;
  }

  async getTransactions(userId, filters = {}) {
    let query = `SELECT t.*, c.name as category_name FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = ?`;
    const params = [userId];
    if (filters.mode && filters.mode !== 'N/A') { query += ' AND t.mode = ?'; params.push(filters.mode); }
    if (filters.dateFrom) { query += ' AND t.date >= ?'; params.push(filters.dateFrom); }
    if (filters.dateTo) { query += ' AND t.date <= ?'; params.push(filters.dateTo); }
    query += ' ORDER BY t.date DESC, t.id DESC';
    return await this.db.getAllAsync(query, params);
  }

  async updateTransaction(id, date, mode, particulars, amount, type, categoryId) {
    await this.db.runAsync('UPDATE transactions SET date = ?, mode = ?, particulars = ?, amount = ?, type = ?, category_id = ? WHERE id = ?', [date, mode, particulars, amount, type, categoryId, id]);
  }

  async deleteTransaction(id) {
    await this.db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
  }

  async getDashboardStats(userId) {
    const totalBalanceResult = await this.db.getFirstAsync(`SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as balance FROM transactions WHERE user_id = ?`, [userId]);
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const monthlyStatsResult = await this.db.getFirstAsync(`SELECT COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as income, COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as expense FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = ? AND strftime('%Y-%m', t.date) = ? AND c.name != 'Loans & Debts'`, [userId, currentMonth]);
    return {
      totalBalance: totalBalanceResult?.balance ?? 0,
      monthlyIncome: monthlyStatsResult?.income ?? 0,
      monthlyExpense: monthlyStatsResult?.expense ?? 0,
    };
  }

  async getAnalyticsData(userId) {
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const modeStats = await this.db.getAllAsync(`SELECT t.mode, SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as income, SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as expense FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = ? AND strftime('%Y-%m', t.date) = ? AND t.mode != 'N/A' AND c.name != 'Loans & Debts' GROUP BY t.mode`, [userId, currentMonth]);
    const categoryStats = await this.db.getAllAsync(`SELECT c.name as category, t.type, SUM(t.amount) as total FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = ? AND strftime('%Y-%m', t.date) = ? AND c.name != 'Loans & Debts' GROUP BY c.name, t.type`, [userId, currentMonth]);
    return { modeStats, categoryStats };
  }

  async addPerson(userId, personName) {
    try {
      const result = await this.db.runAsync('INSERT INTO persons (user_id, name) VALUES (?, ?)', [userId, personName.trim()]);
      return result.lastInsertRowId;
    } catch (error) {
      const existing = await this.db.getFirstAsync('SELECT id FROM persons WHERE user_id = ? AND name = ?', [userId, personName.trim()]);
      return existing ? existing.id : null;
    }
  }

  async getPersons(userId) {
    return await this.db.getAllAsync('SELECT * FROM persons WHERE user_id = ? ORDER BY name ASC', [userId]);
  }

  async getPersonById(personId) {
    return await this.db.getFirstAsync('SELECT * FROM persons WHERE id = ?', [personId]);
  }

  async addLoanDebt(userId, personId, amount, type, reason, dateCreated) {
    const result = await this.db.runAsync('INSERT INTO loans_debts (user_id, person_id, amount, type, reason, date_created) VALUES (?, ?, ?, ?, ?, ?)', [userId, personId, amount, type, reason, dateCreated]);
    if (type === 'lent') {
      try {
        const person = await this.getPersonById(personId);
        let category = await this.db.getFirstAsync("SELECT id FROM categories WHERE name = 'Loans & Debts'");
        if (!category) {
          console.log("Category 'Loans & Debts' not found. Creating it now.");
          const newCategoryId = await this.addCategory('Loans & Debts', 'both');
          category = { id: newCategoryId };
        }
        if (person && category) {
          await this.addTransaction(userId, dateCreated, 'N/A', `Lent to ${person.name} (${reason})`, amount, 'expense', category.id);
        } else {
          console.error("Could not find Person or Category to create automatic transaction.");
        }
      } catch (error) {
        console.error("Failed to create automatic 'lent' transaction:", error);
      }
    }
    return result.lastInsertRowId;
  }

  async getLoansDebtsByPerson(userId, status = null) {
    const statusParam = status || 'pending';
    return await this.db.getAllAsync(`SELECT p.id as person_id, p.name as person_name, COALESCE(SUM(CASE WHEN ld.type = 'lent' AND ld.status = ? THEN ld.amount ELSE 0 END), 0) as total_lent, COALESCE(SUM(CASE WHEN ld.type = 'borrowed' AND ld.status = ? THEN ld.amount ELSE 0 END), 0) as total_borrowed, COUNT(CASE WHEN ld.status = ? THEN 1 END) as pending_count FROM persons p LEFT JOIN loans_debts ld ON p.id = ld.person_id WHERE p.user_id = ? GROUP BY p.id, p.name HAVING pending_count > 0 ORDER BY p.name ASC`, [statusParam, statusParam, statusParam, userId]);
  }

  async getPersonLoansDebts(userId, personId, status = null) {
    let query = `SELECT ld.*, p.name as person_name FROM loans_debts ld JOIN persons p ON ld.person_id = p.id WHERE ld.user_id = ? AND ld.person_id = ?`;
    const params = [userId, personId];
    if (status) { query += ' AND ld.status = ?'; params.push(status); }
    query += ' ORDER BY ld.created_at DESC';
    return await this.db.getAllAsync(query, params);
  }

  async getLoansDebtsStats(userId) {
    const statsResult = await this.db.getFirstAsync(`SELECT COALESCE(SUM(CASE WHEN type = 'lent' AND status = 'pending' THEN amount ELSE 0 END), 0) as total_lent, COALESCE(SUM(CASE WHEN type = 'borrowed' AND status = 'pending' THEN amount ELSE 0 END), 0) as total_borrowed FROM loans_debts WHERE user_id = ?`, [userId]);
    return {
      totalLent: statsResult?.total_lent ?? 0,
      totalBorrowed: statsResult?.total_borrowed ?? 0,
    };
  }

  async settleLoanDebt(loanId, settlementDate) {
    await this.db.runAsync('UPDATE loans_debts SET status = ?, date_settled = ? WHERE id = ?', ['settled', settlementDate, loanId]);
  }
  
  async getDailySpendHistory(userId, dateFrom, dateTo) {
    const query = `SELECT t.date, SUM(t.amount) as total_spend FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = ? AND t.type = 'expense' AND c.name != 'Loans & Debts' AND t.date >= ? AND t.date <= ? GROUP BY t.date ORDER BY t.date ASC;`;
    return await this.db.getAllAsync(query, [userId, dateFrom, dateTo]);
  }

  async getMonthlySpendHistory(userId, dateFrom) {
    const query = `SELECT strftime('%Y-%m', t.date) as month, SUM(t.amount) as total_spend FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = ? AND t.type = 'expense' AND c.name != 'Loans & Debts' AND t.date >= ? GROUP BY month ORDER BY month DESC;`;
    return await this.db.getAllAsync(query, [userId, dateFrom]);
  }
}

export default new DatabaseService();