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
  Card,
  Text,
} from '../../components/base';
import {
  ConfirmModal,
  IconButton,
  ScreenHeader,
} from '../../components/finance';
import {
  Field,
} from '../../components/form';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import { useFinance } from '../../context/FinanceContext';
import { useColors } from '../../context/ThemeContext';
import {
  validateProfileDraft,
} from '../../profile';
import {
  Radius,
  Spacing,
} from '../../theme';

const ReadOnlyRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => {
  const colors = useColors();
  return (
    <View
      style={[
        styles.readOnlyRow,
        {
          borderBottomColor:
            colors.borderLight,
        },
      ]}
    >
      <Text
        variant="bodySmall"
        color="secondary"
      >
        {label}
      </Text>
      <Text
        variant="bodySmall"
        style={styles.readOnlyValue}
      >
        {value}
      </Text>
    </View>
  );
};

const UtilityRow = ({
  icon,
  label,
  description,
  onPress,
}: {
  icon: React.ComponentProps<
    typeof MaterialIcons
  >['name'];
  label: string;
  description: string;
  onPress: () => void;
}) => {
  const colors = useColors();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Open ${label}`}
      onPress={onPress}
      style={[
        styles.utilityRow,
        {
          borderBottomColor:
            colors.borderLight,
        },
      ]}
    >
      <View
        style={[
          styles.utilityIcon,
          {
            backgroundColor:
              colors.primarySoft,
          },
        ]}
      >
        <MaterialIcons
          name={icon}
          size={21}
          color={colors.primary}
        />
      </View>
      <View style={styles.utilityCopy}>
        <Text variant="body">
          {label}
        </Text>
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

export const ProfileScreen = () => (
  <RequireData>
    {(data) => {
      const {
        isGuest,
        updateUser,
        logout,
      } = useFinance();
      const navigation = useNavigation<any>();
      const colors = useColors();
      const [name, setName] = useState(
        data.user.name
      );
      const [phone, setPhone] = useState(
        data.user.phone
      );
      const [submitted, setSubmitted] =
        useState(false);
      const [saving, setSaving] =
        useState(false);
      const [notice, setNotice] =
        useState<string | null>(null);
      const [error, setError] =
        useState<string | null>(null);
      const [confirmLogout, setConfirmLogout] =
        useState(false);
      const [loggingOut, setLoggingOut] =
        useState(false);

      const validation = useMemo(
        () =>
          validateProfileDraft({
            name,
            phone,
          }),
        [
          name,
          phone,
        ]
      );

      const save = async () => {
        setSubmitted(true);
        setError(null);
        setNotice(null);
        if (!validation.isValid) return;
        setSaving(true);
        try {
          await updateUser(
            validation.update
          );
          setNotice(
            'Profile saved.'
          );
          setSubmitted(false);
        } catch (caught) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Profile could not be saved.'
          );
        } finally {
          setSaving(false);
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

      const createdAt = new Date(
        data.user.createdAt
      );
      const createdLabel =
        Number.isNaN(createdAt.getTime())
          ? 'Unavailable'
          : createdAt.toLocaleDateString();

      return (
        <AppScroll>
          <ScreenHeader
            title="Profile"
            subtitle="Identity, account state, and workspace utilities."
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

          <View style={styles.identityBand}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor:
                    colors.primarySoft,
                },
              ]}
            >
              <Text variant="h3">
                {(data.user.name || 'P')
                  .trim()
                  .slice(0, 1)
                  .toUpperCase()}
              </Text>
            </View>
            <View style={styles.identityCopy}>
              <Text variant="h2">
                {data.user.name}
              </Text>
              <Text
                variant="bodySmall"
                color="secondary"
              >
                {isGuest
                  ? 'Guest workspace'
                  : 'Signed-in workspace'}
                {' · '}
                {data.entitlement.plan ===
                'free'
                  ? 'Free account'
                  : 'Guest access'}
              </Text>
            </View>
          </View>

          <View style={styles.columns}>
            <Card style={styles.column}>
              <Text variant="h3">
                Personal information
              </Text>
              <Text
                variant="bodySmall"
                color="secondary"
                style={styles.sectionCopy}
              >
                Editable identity values used inside
                your finance workspace.
              </Text>

              <View style={styles.form}>
                <Field
                  label="Name"
                  value={name}
                  onChangeText={setName}
                  placeholder="Full name"
                  error={
                    submitted
                      ? validation.errors.name
                      : undefined
                  }
                />
                <Field
                  label="Phone"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+1 416 555 0198"
                  keyboardType="phone-pad"
                  error={
                    submitted
                      ? validation.errors.phone
                      : undefined
                  }
                />
                <Button
                  label="Save profile"
                  onPress={save}
                  loading={saving}
                  disabled={saving}
                />
              </View>
            </Card>

            <View style={styles.columnStack}>
              <Card>
                <Text variant="h3">
                  Account information
                </Text>
                <Text
                  variant="bodySmall"
                  color="secondary"
                  style={styles.sectionCopy}
                >
                  Read-only identity and
                  workspace state.
                </Text>
                <View style={styles.readOnlyList}>
                  <ReadOnlyRow
                    label="Email"
                    value={
                      data.user.email ||
                      'Not linked'
                    }
                  />
                  <ReadOnlyRow
                    label="Workspace"
                    value={
                      isGuest
                        ? 'Guest'
                        : 'Signed in'
                    }
                  />
                  <ReadOnlyRow
                    label="Account tier"
                    value={
                      isGuest
                        ? 'Guest access'
                        : 'Free'
                    }
                  />
                  <ReadOnlyRow
                    label="Created"
                    value={createdLabel}
                  />
                </View>
              </Card>

              <Card>
                <Text variant="h3">
                  Plan state
                </Text>
                <Text
                  variant="bodySmall"
                  color="secondary"
                  style={styles.sectionCopy}
                >
                  {isGuest
                    ? 'Plan previews can use guest activity. Saving Plan history requires a signed-in workspace.'
                    : data.entitlement.features
                        .aiPlanning
                      ? 'Plan workspace and saved Plan history are available. Existing Plans are never replaced without an explicit action.'
                      : 'Plan generation is unavailable for this workspace.'}
                </Text>
                <Button
                  label="Open Plan"
                  variant="secondary"
                  onPress={() =>
                    navigation.navigate('Plan')
                  }
                  style={styles.sectionAction}
                />
              </Card>
            </View>
          </View>

          <View style={styles.sectionHeading}>
            <Text variant="h3">
              Workspace utilities
            </Text>
            <Text
              variant="bodySmall"
              color="secondary"
              style={styles.sectionCopy}
            >
              Verified destinations for setup,
              reporting, preferences, and
              support.
            </Text>
          </View>
          <Card style={styles.utilityList}>
            <UtilityRow
              icon="category"
              label="Categories"
              description="Manage income and expense categories."
              onPress={() =>
                navigation.navigate(
                  'Categories'
                )
              }
            />
            <UtilityRow
              icon="summarize"
              label="Reports"
              description="Generate and review monthly summaries."
              onPress={() =>
                navigation.navigate('Reports')
              }
            />
            <UtilityRow
              icon="settings"
              label="Settings"
              description="Appearance and implemented preferences."
              onPress={() =>
                navigation.navigate('Settings')
              }
            />
            <UtilityRow
              icon="privacy-tip"
              label="Privacy & Help"
              description="Data use, product scope, and support."
              onPress={() =>
                navigation.navigate(
                  'HelpAbout'
                )
              }
            />
          </Card>

          <View style={styles.accountActions}>
            <Text variant="h3">
              Account state
            </Text>
            <Text
              variant="bodySmall"
              color="secondary"
              style={styles.sectionCopy}
            >
              {isGuest
                ? 'Exiting closes the active guest session from the app. Guest data is not a synced account.'
                : 'Signing out completes the remote sign-out before clearing the local workspace.'}
            </Text>
            <Button
              label={
                isGuest
                  ? 'Exit guest workspace'
                  : 'Sign out'
              }
              variant="danger"
              onPress={() =>
                setConfirmLogout(true)
              }
              style={styles.sectionAction}
            />
          </View>

          <ConfirmModal
            visible={confirmLogout}
            title={
              isGuest
                ? 'Exit guest workspace?'
                : 'Sign out?'
            }
            message={
              isGuest
                ? 'The active guest session will close. Guest data is not synced to an account.'
                : 'PerFin OS will sign out of Firebase, then clear the local workspace from this session.'
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
  identityBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
  },
  columns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  column: {
    flexGrow: 1,
    flexBasis: 430,
  },
  columnStack: {
    flexGrow: 1,
    flexBasis: 320,
    gap: Spacing.lg,
  },
  sectionCopy: {
    marginTop: Spacing.xs,
  },
  form: {
    marginTop: Spacing.lg,
  },
  readOnlyList: {
    marginTop: Spacing.md,
  },
  readOnlyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
    borderBottomWidth: 1,
    paddingVertical: Spacing.md,
  },
  readOnlyValue: {
    fontWeight: '700',
    maxWidth: '65%',
    textAlign: 'right',
  },
  sectionAction: {
    marginTop: Spacing.lg,
  },
  sectionHeading: {
    marginBottom: Spacing.md,
  },
  utilityList: {
    paddingVertical: 0,
    marginBottom: Spacing.xl,
  },
  utilityRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderBottomWidth: 1,
    paddingVertical: Spacing.md,
  },
  utilityIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  utilityCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  accountActions: {
    marginBottom: Spacing.xl,
  },
});
