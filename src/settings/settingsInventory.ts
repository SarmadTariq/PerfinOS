export type SettingsControlKind =
  | 'selector'
  | 'input'
  | 'navigation'
  | 'information'
  | 'destructive';

export type SettingsCapabilityState = 'implemented' | 'unsupported' | 'point-of-use';

export type SettingsInventoryInput = {
  isGuest: boolean;
  currency: string;
  monthlyIncome: number;
  monthlyBudget: number;
  aiPlanningEnabled: boolean;
  aiReportsEnabled: boolean;
};

export type SettingsInventoryRow = {
  id:
    | 'theme'
    | 'currency'
    | 'monthly-income'
    | 'default-monthly-budget'
    | 'push-notifications'
    | 'location-permission'
    | 'ai-availability'
    | 'account-profile'
    | 'privacy-help'
    | 'logout';
  label: string;
  control: SettingsControlKind;
  state: SettingsCapabilityState;
  implemented: boolean;
  persisted: boolean;
  value?: string;
  detail: string;
};

export const SUPPORTED_CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export type FinancialPreferencesDraft = {
  currency: string;
  monthlyIncome: string;
  monthlyBudget: string;
};

export type FinancialPreferenceField = keyof FinancialPreferencesDraft;
export type FinancialPreferenceErrors = Partial<Record<FinancialPreferenceField, string>>;

export type FinancialPreferencesValidationResult = {
  errors: FinancialPreferenceErrors;
  update: {
    currency: string;
    monthlyIncome: number;
    monthlyBudget: number;
  };
  isValid: boolean;
};

const parseMoneyPreference = (value: string) => {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

export function validateFinancialPreferencesDraft(
  draft: FinancialPreferencesDraft,
): FinancialPreferencesValidationResult {
  const errors: FinancialPreferenceErrors = {};
  const monthlyIncome = parseMoneyPreference(draft.monthlyIncome);
  const monthlyBudget = parseMoneyPreference(draft.monthlyBudget);

  if (!SUPPORTED_CURRENCIES.includes(draft.currency as SupportedCurrency)) {
    errors.currency = 'Select a supported currency.';
  }

  if (monthlyIncome === null || monthlyIncome < 0) {
    errors.monthlyIncome = 'Enter a monthly income of 0 or more.';
  }

  if (monthlyBudget === null || monthlyBudget < 0) {
    errors.monthlyBudget = 'Enter a default monthly budget of 0 or more.';
  }

  return {
    errors,
    update: {
      currency: draft.currency,
      monthlyIncome: monthlyIncome ?? 0,
      monthlyBudget: monthlyBudget ?? 0,
    },
    isValid: Object.keys(errors).length === 0,
  };
}

export function getSettingsInventory(
  input: SettingsInventoryInput,
): SettingsInventoryRow[] {
  const aiFeatures = [
    input.aiPlanningEnabled ? 'planning' : null,
    input.aiReportsEnabled ? 'reports' : null,
  ].filter((feature): feature is string => feature !== null);

  return [
    {
      id: 'theme',
      label: 'Theme',
      control: 'selector',
      state: 'implemented',
      implemented: true,
      persisted: true,
      value: 'system',
      detail: 'Theme selection is available and persisted locally.',
    },
    {
      id: 'currency',
      label: 'Currency',
      control: 'selector',
      state: 'implemented',
      implemented: true,
      persisted: true,
      value: input.currency,
      detail: 'Currency selection is available and persisted with the user profile.',
    },
    {
      id: 'monthly-income',
      label: 'Monthly income',
      control: 'input',
      state: 'implemented',
      implemented: true,
      persisted: true,
      value: String(input.monthlyIncome),
      detail: 'Monthly income is available and persisted with the user profile.',
    },
    {
      id: 'default-monthly-budget',
      label: 'Default monthly budget',
      control: 'input',
      state: 'implemented',
      implemented: true,
      persisted: true,
      value: String(input.monthlyBudget),
      detail: 'The default monthly budget is available and persisted with the user profile.',
    },
    {
      id: 'push-notifications',
      label: 'Push notifications',
      control: 'information',
      state: 'unsupported',
      implemented: false,
      persisted: false,
      detail: 'Push notification preferences are not currently supported.',
    },
    {
      id: 'location-permission',
      label: 'Location permission',
      control: 'information',
      state: 'point-of-use',
      implemented: false,
      persisted: false,
      detail: 'Location permission is requested only at the point of use; there is no tracking toggle.',
    },
    {
      id: 'ai-availability',
      label: 'AI availability',
      control: 'information',
      state: 'implemented',
      implemented: true,
      persisted: false,
      value: aiFeatures.length > 0 ? aiFeatures.join(', ') : 'none enabled',
      detail: input.isGuest
        ? 'AI availability is informational for guest sessions; no setting is changed here.'
        : 'AI availability reflects enabled product capabilities; no setting is changed here.',
    },
    {
      id: 'account-profile',
      label: 'Account and profile',
      control: 'navigation',
      state: 'implemented',
      implemented: true,
      persisted: false,
      detail: input.isGuest
        ? 'View guest profile and account options.'
        : 'View account identity and profile options.',
    },
    {
      id: 'privacy-help',
      label: 'Privacy and help',
      control: 'navigation',
      state: 'implemented',
      implemented: true,
      persisted: false,
      detail: 'Open privacy information and help resources.',
    },
    {
      id: 'logout',
      label: input.isGuest ? 'Exit guest workspace' : 'Sign out',
      control: 'destructive',
      state: 'implemented',
      implemented: true,
      persisted: false,
      detail: input.isGuest ? 'Exit the guest session.' : 'Sign out of this account.',
    },
  ];
}
