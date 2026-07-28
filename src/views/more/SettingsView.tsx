import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, {
  useMemo,
  useState,
} from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Button,
  Text,
} from '../../components/base';
import {
  ConfirmModal,
  IconButton,
  ScreenHeader,
} from '../../components/finance';
import {
  Field,
  SelectField,
} from '../../components/form';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import { useFinance } from '../../context/FinanceContext';
import {
  useColors,
  useTheme,
  type ThemeMode,
} from '../../context/ThemeContext';
import {
  SUPPORTED_CURRENCIES,
  validateFinancialPreferencesDraft,
} from '../../settings';
import {
  ControlSize,
  Radius,
  Spacing,
} from '../../theme';

const ThemeSelector = () => {
  const { mode, resolved, setMode } =
    useTheme();
  const colors = useColors();
  const options: {
    label: string;
    value: ThemeMode;
    icon: React.ComponentProps<
      typeof MaterialIcons
    >['name'];
  }[] = [
    {
      label: 'System',
      value: 'system',
      icon: 'settings-brightness',
    },
    {
      label: 'Light',
      value: 'light',
      icon: 'light-mode',
    },
    {
      label: 'Dark',
      value: 'dark',
      icon: 'dark-mode',
    },
  ];

  return (
    <View>
      <View style={styles.rowHeading}>
        <View style={styles.rowCopy}>
          <Text variant="body">
            Appearance
          </Text>
          <Text
            variant="bodySmall"
            color="secondary"
          >
            Currently {resolved};{' '}
            {mode === 'system'
              ? 'following device settings'
              : 'manual override'}
            . Saved on this device.
          </Text>
        </View>
      </View>
      <View
        accessibilityRole="radiogroup"
        style={styles.themeOptions}
      >
        {options.map((option) => {
          const selected =
            option.value === mode;
          return (
            <TouchableOpacity
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={`${option.label} theme`}
              accessibilityState={{ checked: selected }}
              aria-checked={selected}
              onPress={() =>
                setMode(option.value)
              }
              style={[
                styles.themeOption,
                {
                  borderColor: selected
                    ? colors.primary
                    : colors.border,
                  backgroundColor: selected
                    ? colors.primarySoft
                    : colors.bgSecondary,
                },
              ]}
            >
              <MaterialIcons
                name={option.icon}
                size={20}
                color={
                  selected
                    ? colors.primary
                    : colors.textSecondary
                }
              />
              <Text variant="bodySmall">
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const InfoRow = ({
  icon,
  title,
  value,
  description,
}: {
  icon: React.ComponentProps<
    typeof MaterialIcons
  >['name'];
  title: string;
  value: string;
  description: string;
}) => {
  const colors = useColors();
  return (
    <View
      style={[
        styles.settingRow,
        {
          borderBottomColor:
            colors.borderLight,
        },
      ]}
    >
      <View
        style={[
          styles.rowIcon,
          {
            backgroundColor:
              colors.bgTertiary,
          },
        ]}
      >
        <MaterialIcons
          name={icon}
          size={20}
          color={colors.textSecondary}
        />
      </View>
      <View style={styles.rowCopy}>
        <View style={styles.titleValue}>
          <Text variant="body">{title}</Text>
          <Text
            variant="caption"
            color="secondary"
          >
            {value}
          </Text>
        </View>
        <Text
          variant="bodySmall"
          color="secondary"
        >
          {description}
        </Text>
      </View>
    </View>
  );
};

const NavigationRow = ({
  icon,
  title,
  description,
  onPress,
}: {
  icon: React.ComponentProps<
    typeof MaterialIcons
  >['name'];
  title: string;
  description: string;
  onPress: () => void;
}) => {
  const colors = useColors();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Open ${title}`}
      onPress={onPress}
      style={[
        styles.settingRow,
        {
          borderBottomColor:
            colors.borderLight,
        },
      ]}
    >
      <View
        style={[
          styles.rowIcon,
          {
            backgroundColor:
              colors.primarySoft,
          },
        ]}
      >
        <MaterialIcons
          name={icon}
          size={20}
          color={colors.primary}
        />
      </View>
      <View style={styles.rowCopy}>
        <Text variant="body">{title}</Text>
        <Text
          variant="bodySmall"
          color="secondary"
        >
          {description}
        </Text>
      </View>
      <MaterialIcons
        name="chevron-right"
        size={22}
        color={colors.textTertiary}
      />
    </TouchableOpacity>
  );
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text
        variant="caption"
        color="secondary"
        style={styles.sectionTitle}
      >
        {title}
      </Text>
      <View
        style={[
          styles.sectionBody,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
};

export const SettingsScreen = () => (
  <RequireData>
    {(data) => {
      const {
        isGuest,
        updateUser,
        logout,
      } = useFinance();
      const navigation = useNavigation<any>();
      const colors = useColors();
      const [financialDraft, setFinancialDraft] =
        useState({
          currency: data.user.currency,
          monthlyIncome: String(
            data.user.monthlyIncome
          ),
          monthlyBudget: String(
            data.user.monthlyBudget
          ),
        });
      const [submittedPreferences, setSubmittedPreferences] =
        useState(false);
      const [savingPreferences, setSavingPreferences] =
        useState(false);
      const [notice, setNotice] =
        useState<string | null>(null);
      const [error, setError] =
        useState<string | null>(null);
      const [confirmLogout, setConfirmLogout] =
        useState(false);
      const [loggingOut, setLoggingOut] =
        useState(false);

      const preferencesValidation = useMemo(
        () =>
          validateFinancialPreferencesDraft(
            financialDraft
          ),
        [financialDraft]
      );

      const preferencesChanged =
        financialDraft.currency !==
          data.user.currency ||
        financialDraft.monthlyIncome.trim() !==
          String(data.user.monthlyIncome) ||
        financialDraft.monthlyBudget.trim() !==
          String(data.user.monthlyBudget);

      const saveFinancialPreferences =
        async () => {
          setSubmittedPreferences(true);
          if (
            savingPreferences ||
            !preferencesChanged ||
            !preferencesValidation.isValid
          ) {
          return;
        }
        setSavingPreferences(true);
        setError(null);
        setNotice(null);
        try {
          await updateUser(
            preferencesValidation.update
          );
          setNotice(
            'Financial preferences saved.'
          );
          setSubmittedPreferences(false);
        } catch (caught) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Financial preferences could not be saved.'
          );
        } finally {
          setSavingPreferences(false);
        }
      };

      const confirmLogoutAction =
        async () => {
          if (loggingOut) return;
          setLoggingOut(true);
          setError(null);
          try {
            await logout();
            setConfirmLogout(false);
          } catch (caught) {
            setError(
              caught instanceof Error
                ? caught.message
                : 'Logout failed.'
            );
          } finally {
            setLoggingOut(false);
          }
        };

      return (
        <AppScroll>
          <ScreenHeader
            title="Settings"
            subtitle="Implemented preferences, capability status, and account routes."
            action={
              <IconButton
                icon="arrow-back"
                label="Go back"
                onPress={() =>
                  navigation.goBack()
                }
              />
            }
          />

          {notice ? (
            <View
              accessibilityLiveRegion="polite"
              style={[
                styles.message,
                {
                  backgroundColor:
                    colors.primarySoft,
                },
              ]}
            >
              <Text variant="bodySmall">
                {notice}
              </Text>
            </View>
          ) : null}
          {error ? (
            <View
              accessibilityRole="alert"
              style={[
                styles.message,
                {
                  borderColor: colors.danger,
                },
              ]}
            >
              <Text
                variant="bodySmall"
                color="danger"
              >
                {error}
              </Text>
            </View>
          ) : null}

          <Section title="Appearance">
            <View style={styles.controlRow}>
              <ThemeSelector />
            </View>
          </Section>

          <Section title="Financial preferences">
            <View style={styles.controlRow}>
              <View style={styles.rowHeading}>
                <View style={styles.rowCopy}>
                  <Text variant="body">
                    Default money settings
                  </Text>
                  <Text
                    variant="bodySmall"
                    color="secondary"
                  >
                    Used for totals, reports,
                    budgets, and onboarding
                    defaults. Saved to this
                    workspace.
                  </Text>
                </View>
              </View>
              <View style={styles.selectorWrap}>
                <SelectField
                  label="Currency"
                  value={
                    financialDraft.currency
                  }
                  options={[
                    ...SUPPORTED_CURRENCIES,
                  ]}
                  onChange={(value) => {
                    setFinancialDraft(
                      (current) => ({
                        ...current,
                        currency: value,
                      })
                    );
                  }}
                />
                {submittedPreferences &&
                preferencesValidation.errors
                  .currency ? (
                  <Text
                    accessibilityRole="alert"
                    variant="bodySmall"
                    color="danger"
                  >
                    {
                      preferencesValidation
                        .errors.currency
                    }
                  </Text>
                ) : null}
                <Field
                  label="Monthly income"
                  value={
                    financialDraft.monthlyIncome
                  }
                  onChangeText={(
                    monthlyIncome
                  ) =>
                    setFinancialDraft(
                      (current) => ({
                        ...current,
                        monthlyIncome,
                      })
                    )
                  }
                  placeholder="0"
                  keyboardType="decimal-pad"
                  error={
                    submittedPreferences
                      ? preferencesValidation
                          .errors
                          .monthlyIncome
                      : undefined
                  }
                />
                <Field
                  label="Default monthly budget"
                  value={
                    financialDraft.monthlyBudget
                  }
                  onChangeText={(
                    monthlyBudget
                  ) =>
                    setFinancialDraft(
                      (current) => ({
                        ...current,
                        monthlyBudget,
                      })
                    )
                  }
                  placeholder="0"
                  keyboardType="decimal-pad"
                  error={
                    submittedPreferences
                      ? preferencesValidation
                          .errors
                          .monthlyBudget
                      : undefined
                  }
                />
                <Button
                  label={
                    savingPreferences
                      ? 'Saving preferences'
                      : 'Save financial preferences'
                  }
                  onPress={() => {
                    void saveFinancialPreferences();
                  }}
                  disabled={
                    savingPreferences ||
                    !preferencesChanged
                  }
                  variant="primary"
                />
                {savingPreferences ? (
                  <Text
                    variant="bodySmall"
                    color="secondary"
                  >
                    Saving financial
                    preferences…
                  </Text>
                ) : null}
              </View>
            </View>
          </Section>

          <Section title="Notifications">
            <InfoRow
              icon="notifications-off"
              title="Push notifications"
              value="Not implemented"
              description="PerFin OS has no push-notification registration or preference persistence. No toggle is shown."
            />
          </Section>

          <Section title="Location and permissions">
            <InfoRow
              icon="location-on"
              title="Location access"
              value="Point of use"
              description="Location permission is requested only from transaction and map workflows that use it. Settings does not start tracking or request permission."
            />
          </Section>

          <Section title="AI-assisted features">
            <InfoRow
              icon="route"
              title="Plan generation"
              value={
                !isGuest &&
                data.entitlement.features
                  .aiPlanning
                  ? 'Available'
                  : 'Unavailable'
              }
              description={
                isGuest
                  ? 'A signed-in workspace is required for provider-assisted Plan generation.'
                  : 'Availability reflects the current workspace entitlement; provider configuration is verified only at request time.'
              }
            />
            <InfoRow
              icon="summarize"
              title="Report interpretation"
              value={
                !isGuest &&
                data.entitlement.features
                  .aiReports
                  ? 'Deterministic only'
                  : 'Unavailable'
              }
              description="Monthly Reports are deterministic. Provider-assisted work belongs in Planning, not Reports."
            />
          </Section>

          <Section title="Privacy and support">
            <NavigationRow
              icon="privacy-tip"
              title="Privacy & Help"
              description="Review verified data use, provider roles, product scope, and support guidance."
              onPress={() =>
                navigation.navigate(
                  'HelpAbout'
                )
              }
            />
          </Section>

          <Section title="Account behavior">
            <NavigationRow
              icon="person"
              title="Profile"
              description="Edit identity and review account state."
              onPress={() =>
                navigation.navigate('Profile')
              }
            />
            <NavigationRow
              icon="category"
              title="Categories"
              description="Manage category names, colors, icons, and archived states."
              onPress={() =>
                navigation.navigate(
                  'Categories'
                )
              }
            />
            <InfoRow
              icon={
                isGuest
                  ? 'person-outline'
                  : 'verified-user'
              }
              title="Workspace mode"
              value={
                isGuest
                  ? 'Guest'
                  : 'Signed in'
              }
              description={
                isGuest
                  ? 'Guest data is local and is not a synced account.'
                  : 'Signed-in data is handled by the active account workspace.'
              }
            />
            <View style={styles.destructiveRow}>
              <View style={styles.rowCopy}>
                <Text variant="body">
                  {isGuest
                    ? 'Exit guest workspace'
                    : 'Sign out'}
                </Text>
                <Text
                  variant="bodySmall"
                  color="secondary"
                >
                  Confirmation is required.
                </Text>
              </View>
              <Button
                label={
                  isGuest ? 'Exit' : 'Sign out'
                }
                variant="danger"
                size="sm"
                onPress={() =>
                  setConfirmLogout(true)
                }
              />
            </View>
          </Section>

          <ConfirmModal
            visible={confirmLogout}
            title={
              isGuest
                ? 'Exit guest workspace?'
                : 'Sign out?'
            }
            message={
              isGuest
                ? 'The guest session will close. Guest data is not synced to an account.'
                : 'PerFin OS will sign out before clearing the local workspace.'
            }
            confirmLabel={
              loggingOut
                ? 'Signing out'
                : isGuest
                  ? 'Exit'
                  : 'Sign out'
            }
            onConfirm={
              confirmLogoutAction
            }
            onCancel={() => {
              if (!loggingOut) {
                setConfirmLogout(false);
              }
            }}
          />
        </AppScroll>
      );
    }}
  </RequireData>
);

const styles = StyleSheet.create({
  message: {
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontWeight: '800',
    marginBottom: Spacing.sm,
  },
  sectionBody: {
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  controlRow: {
    padding: Spacing.lg,
  },
  rowHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  rowCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  themeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  themeOption: {
    minHeight:
      ControlSize.minimumTouchTarget,
    flexGrow: 1,
    minWidth: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
  },
  selectorWrap: {
    marginTop: Spacing.md,
  },
  settingRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderBottomWidth: 1,
    padding: Spacing.lg,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleValue: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  destructiveRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
});
