import { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { filterTransactions, sortTransactions } from '../repositories/AnalyticsRepository';
import { TransactionSortKey } from '../models/finance';

/**
 * Transaction list ViewModel — manages filter/sort state and derives the visible
 * transaction list for TransactionsView.
 *
 * Keeps UI state (query, type filter, sort key, sort panel toggle) co-located
 * with the derived list so TransactionsView is a pure render layer.
 *
 * @returns Filter/sort state setters and the derived `visible` transaction list
 */
export const useTransactionViewModel = () => {
  const { data, deleteTransaction } = useFinance();

  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | 'income' | 'expense'>('all');
  const [sortKey, setSortKey] = useState<TransactionSortKey>('date-desc');
  const [showSort, setShowSort] = useState(false);

  const visible = useMemo(
    () =>
      data
        ? sortTransactions(filterTransactions(data.transactions, { query, type }), sortKey)
        : [],
    [data?.transactions, query, type, sortKey]
  );

  return {
    data,
    query,
    setQuery,
    type,
    setType,
    sortKey,
    setSortKey,
    showSort,
    setShowSort,
    visible,
    deleteTransaction,
  };
};
