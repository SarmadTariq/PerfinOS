import { Category, Transaction } from '../../models/finance';

interface ExpenseNativeMapProps {
  transactions: Transaction[];
  categories: Category[];
  heatGroups: { label: string; amount: number; latitude: number; longitude: number }[];
  maxHeat: number;
  mode: 'pins' | 'heatmap';
  zoom: number;
  onSelect: (transaction: Transaction) => void;
}

export const ExpenseNativeMap = (_props: ExpenseNativeMapProps) => null;
