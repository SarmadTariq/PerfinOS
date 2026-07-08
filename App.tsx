import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { FinanceProvider } from './src/context/FinanceContext';
import { SessionProvider } from './src/context/SessionContext';
import { FinanceWorkspaceProvider } from './src/context/FinanceWorkspaceContext';
import { ActivityFilterProvider } from './src/context/ActivityFilterContext';
import { ThemeProvider } from './src/context/ThemeContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SessionProvider>
          <FinanceWorkspaceProvider>
            <ActivityFilterProvider>
              <FinanceProvider>
                <AppNavigator />
              </FinanceProvider>
            </ActivityFilterProvider>
          </FinanceWorkspaceProvider>
        </SessionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
