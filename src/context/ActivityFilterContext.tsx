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
  'this-week',
  'last-2-weeks',
  'this-month',
  'last-3-months',
  'last-6-months',
  'last-12-months',
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

const startOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const startOfWeek = (date: Date) => {
  const start = new Date(date);
  const daysSinceMonday = (start.getDay() + 6) % 7;

  start.setDate(start.getDate() - daysSinceMonday);

  return start;
};

const subtractDays = (date: Date, days: number) => {
  const result = new Date(date);

  result.setDate(result.getDate() - days);

  return result;
};

const subtractMonths = (
  date: Date,
  months: number
) => {
  const result = new Date(date);
  const targetDay = result.getDate();

  result.setDate(1);
  result.setMonth(result.getMonth() - months);

  const lastDay = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0
  ).getDate();

  result.setDate(Math.min(targetDay, lastDay));

  return result;
};

export const getPresetDateRange = (
  preset: TransactionDatePreset,
  customStartDate: string,
  customEndDate: string
): ActivityDateRange => {
  const today = new Date();
  const todayIso = toLocalIsoDate(today);

  if (preset === 'custom') {
    return {
      startDate:
        customStartDate.trim() || undefined,
      endDate:
        customEndDate.trim() || undefined,
      label: 'Custom dates',
    };
  }

  if (preset === 'this-week') {
    return {
      startDate: toLocalIsoDate(
        startOfWeek(today)
      ),
      endDate: todayIso,
      label: 'This week',
    };
  }

  if (preset === 'last-2-weeks') {
    return {
      startDate: toLocalIsoDate(
        subtractDays(today, 13)
      ),
      endDate: todayIso,
      label: 'Last 2 weeks',
    };
  }

  if (preset === 'last-3-months') {
    return {
      startDate: toLocalIsoDate(
        subtractMonths(today, 3)
      ),
      endDate: todayIso,
      label: 'Last 3 months',
    };
  }

  if (preset === 'last-6-months') {
    return {
      startDate: toLocalIsoDate(
        subtractMonths(today, 6)
      ),
      endDate: todayIso,
      label: 'Last 6 months',
    };
  }

  if (preset === 'last-12-months') {
    return {
      startDate: toLocalIsoDate(
        subtractMonths(today, 12)
      ),
      endDate: todayIso,
      label: 'Last 12 months',
    };
  }

  return {
    startDate: toLocalIsoDate(
      startOfMonth(today)
    ),
    endDate: todayIso,
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
