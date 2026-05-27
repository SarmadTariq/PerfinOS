import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { FinanceProvider } from './src/context/FinanceContext';
import { ThemeProvider } from './src/context/ThemeContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <FinanceProvider>
          <AppNavigator />
        </FinanceProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
