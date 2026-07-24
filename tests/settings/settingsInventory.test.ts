import { describe, expect, it } from 'vitest';
import {
  getSettingsInventory,
  validateFinancialPreferencesDraft,
} from '../../src/settings';

describe('getSettingsInventory', () => {
  it('describes persisted controls and unsupported capabilities accurately', () => {
    const rows = getSettingsInventory({
      isGuest: true,
      currency: 'CAD',
      monthlyIncome: 5200,
      monthlyBudget: 3200,
      aiPlanningEnabled: true,
      aiReportsEnabled: false,
    });

    expect(rows.find((row) => row.id === 'theme')).toMatchObject({
      control: 'selector',
      state: 'implemented',
      persisted: true,
    });
    expect(rows.find((row) => row.id === 'currency')).toMatchObject({
      value: 'CAD',
      persisted: true,
    });
    expect(rows.find((row) => row.id === 'monthly-income')).toMatchObject({
      control: 'input',
      value: '5200',
      persisted: true,
    });
    expect(rows.find((row) => row.id === 'default-monthly-budget')).toMatchObject({
      control: 'input',
      value: '3200',
      persisted: true,
    });
    expect(rows.find((row) => row.id === 'push-notifications')).toMatchObject({
      control: 'information',
      state: 'unsupported',
      implemented: false,
    });
    expect(rows.find((row) => row.id === 'location-permission')).toMatchObject({
      state: 'point-of-use',
      persisted: false,
    });
  });

  it('derives AI availability, session copy, and control kinds from input', () => {
    const rows = getSettingsInventory({
      isGuest: false,
      currency: 'USD',
      monthlyIncome: 7000,
      monthlyBudget: 4000,
      aiPlanningEnabled: false,
      aiReportsEnabled: true,
    });

    expect(rows.find((row) => row.id === 'ai-availability')).toMatchObject({
      control: 'information',
      value: 'reports',
    });
    expect(rows.find((row) => row.id === 'account-profile')?.detail).toContain('account identity');
    expect(rows.find((row) => row.id === 'privacy-help')?.control).toBe('navigation');
    expect(rows.find((row) => row.id === 'logout')).toMatchObject({
      control: 'destructive',
      state: 'implemented',
      label: 'Sign out',
    });
  });

  it('uses the approved guest session action copy', () => {
    const rows = getSettingsInventory({
      isGuest: true,
      currency: 'CAD',
      monthlyIncome: 5200,
      monthlyBudget: 3200,
      aiPlanningEnabled: false,
      aiReportsEnabled: false,
    });

    expect(rows.find((row) => row.id === 'logout')).toMatchObject({
      label: 'Exit guest workspace',
      detail: 'Exit the guest session.',
    });
  });

  it('validates and normalizes financial preferences before persistence', () => {
    const result = validateFinancialPreferencesDraft({
      currency: 'CAD',
      monthlyIncome: ' 5200.50 ',
      monthlyBudget: '3200',
    });

    expect(result).toMatchObject({
      isValid: true,
      update: {
        currency: 'CAD',
        monthlyIncome: 5200.5,
        monthlyBudget: 3200,
      },
    });
  });

  it('rejects unsupported currency and invalid numeric preferences', () => {
    const result = validateFinancialPreferencesDraft({
      currency: 'JPY',
      monthlyIncome: '-1',
      monthlyBudget: 'later',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toMatchObject({
      currency: 'Select a supported currency.',
      monthlyIncome: 'Enter a monthly income of 0 or more.',
      monthlyBudget: 'Enter a default monthly budget of 0 or more.',
    });
  });
});
