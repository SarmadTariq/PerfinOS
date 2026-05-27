export type TransactionType = 'income' | 'expense';
export type InsightSeverity = 'low' | 'medium' | 'high';
export type RecurringStatus = 'active' | 'inactive';
export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
export type UserPlanName = 'guest' | 'free' | 'premium_placeholder';
export type FeatureKey = 'cloudSync' | 'receiptUploads' | 'aiReports' | 'plannerChat' | 'accountRecovery';
export type LocationSource = 'current_location' | 'google_place' | 'imported';
export type ReceiptStatus = 'local' | 'uploading' | 'uploaded' | 'error';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  currency: string;
  monthlyIncome: number;
  monthlyBudget: number;
  createdAt: string;
}

export interface UserPlan {
  plan: UserPlanName;
  isGuest: boolean;
  features: Record<FeatureKey, boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseLocation {
  placeId?: string;
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  address: string;
  neighborhood?: string;
  source: LocationSource;
  placeType?: string;
}

export interface ReceiptAttachment {
  id: string;
  objectKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  status: ReceiptStatus;
  uri?: string;
  error?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  categoryName: string;
  merchant: string;
  date: string;
  notes: string;
  location: ExpenseLocation;
  paymentMethod: string;
  isRecurring: boolean;
  receipts: ReceiptAttachment[];
  updateCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
  monthlyBudget: number;
  isDefault: boolean;
}

export interface Budget {
  id: string;
  userId: string;
  month: string;
  totalBudget: number;
  categoryBudgets: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Insight {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  severity: InsightSeverity;
  createdAt: string;
}

export interface RecurringExpense {
  id: string;
  userId: string;
  merchant: string;
  amount: number;
  category: string;
  frequency: RecurringFrequency;
  nextDate: string;
  status: RecurringStatus;
}

export interface Report {
  id: string;
  userId: string;
  month: string;
  totalIncome: number;
  totalExpense: number;
  topCategory: string;
  budgetStatus: string;
  savingsProgress: number;
  generatedAt: string;
}

export interface AppData {
  user: User;
  entitlement: UserPlan;
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  recurringExpenses: RecurringExpense[];
  reports: Report[];
  onboarded: boolean;
}

export interface TransactionFilters {
  query?: string;
  type?: 'all' | TransactionType;
  categoryId?: string;
  month?: string;
  recurringOnly?: boolean;
}

export type TransactionSortKey = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'merchant-asc';
