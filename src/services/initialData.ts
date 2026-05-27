import {
  AppData,
  Budget,
  Category,
  ExpenseLocation,
  FeatureKey,
  SavingsGoal,
  Transaction,
  UserPlan,
} from '../models/finance';
import { getMonthKey } from '../utils/format';

export const defaultCategories: Category[] = [
  { id: 'cat-income', name: 'Income', type: 'income', color: '#1E8E5A', icon: 'cash-plus', monthlyBudget: 0, isDefault: true },
  { id: 'cat-food', name: 'Food & Dining', type: 'expense', color: '#D95F43', icon: 'food', monthlyBudget: 520, isDefault: true },
  { id: 'cat-transport', name: 'Transportation', type: 'expense', color: '#367C9D', icon: 'car', monthlyBudget: 280, isDefault: true },
  { id: 'cat-housing', name: 'Housing', type: 'expense', color: '#725EAB', icon: 'home', monthlyBudget: 1250, isDefault: true },
  { id: 'cat-subscriptions', name: 'Subscriptions', type: 'expense', color: '#C18726', icon: 'television-play', monthlyBudget: 110, isDefault: true },
  { id: 'cat-shopping', name: 'Shopping', type: 'expense', color: '#A64F72', icon: 'shopping', monthlyBudget: 260, isDefault: true },
  { id: 'cat-health', name: 'Health', type: 'expense', color: '#2F8F83', icon: 'hospital-box', monthlyBudget: 160, isDefault: true },
  { id: 'cat-learning', name: 'Learning', type: 'expense', color: '#4B6FB4', icon: 'school', monthlyBudget: 90, isDefault: true },
];

const featureDefaults = (isGuest: boolean): Record<FeatureKey, boolean> => ({
  cloudSync: !isGuest,
  receiptUploads: !isGuest,
  aiReports: !isGuest,
  plannerChat: !isGuest,
  accountRecovery: !isGuest,
});

export const createEntitlement = (isGuest: boolean, now = new Date().toISOString()): UserPlan => ({
  plan: isGuest ? 'guest' : 'free',
  isGuest,
  features: featureDefaults(isGuest),
  createdAt: now,
  updatedAt: now,
});

export const createEmptyAppData = ({
  userId,
  name,
  email,
  isGuest,
}: {
  userId: string;
  name?: string;
  email?: string;
  isGuest: boolean;
}): AppData => {
  const now = new Date().toISOString();
  const month = getMonthKey();

  return {
    user: {
      id: userId,
      name: name?.trim() || (isGuest ? 'Guest User' : 'PerFin OS User'),
      email: email?.trim() || '',
      phone: '',
      currency: 'USD',
      monthlyIncome: 0,
      monthlyBudget: 0,
      createdAt: now,
    },
    entitlement: createEntitlement(isGuest, now),
    onboarded: false,
    categories: defaultCategories,
    transactions: [],
    budgets: [
      {
        id: `budget-${month}`,
        userId,
        month,
        totalBudget: 0,
        categoryBudgets: {},
        createdAt: now,
        updatedAt: now,
      },
    ],
    savingsGoals: [],
    recurringExpenses: [],
    reports: [],
  };
};

export const createDemoAppData = (): AppData => {
  const userId = 'guest-local';
  const now = new Date().toISOString();

  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const thisMonth = getMonthKey();
  const lastMonth = getMonthKey(lastMonthDate);

  const d = (month: string, day: number): string =>
    `${month}-${String(day).padStart(2, '0')}`;
  const ts = (date: string): string => `${date}T12:00:00.000Z`;

  const loc = (
    name: string,
    address: string,
    lat: number,
    lng: number,
    neighborhood?: string
  ): ExpenseLocation => ({
    name,
    formattedAddress: `${address}, Toronto, ON, Canada`,
    address,
    latitude: lat,
    longitude: lng,
    neighborhood,
    source: 'imported',
  });

  const tx = (
    id: string,
    type: 'income' | 'expense',
    amount: number,
    categoryId: string,
    categoryName: string,
    merchant: string,
    date: string,
    notes: string,
    location: ExpenseLocation,
    paymentMethod: string,
    isRecurring = false
  ): Transaction => ({
    id,
    userId,
    type,
    amount,
    categoryId,
    categoryName,
    merchant,
    date,
    notes,
    location,
    paymentMethod,
    isRecurring,
    receipts: [],
    updateCount: 0,
    createdAt: ts(date),
    updatedAt: ts(date),
  });

  const acmeHQ = loc('Acme Corp HQ', '130 King St W', 43.6477, -79.382, 'Financial District');
  const home = loc('Home — Annex', '82 Ulster St', 43.6602, -79.4101, 'Annex');
  const online = loc('Online', '620 King St W', 43.6437, -79.4042, 'Liberty Village');
  const appleOnline = loc('Apple Online Store', '100 Queen St W', 43.6527, -79.3831, 'Downtown');
  const googleOnline = loc('Google Online', '111 Richmond St W', 43.6512, -79.3828, 'Downtown');
  const bloorYonge = loc('Bloor-Yonge Station', '55 Bloor St W', 43.6709, -79.3862, 'Bloor-Yonge');

  const transactions: Transaction[] = [
    // ── Current month (days 1–14) ──
    tx('seed-cx-017', 'income', 2600, 'cat-income', 'Income', 'Acme Corp', d(thisMonth, 14), 'Bi-weekly paycheck', acmeHQ, 'Direct Deposit', true),
    tx('seed-cx-016', 'expense', 84.2, 'cat-food', 'Food & Dining', 'Whole Foods Market', d(thisMonth, 14), 'Weekly groceries', loc('Whole Foods Market', '1145 Bay St', 43.6687, -79.389, 'Yorkville'), 'Visa'),
    tx('seed-cx-015', 'expense', 156, 'cat-transport', 'Transportation', 'TTC', d(thisMonth, 13), 'Monthly transit pass', bloorYonge, 'Debit', true),
    tx('seed-cx-014', 'expense', 18.4, 'cat-transport', 'Transportation', 'Uber', d(thisMonth, 12), 'Late night ride home', loc('Uber Pickup — King St W', '200 King St W', 43.6477, -79.3867, 'Entertainment District'), 'Apple Pay'),
    tx('seed-cx-013', 'expense', 17.4, 'cat-food', 'Food & Dining', 'Chipotle', d(thisMonth, 11), 'Burrito bowl + chips', loc('Chipotle Mexican Grill', '324 Yonge St', 43.6554, -79.3802, 'Downtown'), 'Visa'),
    tx('seed-cx-012', 'expense', 64.3, 'cat-shopping', 'Shopping', 'Amazon', d(thisMonth, 10), 'USB-C hub and cables', online, 'Mastercard'),
    tx('seed-cx-011', 'expense', 6.8, 'cat-food', 'Food & Dining', 'Starbucks', d(thisMonth, 9), 'Cold brew', loc('Starbucks', '200 King St W', 43.6477, -79.382, 'Financial District'), 'Apple Pay'),
    tx('seed-cx-010', 'expense', 28.4, 'cat-health', 'Health', 'Shoppers Drug Mart', d(thisMonth, 8), 'Vitamins and skincare', loc('Shoppers Drug Mart', '700 Bay St', 43.6586, -79.3886, 'Bay-Bloor'), 'Debit'),
    tx('seed-cx-009', 'expense', 112.5, 'cat-food', 'Food & Dining', 'Metro Supermarket', d(thisMonth, 7), 'Bi-weekly grocery run', loc('Metro Supermarket', '333 Bloor St W', 43.6669, -79.4055, 'Annex'), 'Mastercard'),
    tx('seed-cx-008', 'expense', 49.99, 'cat-learning', 'Learning', 'Coursera', d(thisMonth, 6), 'UX Design Specialization', online, 'Visa'),
    tx('seed-cx-007', 'expense', 34.2, 'cat-food', 'Food & Dining', 'Naan & Kabob', d(thisMonth, 5), 'Dinner with friends', loc('Naan & Kabob', '1296 Bloor St W', 43.6604, -79.4348, 'Bloor West Village'), 'Cash'),
    tx('seed-cx-006', 'expense', 17.99, 'cat-subscriptions', 'Subscriptions', 'Netflix', d(thisMonth, 3), 'Monthly streaming', online, 'Visa', true),
    tx('seed-cx-005', 'expense', 10.99, 'cat-subscriptions', 'Subscriptions', 'Spotify', d(thisMonth, 3), 'Monthly music', online, 'Visa', true),
    tx('seed-cx-004', 'expense', 3.99, 'cat-subscriptions', 'Subscriptions', 'iCloud', d(thisMonth, 3), '50GB storage plan', appleOnline, 'Apple Pay', true),
    tx('seed-cx-003', 'expense', 13.99, 'cat-subscriptions', 'Subscriptions', 'YouTube Premium', d(thisMonth, 2), 'Ad-free YouTube', googleOnline, 'Mastercard', true),
    tx('seed-cx-002', 'expense', 1250, 'cat-housing', 'Housing', 'Toronto Rentals Inc.', d(thisMonth, 1), 'Monthly rent', home, 'Debit', true),
    tx('seed-cx-001', 'income', 2600, 'cat-income', 'Income', 'Acme Corp', d(thisMonth, 1), 'Bi-weekly paycheck', acmeHQ, 'Direct Deposit', true),
    // ── Last month ──
    tx('seed-lx-016', 'expense', 98.6, 'cat-food', 'Food & Dining', 'Loblaws', d(lastMonth, 25), 'Monthly grocery haul', loc('Loblaws', '60 Carlton St', 43.6628, -79.3793, 'Cabbagetown'), 'Mastercard'),
    tx('seed-lx-015', 'expense', 142.5, 'cat-shopping', 'Shopping', 'Zara', d(lastMonth, 22), 'Spring wardrobe refresh', loc('Zara — Eaton Centre', '220 Yonge St', 43.6535, -79.38, 'Downtown'), 'Visa'),
    tx('seed-lx-014', 'expense', 8.4, 'cat-food', 'Food & Dining', 'Tim Hortons', d(lastMonth, 20), 'Coffee and bagel', loc('Tim Hortons', '10 King St E', 43.648, -79.3766, 'St. Lawrence'), 'Apple Pay'),
    tx('seed-lx-013', 'expense', 24.99, 'cat-health', 'Health', 'Planet Fitness', d(lastMonth, 18), 'Gym membership', loc('Planet Fitness', '555 Dundas St W', 43.6533, -79.4023, 'Kensington'), 'Debit', true),
    tx('seed-lx-012', 'expense', 156, 'cat-transport', 'Transportation', 'TTC', d(lastMonth, 17), 'Monthly transit pass', bloorYonge, 'Debit', true),
    tx('seed-lx-011', 'expense', 22.8, 'cat-food', 'Food & Dining', 'Thai Express', d(lastMonth, 16), 'Pad thai lunch', loc('Thai Express', '900 Yonge St', 43.6715, -79.3868, 'Rosedale'), 'Visa'),
    tx('seed-lx-010', 'income', 2600, 'cat-income', 'Income', 'Acme Corp', d(lastMonth, 15), 'Bi-weekly paycheck', acmeHQ, 'Direct Deposit', true),
    tx('seed-lx-009', 'expense', 28.6, 'cat-health', 'Health', 'Shoppers Drug Mart', d(lastMonth, 14), 'Cold medicine and vitamins', loc('Shoppers Drug Mart', '700 Bay St', 43.6586, -79.3886, 'Bay-Bloor'), 'Debit'),
    tx('seed-lx-008', 'expense', 62.4, 'cat-transport', 'Transportation', 'Esso', d(lastMonth, 10), 'Gas for weekend trip', loc('Esso Gas Station', '1030 King St W', 43.6397, -79.4179, 'Parkdale'), 'Visa'),
    tx('seed-lx-007', 'expense', 19.99, 'cat-learning', 'Learning', 'Udemy', d(lastMonth, 6), 'React Native course', online, 'Mastercard'),
    tx('seed-lx-006', 'expense', 17.99, 'cat-subscriptions', 'Subscriptions', 'Netflix', d(lastMonth, 3), 'Monthly streaming', online, 'Visa', true),
    tx('seed-lx-005', 'expense', 10.99, 'cat-subscriptions', 'Subscriptions', 'Spotify', d(lastMonth, 3), 'Monthly music', online, 'Visa', true),
    tx('seed-lx-004', 'expense', 3.99, 'cat-subscriptions', 'Subscriptions', 'iCloud', d(lastMonth, 3), '50GB storage plan', appleOnline, 'Apple Pay', true),
    tx('seed-lx-003', 'expense', 13.99, 'cat-subscriptions', 'Subscriptions', 'YouTube Premium', d(lastMonth, 2), 'Ad-free YouTube', googleOnline, 'Mastercard', true),
    tx('seed-lx-002', 'expense', 1250, 'cat-housing', 'Housing', 'Toronto Rentals Inc.', d(lastMonth, 1), 'Monthly rent', home, 'Debit', true),
    tx('seed-lx-001', 'income', 2600, 'cat-income', 'Income', 'Acme Corp', d(lastMonth, 1), 'Bi-weekly paycheck', acmeHQ, 'Direct Deposit', true),
  ];

  const categoryBudgets: Record<string, number> = {
    'cat-food': 520,
    'cat-transport': 280,
    'cat-housing': 1250,
    'cat-subscriptions': 110,
    'cat-shopping': 260,
    'cat-health': 160,
    'cat-learning': 90,
  };

  const budgets: Budget[] = [
    { id: 'seed-budget-this', userId, month: thisMonth, totalBudget: 3200, categoryBudgets, createdAt: now, updatedAt: now },
    { id: 'seed-budget-last', userId, month: lastMonth, totalBudget: 3200, categoryBudgets, createdAt: now, updatedAt: now },
  ];

  const savingsGoals: SavingsGoal[] = [
    { id: 'seed-goal-001', userId, name: 'Emergency Fund', targetAmount: 10000, currentAmount: 4200, targetDate: '2026-12-31', createdAt: now, updatedAt: now },
    { id: 'seed-goal-002', userId, name: 'MacBook Pro M4', targetAmount: 2800, currentAmount: 840, targetDate: '2026-08-15', createdAt: now, updatedAt: now },
  ];

  return {
    user: { id: userId, name: 'Alex Johnson', email: '', phone: '', currency: 'CAD', monthlyIncome: 5200, monthlyBudget: 3200, createdAt: now },
    entitlement: createEntitlement(true, now),
    onboarded: true,
    categories: defaultCategories,
    transactions,
    budgets,
    savingsGoals,
    recurringExpenses: [],
    reports: [],
  };
};
