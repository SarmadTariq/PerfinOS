import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Animated, Easing, View } from 'react-native';
import { useThemeScheme } from '../context/ThemeContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFinance } from '../context/FinanceContext';
// Auth
import { WelcomeScreen } from '../views/auth/WelcomeView';
import { LoginScreen } from '../views/auth/LoginView';
import { SignupScreen } from '../views/auth/SignupView';
import { ForgotPasswordScreen } from '../views/auth/ForgotPasswordView';
// Onboarding
import { OnboardingScreen } from '../views/onboarding/OnboardingView';
// Dashboard
import { DashboardScreen } from '../views/dashboard/DashboardView';
// Transactions
import { TransactionsScreen } from '../views/transactions/TransactionsView';
import { AddTransactionScreen, EditTransactionScreen } from '../views/transactions/TransactionFormView';
import { ExpenseDetailScreen } from '../views/transactions/TransactionDetailView';
// Map
import { MapScreen } from '../views/map/MapView';
// Insights
import { InsightsScreen } from '../views/insights/InsightsView';
// More
import { MoreScreen } from '../views/more/MoreView';
import { BudgetsScreen } from '../views/more/BudgetsView';
import { CategoriesScreen } from '../views/more/CategoriesView';
import { SavingsGoalsScreen } from '../views/more/SavingsGoalsView';
import { AnalyticsScreen } from '../views/more/AnalyticsView';
import { RecurringExpensesScreen } from '../views/more/RecurringExpensesView';
import { ReportsScreen } from '../views/more/ReportsView';
import { PlannerChatScreen } from '../views/more/PlannerChatView';
import { SettingsScreen } from '../views/more/SettingsView';
import { ProfileScreen } from '../views/more/ProfileView';
import { HelpAboutScreen } from '../views/more/HelpAboutView';
// Errors
import { NotFoundScreen } from '../views/errors/NotFoundView';
import { Colors } from '../theme';
import { Text } from '../components';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <Stack.Screen name="NotFound" component={NotFoundScreen} />
  </Stack.Navigator>
);

const Tabs = () => {
  const scheme = useThemeScheme();
  const colors = Colors[scheme];

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          minHeight: 76,
          paddingBottom: 12,
          paddingTop: 10,
          shadowColor: 'transparent',
          elevation: 0,
        },
        tabBarBackground: () => (
          <View style={{ flex: 1, backgroundColor: colors.card }} />
        ),
        tabBarItemStyle: {
          borderRadius: 8,
          marginHorizontal: 2,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0,
        },
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ focused, color, size }) => {
          const map: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
            Dashboard: focused ? 'grid' : 'grid-outline',
            Transactions: focused ? 'receipt' : 'receipt-outline',
            Map: focused ? 'map' : 'map-outline',
            Insights: focused ? 'bulb' : 'bulb-outline',
            More: focused ? 'ellipsis-horizontal-circle' : 'ellipsis-horizontal-circle-outline',
          };

          return (
            <Ionicons
              name={map[route.name] || 'ellipse-outline'}
              size={focused ? size + 1 : size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} options={{ tabBarLabel: 'Activity' }} />
      <Tab.Screen name="Map" component={MapScreen} options={{ tabBarLabel: 'Map' }} />
      <Tab.Screen name="Insights" component={InsightsScreen} options={{ tabBarLabel: 'Insights' }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ tabBarLabel: 'More' }} />
    </Tab.Navigator>
  );
};

const MainStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MainTabs" component={Tabs} />
    <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
    <Stack.Screen name="TransactionDetail" component={ExpenseDetailScreen} />
    <Stack.Screen name="EditTransaction" component={EditTransactionScreen} />
    <Stack.Screen name="Budgets" component={BudgetsScreen} />
    <Stack.Screen name="Categories" component={CategoriesScreen} />
    <Stack.Screen name="SavingsGoals" component={SavingsGoalsScreen} />
    <Stack.Screen name="Analytics" component={AnalyticsScreen} />
    <Stack.Screen name="RecurringExpenses" component={RecurringExpensesScreen} />
    <Stack.Screen name="Reports" component={ReportsScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="HelpAbout" component={HelpAboutScreen} />
    <Stack.Screen name="PlannerChat" component={PlannerChatScreen} />
    <Stack.Screen name="NotFound" component={NotFoundScreen} />
  </Stack.Navigator>
);

const SplashGate = ({ children }: { children: React.ReactNode }) => {
  const scheme = useThemeScheme();
  const colors = Colors[scheme];

  const opacity = React.useRef(new Animated.Value(0)).current;
  const scale = React.useRef(new Animated.Value(0.92)).current;
  const [complete, setComplete] = React.useState(false);

  React.useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(360),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 260,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => setComplete(true));
  }, [opacity, scale]);

  if (complete) return <>{children}</>;

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bg,
      }}
    >
      <Animated.View style={{ alignItems: 'center', opacity, transform: [{ scale }] }}>
        <View
          style={{
            width: 74,
            height: 74,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
            marginBottom: 18,
          }}
        >
          <Ionicons name="stats-chart" size={34} color="#FFFFFF" />
        </View>
        <Text variant="h2">PerFin OS</Text>
      </Animated.View>
    </View>
  );
};

const AppNavigator = () => {
  const scheme = useThemeScheme();
  const { data, isAuthenticated } = useFinance();

  return (
    <NavigationContainer theme={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SplashGate>
        {!isAuthenticated ? <AuthStack /> : data?.onboarded ? <MainStack /> : data ? <OnboardingScreen /> : <AuthStack />}
      </SplashGate>
    </NavigationContainer>
  );
};

export default AppNavigator;
