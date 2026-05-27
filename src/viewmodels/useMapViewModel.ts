import { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { calculateLocationBreakdown } from '../repositories/AnalyticsRepository';
import { Transaction } from '../models/finance';
import { getMonthKey } from '../utils/format';

/**
 * Map ViewModel — manages mode, zoom, category filter, and selected transaction
 * state for MapView. Derives the visible transaction list and location breakdown.
 *
 * @returns Map interaction state, setters, and derived data for rendering
 */
export const useMapViewModel = () => {
  const { data } = useFinance();

  const [mode, setMode] = useState<'pins' | 'heatmap'>('heatmap');
  const [categoryId, setCategoryId] = useState('all');
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [zoom, setZoom] = useState(1);

  const expenseCategories = useMemo(
    () => data?.categories.filter((c) => c.type === 'expense') ?? [],
    [data?.categories]
  );

  const visibleTransactions = useMemo(
    () =>
      data?.transactions.filter(
        (t) => t.type === 'expense' && (categoryId === 'all' || t.categoryId === categoryId)
      ) ?? [],
    [data?.transactions, categoryId]
  );

  const activeTransaction = useMemo(() => {
    if (!selected) return visibleTransactions[0] ?? null;
    return visibleTransactions.some((t) => t.id === selected.id)
      ? selected
      : visibleTransactions[0] ?? null;
  }, [selected, visibleTransactions]);

  const locationBreakdown = useMemo(
    () => calculateLocationBreakdown(visibleTransactions, getMonthKey()),
    [visibleTransactions]
  );

  const zoomIn = () => setZoom((v) => Math.min(1.45, Math.round((v + 0.15) * 100) / 100));
  const zoomOut = () => setZoom((v) => Math.max(0.9, Math.round((v - 0.15) * 100) / 100));

  return {
    data,
    mode,
    setMode,
    categoryId,
    setCategoryId,
    selected,
    setSelected,
    zoom,
    zoomIn,
    zoomOut,
    expenseCategories,
    visibleTransactions,
    activeTransaction,
    locationBreakdown,
  };
};
