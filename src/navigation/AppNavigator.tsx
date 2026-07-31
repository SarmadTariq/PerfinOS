import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useColors, useThemeScheme } from '../context/ThemeContext';
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
// Utility screens
import { BudgetsScreen } from '../views/more/BudgetsView';
import { CategoriesScreen } from '../views/more/CategoriesView';
import { SavingsGoalsScreen } from '../views/more/SavingsGoalsView';
import { AnalyticsScreen } from '../views/more/AnalyticsView';
import { RecurringExpensesScreen } from '../views/more/RecurringExpensesView';
import { ReportsScreen } from '../views/more/ReportsView';
import { PlanScreen } from '../views/planning/PlanView';
import { SettingsScreen } from '../views/more/SettingsView';
import { ProfileScreen } from '../views/more/ProfileView';
import { HelpAboutScreen } from '../views/more/HelpAboutView';
// Errors
import { NotFoundScreen } from '../views/errors/NotFoundView';
import {
  ControlSize,
  Motion,
  Radius,
  Spacing,
  Typography,
} from '../theme/index';
import { BrandMark } from '../components/brand';

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

const PlanTabScreen = () => (
  <PlanScreen showBackButton={false} showProfileButton />
);

const Tabs = () => {
  const colors = useColors();

  return (
    <Tab.Navigator
      initialRouteName="Map"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.actionPrimary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.backgroundElevated,
          borderTopColor: colors.borderDefault,
          minHeight:
            ControlSize.button +
            Spacing.xxl +
            Spacing.xs,
          paddingBottom: Spacing.md,
          paddingTop: Spacing.sm + Spacing.xs / 2,
        },
        tabBarItemStyle: {
          borderRadius: Radius.sm,
          marginHorizontal: Spacing.xs / 2,
        },
        tabBarLabelStyle: {
          ...Typography.caption,
          fontWeight: Typography.h4.fontWeight,
        },
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ focused, color, size }) => {
          const map: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
            Dashboard: focused ? 'grid' : 'grid-outline',
            Transactions: focused ? 'receipt' : 'receipt-outline',
            Map: focused ? 'map' : 'map-outline',
            Insights: focused ? 'bulb' : 'bulb-outline',
            Plan: focused ? 'flag' : 'flag-outline',
          };
          return <Ionicons name={map[route.name] || 'ellipse-outline'} size={focused ? size + 1 : size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Map" component={MapScreen} options={{ tabBarLabel: 'Map' }} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} options={{ tabBarLabel: 'Activity' }} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'Dashboard' }} />
      <Tab.Screen name="Insights" component={InsightsScreen} options={{ tabBarLabel: 'Insights' }} />
      <Tab.Screen name="Plan" component={PlanTabScreen} options={{ tabBarLabel: 'Plan' }} />
    </Tab.Navigator>
  )
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
    <Stack.Screen name="NotFound" component={NotFoundScreen} />
  </Stack.Navigator>
);

const SplashGate = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const colors = useColors();

  const opacity = React.useRef(
    new Animated.Value(0),
  ).current;

  const scale = React.useRef(
    new Animated.Value(Motion.scale.enter),
  ).current;

  const [complete, setComplete] =
    React.useState(false);

  React.useEffect(() => {
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: Motion.duration.deliberate,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: Motion.scale.identity,
          duration: Motion.duration.deliberate,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(Motion.duration.standard),
      Animated.timing(opacity, {
        toValue: 0,
        duration: Motion.duration.standard,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    animation.start(({ finished }) => {
      if (finished) {
        setComplete(true);
      }
    });

    return () => {
      animation.stop();
    };
  }, [opacity, scale]);

  if (complete) {
    return <>{children}</>;
  }

  return (
    <View
      style={[
        styles.splash,
        {
          backgroundColor:
            colors.backgroundCanvas,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.splashContent,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
      >
        <BrandMark
          size={Spacing.section}
          appearance="auto"
          alignment="stacked"
        />
      </Animated.View>
    </View>
  );
};

const AppNavigator = () => {
  const scheme = useThemeScheme();
  const colors = useColors();
  const { data, isAuthenticated } = useFinance();

  const navigationTheme = React.useMemo(() => {
    const baseTheme =
      scheme === 'dark'
        ? DarkTheme
        : DefaultTheme;

    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: colors.actionPrimary,
        background: colors.backgroundCanvas,
        card: colors.backgroundElevated,
        text: colors.textPrimary,
        border: colors.borderDefault,
        notification: colors.statusCritical,
      },
    };
  }, [colors, scheme]);

  return (
    <NavigationContainer theme={navigationTheme}>
      <SplashGate>
        {!isAuthenticated
          ? <AuthStack />
          : data?.onboarded
            ? <MainStack />
            : data
              ? <OnboardingScreen />
              : <AuthStack />}
      </SplashGate>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  splashContent: {
    alignItems: 'center',
  },
});

export default AppNavigator;
