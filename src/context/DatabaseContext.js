import React, { createContext, useContext, useEffect } from 'react';
import DatabaseService from '../services/DatabaseService';

const DatabaseContext = createContext();

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

export const DatabaseProvider = ({ children }) => {
  useEffect(() => {
    DatabaseService.init();
  }, []);

  return (
    <DatabaseContext.Provider value={{ db: DatabaseService }}>
      {children}
    </DatabaseContext.Provider>
  );
};
