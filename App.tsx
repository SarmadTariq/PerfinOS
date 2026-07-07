import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { FinanceProvider } from './src/context/FinanceContext';
import { SessionProvider } from './src/context/SessionContext';
import { FinanceWorkspaceProvider } from './src/context/FinanceWorkspaceContext';
import { ThemeProvider } from './src/context/ThemeContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SessionProvider>
          <FinanceWorkspaceProvider>
            <FinanceProvider>
              <AppNavigator />
            </FinanceProvider>
          </FinanceWorkspaceProvider>
        </SessionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
