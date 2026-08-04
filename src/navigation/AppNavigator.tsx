import React from 'react';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme } from '@react-navigation/native';
import {
  BottomTabBar,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  useWindowDimensions,
  } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors,
  useThemeScheme } from '../context/ThemeContext';
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
import { AddTransactionScreen,
  EditTransactionScreen } from '../views/transactions/TransactionFormView';
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
  Shadows,
  } from '../theme/index';
import { BrandMark } from '../components/brand';
import {
  FLOATING_TAB_BAR_BOTTOM_GAP,
  FLOATING_TAB_BAR_HEIGHT,
  FLOATING_TAB_BAR_HORIZONTAL_INSET,
  FLOATING_TAB_BAR_MAX_WIDTH,
} from '../components/layout/FloatingTabChrome';

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
  <PlanScreen showBackButton={false} />
);

type CenteredFloatingTabBarProps =
  React.ComponentProps<typeof BottomTabBar>;

const CenteredFloatingTabBar = (
  props: CenteredFloatingTabBarProps,
) => {
  const { width: windowWidth } =
    useWindowDimensions();
  const insets = useSafeAreaInsets();

  const safeHorizontalInset = Math.max(
    insets.left,
    insets.right,
    FLOATING_TAB_BAR_HORIZONTAL_INSET,
  );

  const floatingWidth = Math.max(
    0,
    Math.min(
      windowWidth - safeHorizontalInset * 2,
      FLOATING_TAB_BAR_MAX_WIDTH,
    ),
  );

  const floatingBottom = Math.max(
    insets.bottom,
    FLOATING_TAB_BAR_BOTTOM_GAP,
  );

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.floatingTabAnchor,
        { bottom: floatingBottom },
      ]}
    >
      <View style={{ width: floatingWidth }}>
        <BottomTabBar {...props} />
      </View>
    </View>
  );
};

const Tabs = () => {
  const colors = useColors();

  return (
    <Tab.Navigator
      // FLOATING_TAB_GEOMETRY_F5
      tabBar={(props) => (
        <CenteredFloatingTabBar {...props} />
      )}
      initialRouteName="Map"
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:
          colors.actionPrimary,
        tabBarInactiveTintColor:
          colors.textMuted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          width: '100%',
          height: FLOATING_TAB_BAR_HEIGHT,
          backgroundColor:
            colors.backgroundElevated,
          borderTopWidth: 0,
          borderWidth:
            StyleSheet.hairlineWidth,
          borderColor: colors.borderSubtle,
          borderRadius:
            Radius.xl + Spacing.sm,
          paddingHorizontal: Spacing.xs,
          paddingTop: Spacing.xs,
          paddingBottom: Spacing.xs,
          overflow: 'visible',
          ...Shadows.sm,
        },
        tabBarItemStyle: {
          flex: 1,
          minWidth: 0,
          borderRadius: Radius.md,
          marginHorizontal: 0,
          paddingHorizontal: 0,
          overflow: 'visible',
        },
        tabBarLabelStyle: {
          ...Typography.caption,
          fontWeight:
            Typography.label.fontWeight,
          marginTop: 0,
          marginBottom: Spacing.xs,
        },
        tabBarIconStyle: {
          marginTop: Spacing.xs,
          marginBottom: 0,
          overflow: 'visible',
        },
        tabBarIcon: ({
          focused,
          color,
          size,
        }) => {
          const map: Record<
            string,
            React.ComponentProps<
              typeof Ionicons
            >['name']
          > = {
            Dashboard: focused
              ? 'grid'
              : 'grid-outline',
            Transactions: focused
              ? 'receipt'
              : 'receipt-outline',
            Map: focused
              ? 'map'
              : 'map-outline',
            Insights: focused
              ? 'bulb'
              : 'bulb-outline',
            Plan: focused
              ? 'flag'
              : 'flag-outline',
          };

          return (
            <View
              style={[
                styles.tabIconState,
                focused && {
                  backgroundColor:
                    colors.actionPrimarySoft,
                },
              ]}
            >
              <Ionicons
                name={
                  map[route.name] ||
                  'ellipse-outline'
                }
                size={size}
                color={color}
              />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Map" component={MapScreen} options={{ tabBarLabel: 'Map' }} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} options={{ tabBarLabel: 'Activity' }} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'Dashboard' }} />
      <Tab.Screen name="Insights" component={InsightsScreen} options={{ tabBarLabel: 'Insights' }} />
      <Tab.Screen name="Plan" component={PlanTabScreen} options={{ tabBarLabel: 'Plan' }} />
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
  floatingTabAnchor: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },

  tabIconState: {
    width:
      ControlSize.minimumTouchTarget -
      Spacing.xs,
    height:
      Spacing.xxxl + Spacing.xs,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

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
