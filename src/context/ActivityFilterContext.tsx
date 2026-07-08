import React, { createContext, useContext, useMemo, useState } from 'react';
import type {
  Transaction,
  TransactionDatePreset,
  TransactionFrequencyFilter,
} from '../models/finance';

export interface ActivityDateRange {
  startDate?: string;
  endDate?: string;
  label: string;
}

export interface ActivitySummary {
  income: number;
  expenses: number;
  netCashFlow: number;
  transactionCount: number;
  recurringCount: number;
  oneTimeCount: number;
}

interface ActivityFilterContextValue {
  datePreset: TransactionDatePreset;
  customStartDate: string;
  customEndDate: string;
  frequencyFilter: TransactionFrequencyFilter;
  dateRange: ActivityDateRange;
  setDatePreset: (value: TransactionDatePreset) => void;
  setCustomStartDate: (value: string) => void;
  setCustomEndDate: (value: string) => void;
  setFrequencyFilter: (value: TransactionFrequencyFilter) => void;
  resetPeriodFilters: () => void;
}

const ActivityFilterContext = createContext<ActivityFilterContextValue | undefined>(undefined);

export const DATE_PRESET_OPTIONS: TransactionDatePreset[] = [
  'this-month',
  'last-month',
  'last-30-days',
  'this-year',
  'all',
  'custom',
];

export const FREQUENCY_FILTER_OPTIONS: TransactionFrequencyFilter[] = [
  'all',
  'recurring',
  'one-time',
];

export const toLocalIsoDate = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return local.toISOString().slice(0, 10);
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

export const getPresetDateRange = (
  preset: TransactionDatePreset,
  customStartDate: string,
  customEndDate: string
): ActivityDateRange => {
  const today = new Date();

  if (preset === 'all') {
    return { startDate: undefined, endDate: undefined, label: 'All dates' };
  }

  if (preset === 'custom') {
    return {
      startDate: customStartDate.trim() || undefined,
      endDate: customEndDate.trim() || undefined,
      label:
        customStartDate || customEndDate
          ? `${customStartDate || 'Start'} to ${customEndDate || 'Today'}`
          : 'Custom range',
    };
  }

  if (preset === 'last-month') {
    const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    return {
      startDate: toLocalIsoDate(startOfMonth(previousMonth)),
      endDate: toLocalIsoDate(endOfMonth(previousMonth)),
      label: 'Last month',
    };
  }

  if (preset === 'last-30-days') {
    const start = new Date(today);
    start.setDate(today.getDate() - 30);

    return {
      startDate: toLocalIsoDate(start),
      endDate: toLocalIsoDate(today),
      label: 'Last 30 days',
    };
  }

  if (preset === 'this-year') {
    return {
      startDate: `${today.getFullYear()}-01-01`,
      endDate: toLocalIsoDate(today),
      label: 'This year',
    };
  }

  return {
    startDate: toLocalIsoDate(startOfMonth(today)),
    endDate: toLocalIsoDate(endOfMonth(today)),
    label: 'This month',
  };
};

export const calculateActivitySummary = (transactions: Transaction[]): ActivitySummary => {
  const income = transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expenses = transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const recurringCount = transactions.filter((transaction) => transaction.isRecurring).length;

  return {
    income,
    expenses,
    netCashFlow: income - expenses,
    transactionCount: transactions.length,
    recurringCount,
    oneTimeCount: transactions.length - recurringCount,
  };
};

export const ActivityFilterProvider = ({ children }: { children: React.ReactNode }) => {
  const [datePreset, setDatePresetState] = useState<TransactionDatePreset>('this-month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState<TransactionFrequencyFilter>('all');

  const setDatePreset = (value: TransactionDatePreset) => {
    setDatePresetState(value);

    if (value !== 'custom') {
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  const resetPeriodFilters = () => {
    setDatePresetState('this-month');
    setCustomStartDate('');
    setCustomEndDate('');
    setFrequencyFilter('all');
  };

  const dateRange = useMemo(
    () => getPresetDateRange(datePreset, customStartDate, customEndDate),
    [customEndDate, customStartDate, datePreset]
  );

  const value = useMemo<ActivityFilterContextValue>(
    () => ({
      datePreset,
      customStartDate,
      customEndDate,
      frequencyFilter,
      dateRange,
      setDatePreset,
      setCustomStartDate,
      setCustomEndDate,
      setFrequencyFilter,
      resetPeriodFilters,
    }),
    [customEndDate, customStartDate, datePreset, dateRange, frequencyFilter]
  );

  return <ActivityFilterContext.Provider value={value}>{children}</ActivityFilterContext.Provider>;
};

export const useActivityFilters = () => {
  const context = useContext(ActivityFilterContext);

  if (!context) throw new Error('useActivityFilters must be used inside ActivityFilterProvider');

  return context;
};
