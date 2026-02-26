import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { db } from '../db';

export const useTransactions = () => {
  const { transactions, setTransactions } = useStore();

  const getFilteredLogs = (logDeptFilter: string) => {
    return useMemo(() => (transactions || []).filter(t => {
      return logDeptFilter === 'All' || t.department === logDeptFilter;
    }), [transactions, logDeptFilter]);
  };

  const clearHistory = async () => {
    await db.updateTransactions([]);
    setTransactions([]);
  };

  return {
    transactions,
    getFilteredLogs,
    clearHistory,
  };
};
