import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Button, Card, Input, Text } from '../components';
import { ExpenseNativeMap } from '../components/ExpenseNativeMap';
import {
  BarListChart,
  CategoryBadge,
  ChartCard,
  ConfirmModal,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  MetricGrid,
  ProgressBar,
  ScreenHeader,
  StatCard,
  Toast,
} from '../components/PerFinOSUI';
import { useFinance, useInsights } from '../context/FinanceContext';
import { useTheme, useThemeScheme } from '../context/ThemeContext';
import { AppData, Category, ReceiptAttachment, Transaction, TransactionSortKey } from '../models/finance';
import {
  calculateBudgetHealth,
  calculateCategoryBreakdown,
  calculateLocationBreakdown,
  calculateMonthlySummary,
  calculateSavingsProgress,
  filterTransactions,
  groupTransactionsByMonth,
  groupTransactionsByWeek,
  sortTransactions,
} from '../services/financeAnalytics';
import { getCurrentLocation, getLocationSuggestions } from '../services/locationService';
import { createLocalReceiptAttachment, receiptUploadConfigured, uploadReceiptToWorker } from '../services/receiptService';
import { generatePlannerResult, AiPlannerResult } from '../services/aiService';
import { Colors, Radius, Spacing } from '../theme';
import { formatCurrency, formatCurrencyPrecise, getMonthKey, readableMonth, todayIso } from '../utils/format';
import { mcIconName } from '../utils/icons';
import {
  MAX_RECEIPTS_PER_TRANSACTION,
  MAX_RECEIPT_BYTES,
  parseMoney,
  sanitizeMoneyInput,
  SUPPORTED_RECEIPT_MIME_TYPES,
} from '../utils/validation';

const useColors = () => {
  const scheme = useThemeScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
};

const AppScroll = ({ children }: { children: React.ReactNode }) => {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const horizontalPadding = width >= 900 ? Spacing.xxxl : Spacing.lg;
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: horizontalPadding,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        scrollEnabled
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageFrame}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
};

const DataContent = ({
  data,
  render,
}: {
  data: AppData;
  render: (data: AppData) => React.ReactNode;
}) => <>{render(data)}</>;

const RequireData = ({ children }: { children: (data: AppData) => React.ReactNode }) => {
  const { data, status, error, logout } = useFinance();
  if (status === 'loading') return <LoadingState />;
  if (status === 'error' || !data) return <ErrorState message={error || 'PerFin OS could not load data.'} onRetry={logout} />;
  return <DataContent data={data} render={children} />;
};

const TORONTO_LOCATION = {
  latitude: 43.6532,
  longitude: -79.3832,
  address: 'Toronto, ON',
  neighborhood: 'Downtown',
};

const LOCATION_OPTIONS = [
  TORONTO_LOCATION,
  { latitude: 43.6629, longitude: -79.3957, address: 'The Annex, Toronto, ON', neighborhood: 'The Annex' },
  { latitude: 43.6548, longitude: -79.4005, address: 'Kensington Market, Toronto, ON', neighborhood: 'Kensington Market' },
  { latitude: 43.6456, longitude: -79.3807, address: 'Union Station, Toronto, ON', neighborhood: 'Downtown' },
  { latitude: 43.6596, longitude: -79.3977, address: 'University of Toronto, Toronto, ON', neighborhood: 'University District' },
  { latitude: 43.6557, longitude: -79.3802, address: 'CF Toronto Eaton Centre, Toronto, ON', neighborhood: 'Downtown' },
  { latitude: 43.6478, longitude: -79.3958, address: 'King West, Toronto, ON', neighborhood: 'King West' },
  { latitude: 43.6677, longitude: -79.3948, address: 'Bloor Street, Toronto, ON', neighborhood: 'Bloor-Yorkville' },
  { latitude: 43.6486, longitude: -79.3716, address: 'St. Lawrence Market, Toronto, ON', neighborhood: 'St. Lawrence' },
  { latitude: 43.6532, longitude: -79.3832, address: 'Online subscription', neighborhood: 'Online' },
];

const PAYMENT_METHOD_OPTIONS = ['Debit card', 'Credit card', 'Cash', 'Bank transfer', 'Direct deposit', 'Apple Pay', 'Google Pay'];
const CURRENCY_OPTIONS = ['USD', 'CAD', 'EUR', 'GBP', 'AUD', 'INR', 'JPY'];
type LocationOption = { latitude: number; longitude: number; address: string; neighborhood?: string };
type PlaceOption = LocationOption & { name: string; formattedAddress: string; placeId?: string; placeType?: string };

const MAP_BOUNDS = {
  minLat: 43.62,
  maxLat: 43.69,
  minLng: -79.43,
  maxLng: -79.35,
};

const getMapPosition = (latitude: number, longitude: number) => ({
  left: `${Math.min(Math.max(((longitude - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * 100, 4), 92)}%` as `${number}%`,
  top: `${Math.min(Math.max((1 - (latitude - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 100, 8), 86)}%` as `${number}%`,
});

const isValidDateInput = (date: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(new Date(`${date}T00:00:00`).getTime());

const Field = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  error,
  secureTextEntry,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: React.ComponentProps<typeof Input>['keyboardType'];
  error?: string;
  secureTextEntry?: boolean;
}) => (
  <View style={{ marginBottom: Spacing.md }}>
    <Text variant="bodySmall" style={styles.label}>
      {label}
    </Text>
    <Input
      accessibilityLabel={label}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      error={!!error}
    />
    {error ? (
      <Text accessibilityRole="alert" variant="bodySmall" color="danger" style={{ marginTop: -Spacing.sm }}>
        {error}
      </Text>
    ) : null}
  </View>
);

export const WelcomeScreen = () => {
  const navigation = useNavigation<any>();
  const colors = useColors();
  const { continueAsGuest } = useFinance();
  return (
    <AppScroll>
      <View style={styles.hero}>
        <View style={[styles.logoMark, { backgroundColor: colors.primarySoft }]}>
          <MaterialIcons name="query-stats" size={42} color={colors.primary} />
        </View>
        <Text variant="h1" style={{ textAlign: 'center' }}>
          PerFin OS
        </Text>
        <Text variant="bodyLarge" color="secondary" style={styles.centerCopy}>
          Track expenses, see where they happen, and plan your next month with cleaner financial visibility.
        </Text>
      </View>
      <Card shadow="sm">
        <Text variant="h4">Secure finance workspace</Text>
        <Text variant="body" color="secondary" style={{ marginTop: Spacing.sm }}>
          Sign in to sync your data, attach receipts, and unlock AI planning features.
        </Text>
        <Button label="Login" onPress={() => navigation.navigate('Login')} size="lg" style={{ marginTop: Spacing.lg }} />
        <Button label="Create Account" onPress={() => navigation.navigate('Signup')} variant="secondary" style={{ marginTop: Spacing.sm }} />
        <Button label="Continue as Guest" onPress={continueAsGuest} variant="secondary" style={{ marginTop: Spacing.sm }} />
      </Card>
    </AppScroll>
  );
};

export const LoginScreen = () => {
  const navigation = useNavigation<any>();
  const { loginWithEmail, continueAsGuest, data } = useFinance();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (importGuestData = false) => {
    try {
      await loginWithEmail(email, password, { importGuestData });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const confirmLogin = () => {
    if (data?.entitlement?.isGuest && data.transactions.length > 0) {
      Alert.alert('Import guest data?', 'You have local guest data. Import it into this account after login?', [
        { text: 'Start Fresh', style: 'cancel', onPress: () => submit(false) },
        { text: 'Import', onPress: () => submit(true) },
      ]);
      return;
    }
    submit(false);
  };

  return (
    <AppScroll>
      <ScreenHeader title="Login" subtitle="Access your PerFin OS workspace." />
      <Card shadow="sm">
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
        <Field label="Password" value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
        {error ? <Text color="danger">{error}</Text> : null}
        <Button label="Login" onPress={confirmLogin} size="lg" />
        <Button label="Continue as Guest" onPress={continueAsGuest} variant="secondary" style={{ marginTop: Spacing.md }} />
        <Button label="Create Account" onPress={() => navigation.navigate('Signup')} variant="secondary" style={{ marginTop: Spacing.sm }} />
        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} accessibilityRole="button">
          <Text style={styles.linkText}>Forgot password?</Text>
        </TouchableOpacity>
      </Card>
    </AppScroll>
  );
};

export const SignupScreen = () => {
  const navigation = useNavigation<any>();
  const { signupWithEmail, data } = useFinance();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (importGuestData = false) => {
    try {
      await signupWithEmail(name, email, password, { importGuestData });
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    }
  };

  const confirmSignup = () => {
    if (data?.entitlement?.isGuest && data.transactions.length > 0) {
      Alert.alert('Import guest data?', 'Create your account and import local guest data?', [
        { text: 'Start Fresh', style: 'cancel', onPress: () => submit(false) },
        { text: 'Import', onPress: () => submit(true) },
      ]);
      return;
    }
    submit(false);
  };

  return (
    <AppScroll>
      <ScreenHeader title="Create Account" subtitle="Create a synced PerFin OS workspace." />
      <Card shadow="sm">
        <Field label="Name" value={name} onChangeText={setName} placeholder="Full name" />
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
        <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 6 characters" secureTextEntry />
        {error ? <Text color="danger">{error}</Text> : null}
        <Button label="Create Account" onPress={confirmSignup} size="lg" />
        <Button label="Back to Login" onPress={() => navigation.navigate('Login')} variant="secondary" style={{ marginTop: Spacing.md }} />
      </Card>
    </AppScroll>
  );
};

export const ForgotPasswordScreen = () => {
  const { forgotPassword } = useFinance();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    try {
      await forgotPassword(email);
      setMessage('If this email exists, PerFin OS will send password recovery instructions.');
    } catch (err: any) {
      setMessage(err.message || 'Email is required');
    }
  };

  return (
    <AppScroll>
      <ScreenHeader title="Forgot Password" subtitle="Recover access to your PerFin OS account." />
      <Card shadow="sm">
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
        <Button label="Send Reset Instructions" onPress={submit} />
        {message ? <Text color="secondary" style={{ marginTop: Spacing.md }}>{message}</Text> : null}
      </Card>
    </AppScroll>
  );
};

export const OnboardingScreen = () => {
  const { data, completeOnboarding } = useFinance();
  const [name, setName] = useState(data?.user.name || '');
  const [income, setIncome] = useState(String(data?.user.monthlyIncome || 0));
  const [budget, setBudget] = useState(String(data?.user.monthlyBudget || 0));
  const [currency, setCurrency] = useState(data?.user.currency || 'USD');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const monthlyIncome = Number(income);
    const monthlyBudget = Number(budget);
    if (!name.trim()) return setError('Name is required');
    if (monthlyIncome <= 0) return setError('Monthly income must be positive');
    if (monthlyBudget < 0) return setError('Budget cannot be negative');
    await completeOnboarding({ name, monthlyIncome, monthlyBudget, currency });
  };

  return (
    <AppScroll>
      <ScreenHeader title="Onboarding" subtitle="Set the profile basics that power the dashboard." />
      <Card shadow="sm">
        <Field label="Name" value={name} onChangeText={setName} placeholder="Full name" />
        <SelectField label="Currency" value={currency} options={CURRENCY_OPTIONS} onChange={setCurrency} />
        <Field label="Monthly Income" value={income} onChangeText={(value) => setIncome(sanitizeMoneyInput(value))} placeholder="4200" keyboardType="numeric" />
        <Field label="Monthly Budget" value={budget} onChangeText={(value) => setBudget(sanitizeMoneyInput(value))} placeholder="2600" keyboardType="numeric" />
        {error ? <Text color="danger">{error}</Text> : null}
        <Button label="Finish Setup" onPress={submit} size="lg" />
      </Card>
    </AppScroll>
  );
};

const DashboardHero = ({
  name,
  month,
  netCashFlow,
  budgetUsed,
  currency,
  onAdd,
}: {
  name: string;
  month: string;
  netCashFlow: number;
  budgetUsed: number;
  currency: string;
  onAdd: () => void;
}) => {
  const colors = useColors();
  const status = budgetUsed >= 100 ? 'Over budget' : budgetUsed >= 85 ? 'Watch pace' : 'On track';
  const statusColor = budgetUsed >= 100 ? colors.danger : budgetUsed >= 85 ? colors.warning : colors.success;
  return (
    <View style={[styles.dashboardHero, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.heroCopy}>
        <Text variant="h1" style={styles.heroTitle}>
          Good afternoon, {name.split(' ')[0]}
        </Text>
        <Text variant="body" color="secondary" style={{ maxWidth: 480 }}>
          {readableMonth(month)} is showing {formatCurrency(netCashFlow, currency)} in net cash flow with budget usage currently marked as {status.toLowerCase()}.
        </Text>
      </View>
      <View style={[styles.heroPanel, { backgroundColor: colors.bg }]}>
        <Text variant="bodySmall" color="secondary">
          Monthly budget status
        </Text>
        <View style={styles.heroStatusRow}>
          <Text variant="h3" style={{ color: statusColor }}>
            {status}
          </Text>
          <Text variant="h3">{budgetUsed}%</Text>
        </View>
        <ProgressBar value={budgetUsed} color={statusColor} height={11} />
        <Button label="Add Transaction" onPress={onAdd} style={{ marginTop: Spacing.lg }} />
      </View>
    </View>
  );
};

export const DashboardScreen = () => (
  <RequireData>
    {(data) => {
      const navigation = useNavigation<any>();
      const month = getMonthKey();
      const budget = data.budgets.find((item) => item.month === month);
      const summary = calculateMonthlySummary(data.transactions, month);
      const breakdown = calculateCategoryBreakdown(data.transactions, data.categories, month);
      const health = calculateBudgetHealth(data.transactions, budget, data.categories, month);
      const savings = calculateSavingsProgress(data.savingsGoals);
      const recent = sortTransactions(data.transactions, 'date-desc').slice(0, 4);

      return (
        <AppScroll>
          <ScreenHeader
            title="Dashboard"
            subtitle={`${readableMonth(month)} overview for ${data.user.name}`}
            action={<IconButton icon="add" label="Add transaction" onPress={() => navigation.navigate('AddTransaction')} />}
          />
          <DashboardHero
            name={data.user.name}
            month={month}
            netCashFlow={summary.netCashFlow}
            budgetUsed={health.usedPercent}
            currency={data.user.currency}
            onAdd={() => navigation.navigate('AddTransaction')}
          />
          <MetricGrid>
            <StatCard label="Income" value={formatCurrency(summary.income, data.user.currency)} icon="trending-up" tone="success" helper={`${summary.transactionCount} tracked entries`} />
            <StatCard label="Expenses" value={formatCurrency(summary.expenses, data.user.currency)} icon="trending-down" tone="danger" helper={`${formatCurrency(summary.averageExpense, data.user.currency)} avg expense`} />
            <StatCard label="Budget Used" value={`${health.usedPercent}%`} icon="speed" tone={health.usedPercent > 85 ? 'warning' : 'primary'} helper={health.status} />
            <StatCard label="Savings" value={`${savings.percentage}%`} icon="savings" tone="success" helper={`${formatCurrency(savings.saved, data.user.currency)} saved`} />
          </MetricGrid>
          <ChartCard title="Budget Health" summary={`${formatCurrency(Math.max(health.remaining, 0), data.user.currency)} remaining from ${formatCurrency(health.totalBudget, data.user.currency)}.`}>
            <ProgressBar value={health.usedPercent} color={health.usedPercent > 100 ? Colors.light.danger : undefined} />
          </ChartCard>
          <ChartCard title="Top Categories" summary={breakdown[0] ? `${breakdown[0].categoryName} is the leading category at ${breakdown[0].percentage}% of spending.` : 'No category spend yet.'}>
            <BarListChart data={breakdown.slice(0, 5).map((item) => ({ label: item.categoryName, value: item.amount, color: item.color, secondary: `${item.percentage}% of expenses` }))} currency={data.user.currency} />
          </ChartCard>
          <Card shadow="sm">
            <View style={styles.rowBetween}>
              <Text variant="h4">Recent Transactions</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Transactions')} accessibilityRole="button">
                <Text style={styles.linkInline}>View all</Text>
              </TouchableOpacity>
            </View>
            {recent.length === 0 ? (
              <EmptyState title="No transactions" message="Add your first transaction to unlock dashboard insights." />
            ) : (
              recent.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  categories={data.categories}
                  onPress={() => navigation.navigate('TransactionDetail', { transactionId: transaction.id })}
                />
              ))
            )}
          </Card>
        </AppScroll>
      );
    }}
  </RequireData>
);

const TransactionRow = ({
  transaction,
  categories,
  onPress,
}: {
  transaction: Transaction;
  categories: Category[];
  onPress?: () => void;
}) => {
  const category = categories.find((item) => item.id === transaction.categoryId);
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}>
      <View style={styles.transactionRow}>
        <View style={[styles.iconTileSmall, { backgroundColor: `${category?.color || '#64748B'}22` }]}>
          <MaterialCommunityIcons name={mcIconName(category?.icon, 'food')} size={18} color={category?.color || '#64748B'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="body" style={{ fontWeight: '700' }}>{transaction.merchant}</Text>
          <Text variant="caption" color="secondary">
            {transaction.categoryName} · {transaction.location.neighborhood || transaction.location.address} · {transaction.date}
          </Text>
        </View>
        <Text style={{ color: transaction.type === 'income' ? Colors.light.success : Colors.light.danger, fontWeight: '700' }}>
          {transaction.type === 'income' ? '+' : '-'}{formatCurrencyPrecise(transaction.amount)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export const TransactionsScreen = () => (
  <RequireData>
    {(data) => {
      const navigation = useNavigation<any>();
      const { deleteTransaction } = useFinance();
      const colors = useColors();
      const [query, setQuery] = useState('');
      const [type, setType] = useState<'all' | 'income' | 'expense'>('all');
      const [sortKey, setSortKey] = useState<TransactionSortKey>('date-desc');
      const [showSort, setShowSort] = useState(false);
      const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
      const visible = sortTransactions(filterTransactions(data.transactions, { query, type }), sortKey);

      return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
          <FlatList
            data={visible}
            keyExtractor={(transaction) => transaction.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <>
                <ScreenHeader title="Transactions" subtitle="Create, search, filter, sort, edit, and delete cash activity." action={<IconButton icon="add" label="Add transaction" onPress={() => navigation.navigate('AddTransaction')} />} />
                <Card shadow="sm" style={{ marginBottom: Spacing.lg }}>
                  <Field label="Search" value={query} onChangeText={setQuery} placeholder="Merchant, note, category, payment method" />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                    <View style={{ flex: 1 }}>
                      <Segmented options={['all', 'income', 'expense']} value={type} onChange={(value) => setType(value as 'all' | 'income' | 'expense')} />
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowSort((v) => !v)}
                      accessibilityRole="button"
                      accessibilityLabel="Sort options"
                      style={[styles.sortIconBtn, { backgroundColor: showSort ? colors.primarySoft : colors.bgSecondary, borderColor: showSort ? colors.primary : colors.border }]}
                    >
                      <MaterialIcons name="sort" size={20} color={showSort ? colors.primary : colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  {showSort ? (
                    <Segmented options={['date-desc', 'amount-desc', 'amount-asc', 'merchant-asc']} value={sortKey} onChange={(value) => setSortKey(value as TransactionSortKey)} />
                  ) : null}
                </Card>
              </>
            }
            ListEmptyComponent={
              <EmptyState title="No matching transactions" message="Try a different search or add a new transaction." actionLabel="Add Transaction" onAction={() => navigation.navigate('AddTransaction')} />
            }
            renderItem={({ item: transaction }) => (
              <Card key={transaction.id} shadow="sm" style={{ marginBottom: Spacing.md }}>
                <TransactionRow
                  transaction={transaction}
                  categories={data.categories}
                  onPress={() => navigation.navigate('TransactionDetail', { transactionId: transaction.id })}
                />
                <View style={styles.cardActions}>
                  <Button
                    label={transaction.updateCount >= 2 ? 'Edit Limit Reached' : 'Edit'}
                    variant="secondary"
                    disabled={transaction.updateCount >= 2}
                    onPress={() => navigation.navigate('EditTransaction', { transactionId: transaction.id })}
                    style={{ flex: 1 }}
                  />
                  <Button label="Delete" variant="danger" onPress={() => setPendingDelete(transaction)} style={{ flex: 1 }} />
                </View>
              </Card>
            )}
            ListFooterComponent={
              <View style={{ height: Spacing.xxxl }}>
          <ConfirmModal
            visible={!!pendingDelete}
            title="Delete transaction?"
            message={`This removes ${pendingDelete?.merchant || 'this transaction'} from this workspace.`}
            confirmLabel="Delete"
            onCancel={() => setPendingDelete(null)}
            onConfirm={async () => {
              if (pendingDelete) await deleteTransaction(pendingDelete.id);
              setPendingDelete(null);
            }}
          />
              </View>
            }
          />
        </SafeAreaView>
      );
    }}
  </RequireData>
);

const Segmented = ({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) => {
  const colors = useColors();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.bgTertiary }]}>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          accessibilityRole="button"
          accessibilityState={{ selected: option === value }}
          onPress={() => onChange(option)}
          style={[styles.segment, option === value && { backgroundColor: colors.bgSecondary }]}
        >
          <Text variant="caption" style={{ textTransform: 'capitalize' }}>{option.replace('-', ' ')}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const SelectField = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) => {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginBottom: Spacing.md }}>
      <Text variant="bodySmall" style={styles.label}>{label}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Select ${label}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={[styles.selectButton, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
      >
        <Text variant="bodyLarge" style={{ flex: 1 }}>{value || `Select ${label.toLowerCase()}`}</Text>
        <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={24} color={colors.textSecondary} />
      </TouchableOpacity>
      {open ? (
        <View style={[styles.dropdownPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: option === value }}
              onPress={() => {
                onChange(option);
                setOpen(false);
              }}
              style={[styles.dropdownOption, option === value && { backgroundColor: colors.bgTertiary }]}
            >
              <Text variant="body" style={{ fontWeight: option === value ? '700' : '400' }}>{option}</Text>
              {option === value ? <MaterialIcons name="check" size={18} color={colors.primary} /> : null}
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const TransactionForm = ({ mode }: { mode: 'add' | 'edit' }) => (
  <RequireData>
    {(data) => {
      const navigation = useNavigation<any>();
      const colors = useColors();
      const route = useRoute<RouteProp<Record<string, { transactionId?: string }>, string>>();
      const { addTransaction, updateTransaction, canUseFeature, isGuest } = useFinance();
      const existing = data.transactions.find((item) => item.id === route.params?.transactionId);
      const [type, setType] = useState<'income' | 'expense'>(existing?.type || 'expense');
      const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
      const [categoryId, setCategoryId] = useState(existing?.categoryId || data.categories.find((item) => item.type === 'expense')?.id || '');
      const [merchant, setMerchant] = useState(existing?.merchant || '');
      const [showCustomMerchant, setShowCustomMerchant] = useState(false);
      const [customMerchantInput, setCustomMerchantInput] = useState('');
      const [showDatePicker, setShowDatePicker] = useState(false);
      const [date, setDate] = useState(existing?.date || todayIso());
      const [notes, setNotes] = useState(existing?.notes || '');
      const [placeQuery, setPlaceQuery] = useState(existing?.location.name || existing?.location.address || '');
      const [selectedPlace, setSelectedPlace] = useState<PlaceOption | null>(
        existing
          ? {
              latitude: existing.location.latitude,
              longitude: existing.location.longitude,
              address: existing.location.address,
              formattedAddress: existing.location.formattedAddress || existing.location.address,
              name: existing.location.name || existing.merchant,
              neighborhood: existing.location.neighborhood,
              placeId: existing.location.placeId,
              placeType: existing.location.placeType,
            }
          : null
      );
      const [paymentMethod, setPaymentMethod] = useState(existing?.paymentMethod || 'Debit card');
      const [isRecurring, setRecurring] = useState(existing?.isRecurring || false);
      const [error, setError] = useState<string | null>(null);
      const [remoteLocations, setRemoteLocations] = useState<PlaceOption[]>([]);
      const [receipts, setReceipts] = useState<ReceiptAttachment[]>(existing?.receipts || []);
      const receiptsEnabled = canUseFeature('receiptUploads') && !isGuest;
      const receiptBackendReady = receiptUploadConfigured();
      const categories = data.categories.filter((category) => category.type === type);
      const selected = data.categories.find((category) => category.id === categoryId) || categories[0];
      const merchantOptions = useMemo(
        () =>
          Array.from(
            new Set(
              data.transactions
                .filter((transaction) => transaction.type === type)
                .map((transaction) => transaction.merchant)
                .concat(type === 'income' ? ['Part-time Paycheck', 'Scholarship', 'Freelance Payment'] : ['Fresh Market', 'Campus Cafe', 'Transit Pass', 'Rent', 'Pharmacy'])
            )
          ).sort((a, b) => a.localeCompare(b)),
        [data.transactions, type]
      );
      const addressSuggestions = useMemo(() => remoteLocations.slice(0, 5), [remoteLocations]);
      const editLocked = mode === 'edit' && !!existing && existing.updateCount >= 2;
      const amountError = amount && !/^\d+(\.\d{0,2})?$/.test(amount) ? 'Use numbers with up to 2 decimals' : undefined;
      const formValid = !!amount && !amountError && !!selected && !!merchant.trim() && isValidDateInput(date) && !!selectedPlace && !editLocked;

      const useDeviceLocation = async () => {
        try {
          const location = await getCurrentLocation();
          const current: PlaceOption = {
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address,
            formattedAddress: location.formattedAddress,
            name: location.name || 'Current location',
            neighborhood: location.address.split(',')[0] || 'Current location',
          };
          setSelectedPlace(current);
          setPlaceQuery(current.name);
        } catch (err: any) {
          setError(err.message || 'Location permission is required or search for a place before saving');
        }
      };

      useEffect(() => {
        if (!existing && !selectedPlace) {
          useDeviceLocation();
        }
      }, []);

      useEffect(() => {
        const query = placeQuery.trim();
        if (query.length < 3) {
          setRemoteLocations([]);
          return undefined;
        }
        let active = true;
        const timer = setTimeout(async () => {
          const suggestions = await getLocationSuggestions(query);
          if (active) {
            setRemoteLocations(
              suggestions.map((location) => ({
                ...location,
                name: location.name || location.address.split(',')[0] || location.address,
                formattedAddress: location.formattedAddress || location.address,
                neighborhood: location.address.split(',')[0] || location.address,
              }))
            );
          }
        }, 350);

        return () => {
          active = false;
          clearTimeout(timer);
        };
      }, [placeQuery]);

      const applyLocation = (location: PlaceOption) => {
        setSelectedPlace(location);
        setPlaceQuery(location.name || location.formattedAddress || location.address);
      };

      const updatePlaceSearch = (value: string) => {
        setPlaceQuery(value);
        setSelectedPlace(null);
      };

      const updateAmount = (value: string) => {
        setAmount(sanitizeMoneyInput(value));
      };

      const pickReceipts = async () => {
        if (!receiptsEnabled) {
          setError('Create or sign in to an account to upload receipt images.');
          return;
        }
        if (receipts.length >= MAX_RECEIPTS_PER_TRANSACTION) {
          setError(`Attach up to ${MAX_RECEIPTS_PER_TRANSACTION} receipt images per transaction.`);
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          quality: 0.82,
          selectionLimit: MAX_RECEIPTS_PER_TRANSACTION - receipts.length,
        });
        if (result.canceled) return;
        const nextReceipts = result.assets.map(createLocalReceiptAttachment);
        const invalid = nextReceipts.find(
          (receipt) => !SUPPORTED_RECEIPT_MIME_TYPES.includes(receipt.mimeType) || receipt.sizeBytes > MAX_RECEIPT_BYTES
        );
        if (invalid) {
          setError('Receipts must be JPG, PNG, HEIC, or HEIF images and 5 MB or smaller.');
          return;
        }
        setReceipts((current) => [...current, ...nextReceipts].slice(0, MAX_RECEIPTS_PER_TRANSACTION));
        if (!receiptBackendReady) setError('Receipt upload backend is not configured yet. Images are saved as pending placeholders.');
      };

      const removeReceipt = (receiptId: string) => {
        setReceipts((current) => current.filter((receipt) => receipt.id !== receiptId));
      };

      const submit = async () => {
        try {
          const parsedAmount = parseMoney(amount);
          if (!selectedPlace) throw new Error('Select a location before saving');
          const payload = {
            type,
            amount: parsedAmount,
            categoryId: selected?.id || categoryId,
            categoryName: selected?.name || '',
            merchant: merchant.trim(),
            date,
            notes,
            location: {
              placeId: selectedPlace.placeId,
              name: selectedPlace.name,
              formattedAddress: selectedPlace.formattedAddress || selectedPlace.address,
              latitude: selectedPlace.latitude,
              longitude: selectedPlace.longitude,
              address: selectedPlace.formattedAddress || selectedPlace.address,
              neighborhood: selectedPlace.neighborhood || selectedPlace.name,
              source: selectedPlace.placeId ? 'google_place' as const : 'current_location' as const,
              placeType: selectedPlace.placeType,
            },
            paymentMethod,
            isRecurring,
            receipts,
          };
          if (mode === 'edit' && existing) await updateTransaction(existing.id, payload);
          else await addTransaction(payload);
          // Fire-and-forget receipt upload for pending local images
          const pendingReceipts = receipts.filter((r) => r.status === 'local' && r.uri);
          if (pendingReceipts.length && receiptsEnabled && receiptBackendReady) {
            Promise.all(pendingReceipts.map(uploadReceiptToWorker)).then((uploaded) => {
              const patched = receipts.map((r) => uploaded.find((u) => u.id === r.id) || r);
              if (mode === 'edit' && existing) updateTransaction(existing.id, { receipts: patched });
            });
          }
          navigation.navigate('Transactions');
        } catch (err: any) {
          setError(err.message || 'Could not save transaction');
        }
      };

      return (
        <AppScroll>
          <ScreenHeader
            title={mode === 'edit' ? 'Edit Transaction' : 'Add Transaction'}
            subtitle="Amount, date, category, merchant, payment, and location are validated before saving."
            action={<IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />}
          />
          <Card shadow="sm">
            {editLocked ? (
              <ErrorState
                title="Edit limit reached"
                message="PerFin OS allows each expense to be edited at most 2 times to preserve financial history."
              />
            ) : null}
            <Segmented options={['expense', 'income']} value={type} onChange={(value) => {
              const nextType = value as 'income' | 'expense';
              setType(nextType);
              setCategoryId(data.categories.find((item) => item.type === nextType)?.id || '');
            }} />
            <Field label="Amount" value={amount} onChangeText={updateAmount} placeholder="0.00" keyboardType="decimal-pad" error={amountError} />
            <SelectField label={type === 'income' ? 'Income Source' : 'Merchant'} value={merchant} options={merchantOptions} onChange={setMerchant} />
            {!merchantOptions.includes(merchant) && merchant.trim() ? null : (
              showCustomMerchant ? (
                <View style={{ marginTop: -Spacing.sm, marginBottom: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <Input
                    value={customMerchantInput}
                    onChangeText={setCustomMerchantInput}
                    placeholder={type === 'income' ? 'Custom income source...' : 'Custom merchant name...'}
                    style={{ flex: 1, marginBottom: 0 }}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      if (customMerchantInput.trim()) setMerchant(customMerchantInput.trim());
                      setShowCustomMerchant(false);
                      setCustomMerchantInput('');
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      if (customMerchantInput.trim()) setMerchant(customMerchantInput.trim());
                      setShowCustomMerchant(false);
                      setCustomMerchantInput('');
                    }}
                    accessibilityRole="button"
                    style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, backgroundColor: colors.primary }}
                  >
                    <Text variant="caption" style={{ color: '#FFFFFF', fontWeight: '700' }}>Set</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { setShowCustomMerchant(false); setCustomMerchantInput(''); }}
                    accessibilityRole="button"
                  >
                    <Text variant="caption" color="secondary">Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setShowCustomMerchant(true)}
                  accessibilityRole="button"
                  style={{ marginTop: -Spacing.sm, marginBottom: Spacing.md, alignSelf: 'flex-start' }}
                >
                  <Text variant="caption" style={{ color: colors.primary }}>+ Type custom {type === 'income' ? 'income source' : 'merchant'}</Text>
                </TouchableOpacity>
              )
            )}
            <View style={{ marginBottom: Spacing.md }}>
              <Text variant="bodySmall" style={styles.label}>Date</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={date}
                  onChange={(e: any) => setDate(e.target.value)}
                  onKeyDown={(e: any) => e.preventDefault()}
                  style={{ width: '100%', padding: '13px 16px', fontSize: 16, borderRadius: 12, border: `1px solid ${colors.border}`, backgroundColor: colors.bgSecondary, color: colors.text, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', cursor: 'pointer' } as any}
                />
              ) : (
                <>
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => setShowDatePicker(true)}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: 14, borderRadius: Radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgSecondary, marginBottom: Spacing.sm }}
                  >
                    <Text variant="body" style={{ color: colors.text }}>{date}</Text>
                    <MaterialIcons name="calendar-today" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={new Date(date)}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'inline' : 'default'}
                      onChange={(_event: any, selectedDate?: Date) => {
                        setShowDatePicker(Platform.OS === 'ios');
                        if (selectedDate) {
                          const iso = selectedDate.toISOString().split('T')[0];
                          setDate(iso);
                        }
                      }}
                    />
                  )}
                </>
              )}
            </View>
            <SelectField label="Payment Method" value={paymentMethod} options={PAYMENT_METHOD_OPTIONS} onChange={setPaymentMethod} />
            <Text variant="bodySmall" style={styles.label}>Category</Text>
            <View style={styles.wrapRow}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => setCategoryId(category.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: category.id === categoryId }}
                  accessibilityLabel={`Select ${category.name} category`}
                >
                  <CategoryBadge label={category.name} icon={category.icon} color={category.color} selected={category.id === categoryId} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => navigation.navigate('Categories')}
                accessibilityRole="button"
                accessibilityLabel="Add custom category"
              >
                <View style={[styles.addCategoryChip, { borderColor: colors.border, backgroundColor: colors.bgSecondary }]}>
                  <MaterialIcons name="add" size={14} color={colors.textSecondary} />
                  <Text variant="caption" color="secondary" style={{ marginLeft: 3 }}>New</Text>
                </View>
              </TouchableOpacity>
            </View>
            <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional context" />
            <Text variant="bodySmall" style={styles.label}>Location</Text>
            {/* Landscape map strip */}
            <View style={[styles.miniMapLandscape, { backgroundColor: colors.bgTertiary }]}>
              <View style={styles.mapGridLineVertical} />
              <View style={styles.mapGridLineHorizontal} />
              {selectedPlace ? (
                <View style={[styles.formMapPin, getMapPosition(selectedPlace.latitude, selectedPlace.longitude)]}>
                  <MaterialIcons name="place" size={24} color={selected?.color || colors.primary} />
                </View>
              ) : (
                <View style={styles.locationEmptyState}>
                  <MaterialIcons name="location-searching" size={26} color={colors.textSecondary} />
                  <Text variant="caption" color="secondary" style={{ marginTop: 4 }}>Search or use current location</Text>
                </View>
              )}
              {selectedPlace && (
                <View style={[styles.mapLabelPill, { backgroundColor: colors.card }]}>
                  <Text variant="caption" numberOfLines={1} style={{ fontWeight: '700' }}>{selectedPlace.name}</Text>
                </View>
              )}
            </View>
            {/* Controls below map */}
            <Field label="Place Search" value={placeQuery} onChangeText={updatePlaceSearch} placeholder="Search restaurant, mall, store, or address" />
            {addressSuggestions.length > 0 && (
              <View style={styles.locationChips}>
                {addressSuggestions.map((location) => (
                  <TouchableOpacity
                    key={`${location.placeId || location.address}-${location.latitude}`}
                    accessibilityRole="button"
                    onPress={() => applyLocation(location)}
                    style={[styles.locationChip, { borderColor: colors.border, backgroundColor: colors.bgSecondary }]}
                  >
                    <Text variant="caption" numberOfLines={1}>{location.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {selectedPlace ? (
              <Text variant="caption" color="secondary" style={{ marginBottom: Spacing.sm }}>
                📍 {selectedPlace.formattedAddress || selectedPlace.address}
              </Text>
            ) : null}
            <View style={[styles.cardActions, { marginBottom: Spacing.md }]}>
              <Button label="Use Current Location" variant="secondary" onPress={useDeviceLocation} style={{ flex: 1 }} />
              <Button label="Clear" variant="secondary" onPress={() => setSelectedPlace(null)} style={{ flex: 0, paddingHorizontal: Spacing.lg }} />
            </View>
            <Text variant="bodySmall" style={styles.label}>Receipts</Text>
            <Card style={{ marginBottom: Spacing.md }}>
              <Text variant="bodySmall" color="secondary">
                {receiptsEnabled
                  ? receiptBackendReady
                    ? `Attach up to ${MAX_RECEIPTS_PER_TRANSACTION} receipt or payment images.`
                    : 'Receipt upload backend placeholder is not configured. Images are kept as pending placeholders.'
                  : 'Receipt uploads require a signed-in account.'}
              </Text>
              {receipts.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.receiptScroller}>
                  {receipts.map((receipt) => (
                    <View key={receipt.id} style={[styles.receiptPreview, { borderColor: colors.border }]}>
                      {receipt.uri ? <Image source={{ uri: receipt.uri }} style={styles.receiptImage} /> : <MaterialIcons name="receipt" size={30} color={colors.primary} />}
                      <Text variant="caption" numberOfLines={1}>{receipt.fileName}</Text>
                      <TouchableOpacity accessibilityRole="button" onPress={() => removeReceipt(receipt.id)} style={styles.receiptRemove}>
                        <MaterialIcons name="close" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              ) : null}
              <Button
                label={receiptsEnabled ? 'Add Receipt Images' : 'Login to Add Receipts'}
                variant="secondary"
                onPress={pickReceipts}
                disabled={!receiptsEnabled || receipts.length >= MAX_RECEIPTS_PER_TRANSACTION}
                style={{ marginTop: Spacing.md }}
              />
            </Card>
            <View style={styles.rowBetween}>
              <Text variant="body">Recurring transaction</Text>
              <Switch value={isRecurring} onValueChange={setRecurring} />
            </View>
            {error ? <Text color="danger" style={{ marginTop: Spacing.md }}>{error}</Text> : null}
            <Text variant="caption" color="secondary" style={{ marginTop: Spacing.md }}>
              Edits used: {existing?.updateCount || 0}/2
            </Text>
            <Button
              label={mode === 'edit' ? 'Save Changes' : 'Add Transaction'}
              onPress={submit}
              disabled={!formValid}
              size="lg"
              style={{ marginTop: Spacing.lg }}
            />
          </Card>
        </AppScroll>
      );
    }}
  </RequireData>
);

export const AddTransactionScreen = () => <TransactionForm mode="add" />;
export const EditTransactionScreen = () => <TransactionForm mode="edit" />;

const MapCanvas = ({
  transactions,
  categories,
  selectedId,
  onSelect,
  mode,
  zoom = 1,
  currency = 'USD',
}: {
  transactions: Transaction[];
  categories: Category[];
  selectedId?: string;
  onSelect: (transaction: Transaction) => void;
  mode: 'pins' | 'heatmap';
  zoom?: number;
  currency?: string;
}) => {
  const colors = useColors();
  const expenseTransactions = transactions.filter((transaction) => transaction.type === 'expense');
  const heatGroups = Object.values(
    expenseTransactions.reduce<
      Record<string, { label: string; amount: number; count: number; latitude: number; longitude: number }>
    >((groups, transaction) => {
      const label = transaction.location.name || transaction.location.neighborhood || transaction.location.address || 'Unknown area';
      const current = groups[label] || {
        label,
        amount: 0,
        count: 0,
        latitude: 0,
        longitude: 0,
      };
      current.amount += transaction.amount;
      current.count += 1;
      current.latitude += transaction.location.latitude;
      current.longitude += transaction.location.longitude;
      groups[label] = current;
      return groups;
    }, {})
  ).map((group) => ({
    ...group,
    latitude: group.latitude / group.count,
    longitude: group.longitude / group.count,
  }));
  const maxHeat = Math.max(...heatGroups.map((group) => group.amount), 1);
  const topHeat = [...heatGroups].sort((a, b) => b.amount - a.amount)[0];
  if (Platform.OS !== 'web') {
    return (
      <ExpenseNativeMap
        transactions={expenseTransactions}
        categories={categories}
        heatGroups={heatGroups}
        maxHeat={maxHeat}
        mode={mode}
        zoom={zoom}
        onSelect={onSelect}
      />
    );
  }

  return (
    <View style={[styles.mapCanvas, { backgroundColor: colors.bgTertiary }]}>
      <View style={[styles.mapLayer, { transform: [{ scale: zoom }] }]}>
        <View style={[styles.mapRoad, styles.mapRoadOne]} />
        <View style={[styles.mapRoad, styles.mapRoadTwo]} />
        <View style={[styles.mapRoad, styles.mapRoadThree]} />
        <View style={styles.mapWater} />
        <View style={styles.currentLocationDot}>
          <MaterialIcons name="my-location" size={18} color="#FFFFFF" />
        </View>
        {mode === 'heatmap'
          ? heatGroups.map((group) => {
              const intensity = group.amount / maxHeat;
              const size = 74 + intensity * 170;
              const position = getMapPosition(group.latitude, group.longitude);
              const heatColor =
                intensity > 0.78
                  ? '220,38,38'
                  : intensity > 0.54
                    ? '245,158,11'
                    : intensity > 0.3
                      ? '34,197,94'
                      : '59,130,246';
              return (
                <View
                  key={group.label}
                  accessibilityLabel={`${group.label} heatmap intensity ${Math.round(intensity * 100)} percent`}
                  style={[
                    styles.heatRegion,
                    position,
                    {
                      width: size,
                      height: size,
                      borderRadius: size / 2,
                      marginLeft: -size / 2,
                      marginTop: -size / 2,
                      backgroundColor: `rgba(${heatColor}, ${0.18 + intensity * 0.28})`,
                      ...(Platform.OS === 'web' ? { filter: `blur(${Math.round(size * 0.22)}px)` } as any : {}),
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.heatCore,
                      {
                        backgroundColor: `rgba(${heatColor}, ${0.5 + intensity * 0.5})`,
                      },
                    ]}
                  />
                </View>
              );
            })
          : expenseTransactions.map((transaction) => {
          const category = categories.find((item) => item.id === transaction.categoryId);
          const position = getMapPosition(transaction.location.latitude, transaction.location.longitude);
          const selected = transaction.id === selectedId;
          return (
            <TouchableOpacity
              key={transaction.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${transaction.merchant} expense pin`}
              onPress={() => onSelect(transaction)}
              style={[
                styles.mapPin,
                position,
                {
                  backgroundColor: category?.color || colors.primary,
                  transform: [{ scale: selected ? 1.16 : 1 }],
                },
              ]}
            >
              <MaterialCommunityIcons name={mcIconName(category?.icon, 'food')} size={17} color="#FFFFFF" />
              <View style={[styles.mapPinLabel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text variant="caption" numberOfLines={1}>{transaction.location.name || transaction.merchant}</Text>
                <Text variant="caption" color="secondary" numberOfLines={1}>{formatCurrencyPrecise(transaction.amount, currency)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        {mode === 'heatmap' && topHeat ? (
          <View style={[styles.heatLegend, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text variant="caption" color="secondary">Highest spend region</Text>
            <Text variant="bodySmall" style={{ fontWeight: '700' }}>{topHeat.label}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

export const MapScreen = () => (
  <RequireData>
    {(data) => {
      const navigation = useNavigation<any>();
      const colors = useColors();
      const [mode, setMode] = useState<'pins' | 'heatmap'>('heatmap');
      const [categoryId, setCategoryId] = useState('all');
      const [selected, setSelected] = useState<Transaction | null>(null);
      const [zoom, setZoom] = useState(1);
      const expenseCategories = data.categories.filter((category) => category.type === 'expense');
      const visibleTransactions = data.transactions.filter(
        (transaction) =>
          transaction.type === 'expense' && (categoryId === 'all' || transaction.categoryId === categoryId)
      );
      const activeTransaction = selected && visibleTransactions.some((item) => item.id === selected.id)
        ? selected
        : visibleTransactions[0] || null;
      const locationBreakdown = calculateLocationBreakdown(visibleTransactions, getMonthKey());
      const activeCategory = data.categories.find((item) => item.id === activeTransaction?.categoryId);

      return (
        <SafeAreaView style={[styles.mapShell, { backgroundColor: colors.bg }]}>
          {/* Header — normal flow */}
          <View style={[styles.mapHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text variant="h2">Expense Map</Text>
              <Text variant="bodySmall" color="secondary">Spending intensity by region with category filters</Text>
            </View>
            <IconButton icon="add-location-alt" label="Add located expense" onPress={() => navigation.navigate('AddTransaction')} />
          </View>
          {/* Controls — normal flow, above canvas */}
          <View style={[styles.mapControlsBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
              <Segmented options={['heatmap', 'pins']} value={mode} onChange={(value) => setMode(value as 'pins' | 'heatmap')} />
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <IconButton icon="remove" label="Zoom out" onPress={() => setZoom((value) => Math.max(0.9, Math.round((value - 0.15) * 100) / 100))} />
                <IconButton icon="add" label="Zoom in" onPress={() => setZoom((value) => Math.min(1.45, Math.round((value + 0.15) * 100) / 100))} />
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroller}>
              <TouchableOpacity onPress={() => setCategoryId('all')} accessibilityRole="button">
                <CategoryBadge label="All" icon="layers" color={colors.primary} selected={categoryId === 'all'} library="mi" />
              </TouchableOpacity>
              {expenseCategories.map((category) => (
                <TouchableOpacity key={category.id} onPress={() => setCategoryId(category.id)} accessibilityRole="button">
                  <CategoryBadge label={category.name} icon={category.icon} color={category.color} selected={category.id === categoryId} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          {/* Canvas — fixed height block */}
          <MapCanvas
            transactions={visibleTransactions}
            categories={data.categories}
            selectedId={activeTransaction?.id}
            onSelect={setSelected}
            mode={mode}
            zoom={zoom}
            currency={data.user.currency}
          />
          {/* Info panel — normal flow below canvas */}
          <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
            {activeTransaction ? (
              <>
                <View style={styles.rowBetween}>
                  <CategoryBadge
                    label={activeTransaction.categoryName}
                    icon={activeCategory?.icon}
                    color={activeCategory?.color || colors.primary}
                  />
                  <Text variant="h3" style={{ color: colors.danger }}>
                    {formatCurrencyPrecise(activeTransaction.amount, data.user.currency)}
                  </Text>
                </View>
                <Text variant="h4" style={{ marginTop: Spacing.md }}>{activeTransaction.merchant}</Text>
                <Text variant="body" color="secondary" style={{ marginTop: Spacing.xs }}>
                  {activeTransaction.location.address} · {activeTransaction.date}
                </Text>
                <Text variant="caption" color="secondary" style={{ marginTop: Spacing.xs }}>
                  {locationBreakdown[0]
                    ? `${locationBreakdown[0].label}: ${formatCurrency(locationBreakdown[0].amount, data.user.currency)} this month`
                    : 'Location intelligence appears as expenses are added.'}
                </Text>
                <View style={styles.cardActions}>
                  <Button label="View Detail" variant="secondary" onPress={() => navigation.navigate('TransactionDetail', { transactionId: activeTransaction.id })} style={{ flex: 1 }} />
                  <Button label="Edit" disabled={activeTransaction.updateCount >= 2} onPress={() => navigation.navigate('EditTransaction', { transactionId: activeTransaction.id })} style={{ flex: 1 }} />
                </View>
              </>
            ) : (
              <EmptyState title="No mapped expenses" message="Add an expense with a location to see pins here." />
            )}
          </ScrollView>
        </SafeAreaView>
      );
    }}
  </RequireData>
);

export const ExpenseDetailScreen = () => (
  <RequireData>
    {(data) => {
      const navigation = useNavigation<any>();
      const route = useRoute<RouteProp<Record<string, { transactionId?: string }>, string>>();
      const { deleteTransaction } = useFinance();
      const [confirmDelete, setConfirmDelete] = useState(false);
      const transaction = data.transactions.find((item) => item.id === route.params?.transactionId);
      const category = data.categories.find((item) => item.id === transaction?.categoryId);

      if (!transaction) {
        return (
          <AppScroll>
            <EmptyState title="Transaction not found" message="This transaction may have been deleted." actionLabel="Back to Activity" onAction={() => navigation.navigate('Transactions')} />
          </AppScroll>
        );
      }

      return (
        <AppScroll>
          <ScreenHeader
            title="Expense Detail"
            subtitle="Full breakdown with map context and history guard."
            action={<IconButton icon="map" label="Open map" onPress={() => navigation.navigate('MainTabs', { screen: 'Map' })} />}
          />
          <Card shadow="sm" style={{ marginBottom: Spacing.lg }}>
            <View style={styles.rowBetween}>
              <CategoryBadge label={transaction.categoryName} icon={category?.icon} color={category?.color || Colors.light.primary} />
              <Text variant="h2" style={{ color: transaction.type === 'income' ? Colors.light.success : Colors.light.danger }}>
                {transaction.type === 'income' ? '+' : '-'}{formatCurrencyPrecise(transaction.amount, data.user.currency)}
              </Text>
            </View>
            <Text variant="h3" style={{ marginTop: Spacing.lg }}>{transaction.merchant}</Text>
            <Text variant="body" color="secondary" style={{ marginTop: Spacing.xs }}>{transaction.notes || 'No description provided.'}</Text>
            <MetricGrid>
              <StatCard label="Date" value={transaction.date} icon="event" helper={transaction.paymentMethod} />
              <StatCard label="Location" value={transaction.location.neighborhood || 'Mapped'} icon="place" helper={transaction.location.address} />
              <StatCard label="Edits" value={`${transaction.updateCount}/2`} icon="edit" tone={transaction.updateCount >= 2 ? 'warning' : 'primary'} helper="Maximum edits allowed" />
            </MetricGrid>
          </Card>
          <ChartCard title="Map Preview" summary={`${transaction.location.latitude.toFixed(4)}, ${transaction.location.longitude.toFixed(4)}`}>
            <MapCanvas
              transactions={[transaction]}
              categories={data.categories}
              selectedId={transaction.id}
              onSelect={() => undefined}
              mode="pins"
              currency={data.user.currency}
            />
          </ChartCard>
          <View style={styles.cardActions}>
            <Button
              label={transaction.updateCount >= 2 ? 'Edit Limit Reached' : 'Edit Expense'}
              disabled={transaction.updateCount >= 2}
              variant="secondary"
              onPress={() => navigation.navigate('EditTransaction', { transactionId: transaction.id })}
              style={{ flex: 1 }}
            />
            <Button label="Delete" variant="danger" onPress={() => setConfirmDelete(true)} style={{ flex: 1 }} />
          </View>
          <ConfirmModal
            visible={confirmDelete}
            title="Delete expense?"
            message={`This removes ${transaction.merchant} from PerFin OS.`}
            confirmLabel="Delete"
            onCancel={() => setConfirmDelete(false)}
            onConfirm={async () => {
              await deleteTransaction(transaction.id);
              setConfirmDelete(false);
              navigation.navigate('Transactions');
            }}
          />
        </AppScroll>
      );
    }}
  </RequireData>
);

export const CategoriesScreen = () => (
  <RequireData>
    {(data) => {
      const { addCategory, updateCategory, deleteCategory } = useFinance();
      const navigation = useNavigation<any>();
      const [name, setName] = useState('');
      const [budget, setBudget] = useState('100');
      const [toast, setToast] = useState<string | null>(null);
      const create = async () => {
        await addCategory({ name, type: 'expense', color: '#2F8F83', icon: 'category', monthlyBudget: Number(budget) });
        setName('');
        setToast('Category added');
      };
      return (
        <AppScroll>
          <ScreenHeader title="Categories" subtitle="Default and custom categories with safe delete rules." action={<IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />} />
          <Card shadow="sm" style={{ marginBottom: Spacing.lg }}>
            <Field label="Custom Category" value={name} onChangeText={setName} placeholder="Pet care" />
            <Field label="Monthly Budget" value={budget} onChangeText={setBudget} placeholder="100" keyboardType="numeric" />
            <Button label="Create Category" onPress={create} />
          </Card>
          {data.categories.map((category) => (
            <Card key={category.id} shadow="sm" style={{ marginBottom: Spacing.md }}>
              <View style={styles.rowBetween}>
                <CategoryBadge label={category.name} icon={category.icon} color={category.color} />
                <Text variant="bodySmall" color="secondary">{category.isDefault ? 'Default' : 'Custom'}</Text>
              </View>
              <View style={{ marginTop: Spacing.md }}>
                <Text variant="bodySmall" color="secondary">Monthly budget</Text>
                <Text variant="h4">{formatCurrency(category.monthlyBudget, data.user.currency)}</Text>
              </View>
              {!category.isDefault ? (
                <View style={styles.cardActions}>
                  <Button label="+ $25 budget" variant="secondary" onPress={() => updateCategory(category.id, { monthlyBudget: category.monthlyBudget + 25 })} style={{ flex: 1 }} />
                  <Button label="Delete" variant="danger" onPress={() => deleteCategory(category.id).catch((err) => Alert.alert('Cannot delete category', err.message))} style={{ flex: 1 }} />
                </View>
              ) : null}
            </Card>
          ))}
          <Toast message={toast} />
        </AppScroll>
      );
    }}
  </RequireData>
);

export const BudgetsScreen = () => (
  <RequireData>
    {(data) => {
      const { upsertBudget } = useFinance();
      const navigation = useNavigation<any>();
      const month = getMonthKey();
      const current = data.budgets.find((item) => item.month === month);
      const [budgetValue, setBudgetValue] = useState(String(current?.totalBudget || data.user.monthlyBudget));
      const health = calculateBudgetHealth(data.transactions, current, data.categories, month);
      const breakdown = calculateCategoryBreakdown(data.transactions, data.categories, month);
      return (
        <AppScroll>
          <ScreenHeader title="Budgets" subtitle="Monthly and category budget tracking." action={<IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />} />
          <Card shadow="sm" style={{ marginBottom: Spacing.lg }}>
            <Text variant="h4">Monthly Budget</Text>
            <Field label="Total Budget" value={budgetValue} onChangeText={setBudgetValue} placeholder="2600" keyboardType="numeric" />
            <ProgressBar value={health.usedPercent} color={health.usedPercent > 100 ? Colors.light.danger : undefined} />
            <Text variant="bodySmall" color="secondary" style={{ marginTop: Spacing.sm }}>
              {formatCurrency(health.spent, data.user.currency)} spent of {formatCurrency(Number(budgetValue), data.user.currency)}
            </Text>
            <Button label="Save Budget" onPress={() => upsertBudget({ month, totalBudget: Number(budgetValue) })} style={{ marginTop: Spacing.lg }} />
          </Card>
          {breakdown.map((item) => (
            <Card key={item.categoryId} shadow="sm" style={{ marginBottom: Spacing.md }}>
              <View style={styles.rowBetween}>
                <CategoryBadge label={item.categoryName} icon={item.icon} color={item.color} />
                <Text>{item.percentage}%</Text>
              </View>
              <ProgressBar value={item.monthlyBudget ? (item.amount / item.monthlyBudget) * 100 : 0} color={item.color} />
              <Text variant="bodySmall" color="secondary" style={{ marginTop: Spacing.sm }}>
                {formatCurrency(item.amount, data.user.currency)} of {formatCurrency(item.monthlyBudget, data.user.currency)}
              </Text>
            </Card>
          ))}
        </AppScroll>
      );
    }}
  </RequireData>
);

export const SavingsGoalsScreen = () => (
  <RequireData>
    {(data) => {
      const { addSavingsGoal, updateSavingsGoal, deleteSavingsGoal } = useFinance();
      const navigation = useNavigation<any>();
      const [name, setName] = useState('');
      const [target, setTarget] = useState('');
      const [current, setCurrent] = useState('0');
      const [targetDate, setTargetDate] = useState('2026-12-31');
      const savings = calculateSavingsProgress(data.savingsGoals);
      const create = () => addSavingsGoal({ name, targetAmount: Number(target), currentAmount: Number(current), targetDate }).then(() => {
        setName('');
        setTarget('');
      }).catch((err) => Alert.alert('Savings goal error', err.message));
      return (
        <AppScroll>
          <ScreenHeader title="Savings Goals" subtitle={`${savings.percentage}% overall progress across active goals.`} action={<IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />} />
          <Card shadow="sm" style={{ marginBottom: Spacing.lg }}>
            <Field label="Goal Name" value={name} onChangeText={setName} placeholder="Emergency fund" />
            <Field label="Target Amount" value={target} onChangeText={setTarget} placeholder="5000" keyboardType="numeric" />
            <Field label="Current Amount" value={current} onChangeText={setCurrent} placeholder="1000" keyboardType="numeric" />
            <Field label="Target Date" value={targetDate} onChangeText={setTargetDate} placeholder="YYYY-MM-DD" />
            <Button label="Create Goal" onPress={create} />
          </Card>
          {data.savingsGoals.length === 0 ? <EmptyState title="No savings goals" message="Create a target to track savings progress." /> : data.savingsGoals.map((goal) => {
            const pct = (goal.currentAmount / goal.targetAmount) * 100;
            return (
              <Card key={goal.id} shadow="sm" style={{ marginBottom: Spacing.md }}>
                <View style={styles.rowBetween}>
                  <Text variant="h4">{goal.name}</Text>
                  <Text variant="bodySmall" color="secondary">{Math.round(pct)}%</Text>
                </View>
                <ProgressBar value={pct} />
                <Text variant="bodySmall" color="secondary" style={{ marginTop: Spacing.sm }}>
                  {formatCurrency(goal.currentAmount, data.user.currency)} saved of {formatCurrency(goal.targetAmount, data.user.currency)} by {goal.targetDate}
                </Text>
                <View style={styles.cardActions}>
                  <Button label="+ $100" variant="secondary" onPress={() => updateSavingsGoal(goal.id, { currentAmount: goal.currentAmount + 100 })} style={{ flex: 1 }} />
                  <Button label="Delete" variant="danger" onPress={() => deleteSavingsGoal(goal.id)} style={{ flex: 1 }} />
                </View>
              </Card>
            );
          })}
        </AppScroll>
      );
    }}
  </RequireData>
);

export const InsightsScreen = () => (
  <RequireData>
    {() => {
      const insights = useInsights();
      return (
        <AppScroll>
          <ScreenHeader title="Insights" subtitle="Automated signals generated from your spending data." />
          {insights.length === 0 ? <EmptyState title="No insights yet" message="Add more transactions to generate behavior signals." /> : insights.map((insight) => (
            <Card key={insight.id} shadow="sm" style={{ marginBottom: Spacing.md }}>
              <CategoryBadge label={insight.severity} color={insight.severity === 'high' ? Colors.light.danger : insight.severity === 'medium' ? Colors.light.warning : Colors.light.success} icon="tips-and-updates" library="mi" />
              <Text variant="h4" style={{ marginTop: Spacing.md }}>{insight.title}</Text>
              <Text variant="body" color="secondary" style={{ marginTop: Spacing.sm }}>{insight.description}</Text>
            </Card>
          ))}
        </AppScroll>
      );
    }}
  </RequireData>
);

export const AnalyticsScreen = () => (
  <RequireData>
    {(data) => {
      const months = groupTransactionsByMonth(data.transactions);
      const weeks = groupTransactionsByWeek(data.transactions);
      const monthlyTrend = Object.entries(months).map(([label, items]) => ({
        label,
        value: items.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0),
        color: '#367C9D',
      }));
      const weekly = Object.entries(weeks).map(([label, items]) => ({
        label,
        value: items.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0),
        color: '#D95F43',
      }));
      const incomeVsExpenses = ['income', 'expense'].map((type) => ({
        label: type,
        value: data.transactions.filter((item) => item.type === type).reduce((sum, item) => sum + item.amount, 0),
        color: type === 'income' ? Colors.light.success : Colors.light.danger,
      }));
      const topMerchants = Object.entries(data.transactions.reduce<Record<string, number>>((acc, item) => {
        if (item.type === 'expense') acc[item.merchant] = (acc[item.merchant] || 0) + item.amount;
        return acc;
      }, {})).map(([label, value]) => ({ label, value, color: '#725EAB' })).sort((a, b) => b.value - a.value);
      const savingsData = data.savingsGoals.map((goal) => ({ label: goal.name, value: goal.currentAmount, secondary: `${Math.round((goal.currentAmount / goal.targetAmount) * 100)}% funded`, color: Colors.light.success }));
      const recurringData = data.recurringExpenses.map((item) => ({ label: item.merchant, value: item.amount, color: '#C18726', secondary: `${item.frequency}, next ${item.nextDate}` }));

      const navigation = useNavigation<any>();
      return (
        <AppScroll>
          <ScreenHeader title="Analytics" subtitle="Responsive text-supported charts for finance review." action={<IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />} />
          <ChartCard title="Monthly Spending Trend" summary="Compares expense totals by month.">
            <BarListChart data={monthlyTrend} currency={data.user.currency} />
          </ChartCard>
          <ChartCard title="Income vs Expenses" summary="Shows total income and spending across your tracked data.">
            <BarListChart data={incomeVsExpenses} currency={data.user.currency} />
          </ChartCard>
          <ChartCard title="Weekly Spending" summary="Groups expense activity by week start date.">
            <BarListChart data={weekly} currency={data.user.currency} />
          </ChartCard>
          <ChartCard title="Savings Progress" summary="Charts saved amounts for each goal.">
            <BarListChart data={savingsData} currency={data.user.currency} />
          </ChartCard>
          <ChartCard title="Recurring Expenses" summary="Detected and manually marked recurring charges.">
            <BarListChart data={recurringData} currency={data.user.currency} />
          </ChartCard>
          <ChartCard title="Top Merchants" summary="Ranks merchants by tracked spending.">
            <BarListChart data={topMerchants.slice(0, 8)} currency={data.user.currency} />
          </ChartCard>
        </AppScroll>
      );
    }}
  </RequireData>
);

export const RecurringExpensesScreen = () => (
  <RequireData>
    {(data) => {
      const { updateRecurringExpense } = useFinance();
      const navigation = useNavigation<any>();
      return (
        <AppScroll>
          <ScreenHeader title="Recurring Expenses" subtitle="Detected subscriptions and recurring charges." action={<IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />} />
          {data.recurringExpenses.length === 0 ? <EmptyState title="No recurring expenses" message="Mark a transaction as recurring to track it here." /> : data.recurringExpenses.map((item) => (
            <Card key={item.id} shadow="sm" style={{ marginBottom: Spacing.md }}>
              <View style={styles.rowBetween}>
                <Text variant="h4">{item.merchant}</Text>
                <Switch value={item.status === 'active'} onValueChange={(value) => updateRecurringExpense(item.id, { status: value ? 'active' : 'inactive' })} />
              </View>
              <Text variant="body" color="secondary">{formatCurrencyPrecise(item.amount, data.user.currency)} · {item.category} · {item.frequency}</Text>
              <Text variant="caption" color="tertiary">Next expected: {item.nextDate}</Text>
            </Card>
          ))}
        </AppScroll>
      );
    }}
  </RequireData>
);

export const ReportsScreen = () => (
  <RequireData>
    {(data) => {
      const navigation = useNavigation<any>();
      const { generateReport, canUseFeature, isGuest } = useFinance();
      const colors = useColors();
      const [toast, setToast] = useState<string | null>(null);
      const [planner, setPlanner] = useState<AiPlannerResult | null>(null);
      const [aiLoading, setAiLoading] = useState(false);
      const aiEnabled = canUseFeature('aiReports') && !isGuest;
      const runPlanner = async () => {
        if (!aiEnabled) {
          setToast('AI Reports require a signed-in account.');
          return;
        }
        setAiLoading(true);
        const result = await generatePlannerResult(data);
        setPlanner(result);
        setToast(result.source === 'ai' ? 'AI report generated' : 'Planner fallback generated');
        setAiLoading(false);
      };
      return (
        <AppScroll>
          <ScreenHeader title="Reports" subtitle="Generate a monthly summary from current data." action={<View style={{ flexDirection: 'row', gap: Spacing.sm }}><IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} /><IconButton icon="summarize" label="Generate report" onPress={() => generateReport().then(() => setToast('Report generated'))} /></View>} />
          <Card shadow="sm" style={{ marginBottom: Spacing.lg }}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text variant="h4">AI Reports + Planner</Text>
                <Text variant="bodySmall" color="secondary" style={{ marginTop: Spacing.xs }}>
                  Uses aggregate-only totals and educational planning language. Receipt images, raw notes, and full transaction dumps are never sent.
                </Text>
              </View>
              <CategoryBadge label={aiEnabled ? 'Free plan' : 'Login required'} color={aiEnabled ? colors.success : colors.warning} icon={aiEnabled ? 'auto-awesome' : 'lock'} library="mi" />
            </View>
            <View style={[styles.cardActions, { marginTop: Spacing.md }]}>
              <Button label={aiLoading ? 'Generating...' : 'Generate Report'} onPress={runPlanner} disabled={aiLoading || !aiEnabled} style={{ flex: 1 }} />
              <Button label="Planner Chat" onPress={() => navigation.navigate('PlannerChat')} variant="secondary" style={{ flex: 1 }} />
            </View>
            {planner ? (
              <View style={{ marginTop: Spacing.md }}>
                <Text variant="h4">{planner.title}</Text>
                <Text variant="body" color="secondary" style={{ marginTop: Spacing.sm }}>{planner.summary}</Text>
                {planner.recommendations.map((item) => (
                  <Text key={item} variant="bodySmall" style={{ marginTop: Spacing.sm }}>• {item}</Text>
                ))}
                <Text variant="caption" color="secondary" style={{ marginTop: Spacing.md }}>
                  Educational planning only. PerFin OS does not provide legal, tax, investment, or banking advice.
                </Text>
              </View>
            ) : null}
          </Card>
          {data.reports.length === 0 ? <EmptyState title="No reports" message="Generate the current month report to create a saved summary." actionLabel="Generate Report" onAction={() => generateReport().then(() => setToast('Report generated'))} /> : data.reports.map((report) => (
            <Card key={report.id} shadow="sm" style={{ marginBottom: Spacing.md }}>
              <Text variant="h4">{readableMonth(report.month)}</Text>
              <Text variant="body" color="secondary" style={{ marginTop: Spacing.sm }}>
                Income {formatCurrency(report.totalIncome, data.user.currency)} · Expenses {formatCurrency(report.totalExpense, data.user.currency)}
              </Text>
              <Text variant="bodySmall" color="secondary">Top category: {report.topCategory}</Text>
              <Text variant="bodySmall" color="secondary">Budget status: {report.budgetStatus}</Text>
              <Text variant="bodySmall" color="secondary">Savings progress: {report.savingsProgress}%</Text>
            </Card>
          ))}
          <Toast message={toast} />
        </AppScroll>
      );
    }}
  </RequireData>
);

export const SettingsScreen = () => {
  const { logout, isGuest, data } = useFinance();
  const { mode, resolved, setMode } = useTheme();
  const navigation = useNavigation<any>();
  const colors = useColors();

  const themeOptions: { label: string; value: 'light' | 'dark' | 'system' }[] = [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
    { label: 'System', value: 'system' },
  ];

  return (
    <AppScroll>
      <ScreenHeader
        title="Settings"
        subtitle="Privacy, feature access, and session controls."
        action={<IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />}
      />

      {/* Workspace */}
      <Card shadow="sm" style={{ marginBottom: Spacing.lg }}>
        <Text variant="h4">Workspace Mode</Text>
        <Text variant="body" color="secondary" style={{ marginTop: Spacing.sm }}>
          {isGuest
            ? 'Guest data stays on this device. Sign in to unlock cloud sync, receipt uploads, account recovery, and AI planning.'
            : 'Your PerFin OS workspace syncs through Firebase. Receipt and AI features use configured production gateways when keys are provided.'}
        </Text>
        <View style={{ marginTop: Spacing.md }}>
          <CategoryBadge label={`Plan: ${data?.entitlement.plan || 'guest'}`} color={isGuest ? Colors.light.warning : Colors.light.success} icon={isGuest ? 'person-outline' : 'verified'} library="mi" />
        </View>
        <Button label="Logout" variant="danger" onPress={logout} style={{ marginTop: Spacing.md }} />
      </Card>

      {/* Appearance */}
      <Card shadow="sm" style={{ marginBottom: Spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
          <MaterialIcons name="brightness-6" size={20} color={colors.primary} style={{ marginRight: Spacing.sm }} />
          <Text variant="h4">Appearance</Text>
        </View>
        <Text variant="bodySmall" color="secondary" style={{ marginBottom: Spacing.md }}>
          Currently: {resolved === 'dark' ? '🌙 Dark' : '☀️ Light'} {mode === 'system' ? '(following system)' : '(manual override)'}
        </Text>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          {themeOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setMode(opt.value)}
              accessibilityRole="button"
              accessibilityLabel={`Set theme to ${opt.label}`}
              style={{
                flex: 1,
                paddingVertical: Spacing.sm,
                paddingHorizontal: Spacing.md,
                borderRadius: Radius.md,
                borderWidth: 1.5,
                alignItems: 'center',
                borderColor: mode === opt.value ? colors.primary : colors.border,
                backgroundColor: mode === opt.value ? colors.primarySoft : colors.bgSecondary,
              }}
            >
              <Text variant="bodySmall" style={{ color: mode === opt.value ? colors.primary : colors.textSecondary, fontWeight: '700' }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Privacy */}
      <Card shadow="sm" style={{ marginBottom: Spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
          <MaterialIcons name="lock-outline" size={20} color={colors.primary} style={{ marginRight: Spacing.sm }} />
          <Text variant="h4">Privacy & Data</Text>
        </View>
        <Text variant="bodySmall" color="secondary" style={{ marginBottom: Spacing.sm }}>
          <Text variant="bodySmall" style={{ fontWeight: '700' }}>What we store: </Text>
          Transaction records, budget targets, savings goals, categories, and reports — all in Firebase Firestore under your authenticated user ID. Guest data is stored locally on this device only.
        </Text>
        <Text variant="bodySmall" color="secondary" style={{ marginBottom: Spacing.sm }}>
          <Text variant="bodySmall" style={{ fontWeight: '700' }}>AI features: </Text>
          Only aggregate totals (e.g. monthly spend by category) are sent to Gemini AI. No raw notes, merchant names, location history, or receipt images leave your device.
        </Text>
        <Text variant="bodySmall" color="secondary" style={{ marginBottom: Spacing.sm }}>
          <Text variant="bodySmall" style={{ fontWeight: '700' }}>Receipts: </Text>
          Uploaded to Cloudflare R2 object storage when a Worker backend is configured. Files are private, accessible only via your authenticated token. Guest users cannot upload receipts.
        </Text>
        <Text variant="bodySmall" color="secondary" style={{ marginBottom: Spacing.md }}>
          <Text variant="bodySmall" style={{ fontWeight: '700' }}>No selling of data: </Text>
          PerFin OS does not sell, share, or monetise your financial data. It is never used for advertising.
        </Text>
        <TouchableOpacity
          accessibilityRole="link"
          onPress={() => navigation.navigate('HelpAbout')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}
        >
          <MaterialIcons name="open-in-new" size={14} color={colors.primary} />
          <Text variant="caption" style={{ color: colors.primary }}>Help / About — full app scope and disclosures</Text>
        </TouchableOpacity>
      </Card>
    </AppScroll>
  );
};

export const ProfileScreen = () => (
  <RequireData>
    {(data) => {
      const { updateUser } = useFinance();
      const navigation = useNavigation<any>();
      const [name, setName] = useState(data.user.name);
      const [email, setEmail] = useState(data.user.email);
      const [phone, setPhone] = useState(data.user.phone);
      const [income, setIncome] = useState(String(data.user.monthlyIncome));
      const [budget, setBudget] = useState(String(data.user.monthlyBudget));
      const [toast, setToast] = useState<string | null>(null);
      return (
        <AppScroll>
          <ScreenHeader title="Profile" subtitle="Profile settings for your PerFin OS workspace." action={<IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />} />
          <Card shadow="sm">
            <Field label="Name" value={name} onChangeText={setName} placeholder="Full name" />
            <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" />
            <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="+1 416 555 0198" keyboardType="phone-pad" />
            <Field label="Monthly Income" value={income} onChangeText={setIncome} placeholder="4200" keyboardType="numeric" />
            <Field label="Monthly Budget" value={budget} onChangeText={setBudget} placeholder="2600" keyboardType="numeric" />
            <Button label="Save Profile" onPress={() => updateUser({ name, email, phone, monthlyIncome: Number(income), monthlyBudget: Number(budget) }).then(() => setToast('Profile saved'))} />
          </Card>
          <Toast message={toast} />
        </AppScroll>
      );
    }}
  </RequireData>
);

export const HelpAboutScreen = () => {
  const navigation = useNavigation<any>();
  return (
    <AppScroll>
      <ScreenHeader title="Help / About" subtitle="PerFin OS positioning and user safety." action={<IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />} />
      <Card shadow="sm" style={{ marginBottom: Spacing.md }}>
        <Text variant="h4">What PerFin OS is</Text>
        <Text variant="body" color="secondary" style={{ marginTop: Spacing.sm }}>
          A personal finance operating system for expense tracking, budgeting, receipt organization, maps, reports, and educational planning insights.
        </Text>
      </Card>
      <Card shadow="sm">
        <Text variant="h4">What PerFin OS is not</Text>
        <Text variant="body" color="secondary" style={{ marginTop: Spacing.sm }}>
          It is not a bank, investment advisor, tax advisor, legal advisor, or payment processor.
        </Text>
      </Card>
    </AppScroll>
  );
};

export const MoreScreen = () => {
  const navigation = useNavigation<any>();
  const colors = useColors();
  const items: { label: string; route: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }[] = [
    { label: 'Map', route: 'Map', icon: 'map' },
    { label: 'Budgets', route: 'Budgets', icon: 'speed' },
    { label: 'Categories', route: 'Categories', icon: 'category' },
    { label: 'Savings Goals', route: 'SavingsGoals', icon: 'savings' },
    { label: 'Analytics', route: 'Analytics', icon: 'bar-chart' },
    { label: 'Recurring Expenses', route: 'RecurringExpenses', icon: 'subscriptions' },
    { label: 'Reports', route: 'Reports', icon: 'summarize' },
    { label: 'Profile', route: 'Profile', icon: 'person' },
    { label: 'Settings', route: 'Settings', icon: 'settings' },
    { label: 'Help / About', route: 'HelpAbout', icon: 'help-outline' },
  ];
  return (
    <AppScroll>
      <ScreenHeader title="More" subtitle="Additional PerFin OS workflows and settings." />
      <View style={styles.moreGrid}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.route}
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.label}`}
            onPress={() => navigation.navigate(item.route)}
            style={[styles.moreTile, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.moreIcon, { backgroundColor: colors.primarySoft }]}>
              <MaterialIcons name={item.icon} size={23} color={colors.primary} />
            </View>
            <Text variant="body" style={{ marginTop: Spacing.sm, fontWeight: '700', textAlign: 'center' }}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </AppScroll>
  );
};

export const PlannerChatScreen = () => (
  <RequireData>
    {(data) => {
      const navigation = useNavigation<any>();
      const colors = useColors();
      const { canUseFeature, isGuest } = useFinance();
      const aiEnabled = canUseFeature('plannerChat') && !isGuest;
      const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
      const [input, setInput] = useState('');
      const [loading, setLoading] = useState(false);

      useEffect(() => {
        if (!aiEnabled) return;
        setLoading(true);
        generatePlannerResult(data).then((result) => {
          setMessages([
            {
              role: 'ai',
              text: [result.summary, ...result.recommendations].filter(Boolean).join('\n\n'),
            },
          ]);
          setLoading(false);
        });
      }, []);

      const sendMessage = async () => {
        const userMsg = input.trim();
        if (!userMsg || loading) return;
        setInput('');
        setMessages((current) => [...current, { role: 'user', text: userMsg }]);
        setLoading(true);
        const result = await generatePlannerResult(data);
        setMessages((current) => [
          ...current,
          {
            role: 'ai',
            text: [result.summary, ...result.recommendations].filter(Boolean).join('\n\n'),
          },
        ]);
        setLoading(false);
      };

      if (!aiEnabled) {
        return (
          <AppScroll>
            <ScreenHeader
              title="Planner Chat"
              subtitle="Educational finance planning using aggregate totals only."
              action={<IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />}
            />
            <EmptyState
              title="Login required"
              message="Planner Chat is available to signed-in accounts. It uses aggregate-only data — no raw notes or receipt images are ever sent."
              icon="lock"
              actionLabel="Back"
              onAction={() => navigation.goBack()}
            />
          </AppScroll>
        );
      }

      return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.xl }}
            showsVerticalScrollIndicator={false}
          >
            <ScreenHeader
              title="Planner Chat"
              subtitle="Educational finance planning using aggregate totals only."
              action={<IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />}
            />
            {loading && messages.length === 0 ? (
              <LoadingState label="Generating planner summary..." />
            ) : null}
            {messages.map((msg, index) => (
              <Card
                key={index}
                shadow="sm"
                style={{
                  marginBottom: Spacing.md,
                  backgroundColor: msg.role === 'user' ? colors.primarySoft : colors.bgSecondary,
                }}
              >
                <Text variant="caption" color="secondary" style={{ marginBottom: Spacing.xs }}>
                  {msg.role === 'user' ? 'You' : 'PerFin OS Planner'}
                </Text>
                <Text variant="body">{msg.text}</Text>
              </Card>
            ))}
            {loading && messages.length > 0 ? (
              <LoadingState label="Generating response..." />
            ) : null}
            {messages.length > 0 ? (
              <Text variant="caption" color="tertiary" style={{ textAlign: 'center', marginTop: Spacing.sm }}>
                Educational planning only. PerFin OS does not provide legal, tax, investment, or banking advice.
              </Text>
            ) : null}
          </ScrollView>
          <View style={[styles.chatInputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Input
              value={input}
              onChangeText={setInput}
              placeholder="Ask about your spending, budget, or savings..."
              style={{ flex: 1, marginBottom: 0 }}
            />
            <IconButton icon="send" label="Send message" onPress={sendMessage} style={{ marginLeft: Spacing.sm }} />
          </View>
        </SafeAreaView>
      );
    }}
  </RequireData>
);

export const NotFoundScreen = () => {
  const navigation = useNavigation<any>();
  return (
    <AppScroll>
      <EmptyState title="Screen not found" message="This route does not exist in PerFin OS." icon="explore-off" actionLabel="Go to Dashboard" onAction={() => navigation.navigate('Dashboard')} />
    </AppScroll>
  );
};

export const ExpenseListScreen = TransactionsScreen;
export const AddExpenseScreen = AddTransactionScreen;
export const EditExpenseScreen = EditTransactionScreen;
export const HomeScreen = DashboardScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: Spacing.xl,
    paddingBottom: 180,
    flexGrow: 1,
  },
  listContent: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: 140,
  },
  pageFrame: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
  },
  hero: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  logoMark: {
    width: 74,
    height: 74,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  centerCopy: {
    textAlign: 'center',
    marginTop: Spacing.md,
    maxWidth: 360,
  },
  dashboardHero: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xl,
    justifyContent: 'space-between',
  },
  heroCopy: {
    flex: 1,
    minWidth: 260,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.round,
    marginBottom: Spacing.md,
  },
  heroTitle: {
    marginBottom: Spacing.md,
  },
  heroPanel: {
    flex: 1,
    minWidth: 250,
    maxWidth: 380,
    borderRadius: Radius.lg,
    backgroundColor: Colors.light.bg,
    padding: Spacing.lg,
  },
  heroStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginVertical: Spacing.md,
  },
  label: {
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  linkText: {
    color: Colors.light.primary,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  linkInline: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 64,
  },
  iconTileSmall: {
    width: 36,
    height: 36,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  selectButton: {
    minHeight: 58,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dropdownPanel: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  dropdownOption: {
    minHeight: 46,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  miniMapLandscape: {
    width: '100%',
    height: 110,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  mapLabelPill: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    right: Spacing.sm,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    alignItems: 'center',
  },
  mapGridLineVertical: {
    position: 'absolute',
    width: 2,
    height: '100%',
    left: '48%',
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  mapGridLineHorizontal: {
    position: 'absolute',
    height: 2,
    width: '100%',
    top: '48%',
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  formMapPin: {
    position: 'absolute',
    marginLeft: -10,
    marginTop: -10,
  },
  locationEmptyState: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  locationChip: {
    minHeight: 30,
    maxWidth: 150,
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  receiptScroller: {
    gap: Spacing.md,
    paddingTop: Spacing.md,
  },
  receiptPreview: {
    width: 92,
    minHeight: 112,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  receiptImage: {
    width: 78,
    height: 78,
    borderRadius: Radius.md,
    marginBottom: Spacing.xs,
  },
  receiptRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: Radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.danger,
  },
  segmented: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: Radius.lg,
    padding: Spacing.xs,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  segment: {
    minHeight: 38,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  moreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  moreTile: {
    width: '47%',
    minHeight: 112,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  moreIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapShell: {
    flex: 1,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  mapControlsBar: {
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  mapCanvas: {
    height: 320,
    overflow: 'hidden',
  },
  mapLayer: {
    flex: 1,
  },
  mapRoad: {
    position: 'absolute',
    height: 22,
    width: '135%',
    left: '-18%',
    backgroundColor: 'rgba(180,180,180,0.55)',
    borderRadius: Radius.round,
  },
  mapRoadOne: {
    top: '32%',
    transform: [{ rotate: '-20deg' }],
  },
  mapRoadTwo: {
    top: '54%',
    transform: [{ rotate: '15deg' }],
  },
  mapRoadThree: {
    top: '70%',
    transform: [{ rotate: '-5deg' }],
  },
  mapWater: {
    position: 'absolute',
    left: '-15%',
    right: '-15%',
    bottom: '-10%',
    height: '24%',
    backgroundColor: '#CFCFCF',
    transform: [{ rotate: '-3deg' }],
  },
  currentLocationDot: {
    position: 'absolute',
    left: '50%',
    top: '48%',
    width: 38,
    height: 38,
    marginLeft: -19,
    marginTop: -19,
    borderRadius: Radius.round,
    backgroundColor: Colors.light.primary,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPin: {
    position: 'absolute',
    width: 34,
    height: 34,
    marginLeft: -17,
    marginTop: -17,
    borderRadius: Radius.round,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPinLabel: {
    position: 'absolute',
    top: 34,
    minWidth: 128,
    maxWidth: 168,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  heatPoint: {
    position: 'absolute',
    marginLeft: -24,
    marginTop: -24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
  },
  heatRegion: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heatCore: {
    width: '34%',
    height: '34%',
    borderRadius: Radius.round,
  },
  heatTouchTarget: {
    width: 44,
    height: 44,
    borderRadius: Radius.round,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  heatLegend: {
    position: 'absolute',
    left: Spacing.lg,
    bottom: Spacing.lg,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  mapControls: {
    padding: Spacing.md,
  },
  zoomControls: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  categoryScroller: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  mapBottomSheet: {
    padding: Spacing.lg,
  },
  sortIconBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  addCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderTopWidth: 1,
  },
});
