# PerFin OS Functionality Stitching Map

| Product requirement | Existing file/component | Current status | Missing logic | Required upgrade | Priority |
|---|---|---|---|---|---|
| Dashboard summary | `DashboardScreen`, `financeAnalytics.ts` | Complete | None | Maintain chart summaries | P0 |
| Transactions CRUD | `TransactionsScreen`, `TransactionForm`, `FinanceContext` | Complete | Production backend | Add real API later | P0 |
| Add transaction | `AddTransactionScreen` | Complete | Native date picker | Future enhancement | P0 |
| Edit transaction | `EditTransactionScreen` | Complete | None | Maintain validation | P0 |
| Delete transaction | `TransactionsScreen`, `ConfirmModal` | Complete | None | Add undo later | P0 |
| Category management | `CategoriesScreen` | Complete | Full edit form | Add richer editing later | P1 |
| Budget tracking | `BudgetsScreen` | Complete | Historical budget comparison | Future | P1 |
| Savings goals | `SavingsGoalsScreen` | Complete | Goal edit modal | Future | P1 |
| Recurring expenses | `RecurringExpensesScreen`, `detectRecurringExpenses()` | Complete | Manual recurring form | Add dedicated form later | P1 |
| Insights engine | `generateSpendingInsights()` | Complete | Personalization settings | Future | P1 |
| Analytics charts | `AnalyticsScreen`, `BarListChart` | Complete | Native chart library | Optional later | P1 |
| Reports | `ReportsScreen`, `generateMonthlyReport()` | Complete | Export/share | Future | P1 |
| Search/filter/sort | `TransactionsScreen`, service utilities | Complete | Saved filters | Future | P1 |
| Onboarding | `OnboardingScreen` | Complete | Multi-step wizard | Future | P1 |
| Authentication/guest mode | `FinanceContext`, auth stack | Complete | Real auth integration | Future Firebase setup | P0 |
| Settings | `SettingsScreen` | Complete | Preferences depth | Future | P1 |
| Responsive layout | Shared screen/card/grid styles | Improved | Tablet-specific panes | Future | P1 |
| Empty states | `EmptyState` | Complete | None | Maintain coverage | P0 |
| Loading states | `LoadingState`, provider boot | Complete | Skeleton states | Future | P1 |
| Error states | `ErrorState`, form errors | Complete | Error boundary | Future | P1 |
| Accessibility | Shared UI and docs | Improved | Automated axe/native audit | Future | P0 |
| README/setup | `README.md`, docs | Complete | Screenshots | Add after capture | P0 |
