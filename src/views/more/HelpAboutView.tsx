import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Card,
  Text,
} from '../../components/base';
import {
  IconButton,
  ScreenHeader,
} from '../../components/finance';
import { Segmented } from '../../components/form';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import { useColors } from '../../context/ThemeContext';
import {
  getDataRemovalGuidance,
  getHelpTopics,
  getPrivacyContent,
  type HelpTopic,
} from '../../privacy';
import {
  Radius,
  Spacing,
} from '../../theme/index';

const SECTION_ICONS = {
  required: 'storage',
  permissions: 'security',
  ai: 'auto-awesome',
} as const;

const HelpTopicRow = ({
  topic,
  expanded,
  onToggle,
}: {
  topic: HelpTopic;
  expanded: boolean;
  onToggle: () => void;
}) => {
  const colors = useColors();
  return (
    <View
      style={[
        styles.helpRow,
        {
          borderBottomColor:
            colors.borderSubtle,
        },
      ]}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? 'Close' : 'Open'} ${topic.title} help`}
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={styles.helpToggle}
      >
        <Text variant="body">
          {topic.title}
        </Text>
        <MaterialIcons
          name={
            expanded
              ? 'expand-less'
              : 'expand-more'
          }
          size={24}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
      {expanded ? (
        <View style={styles.helpDetail}>
          <Text
            variant="bodySmall"
            color="secondary"
          >
            {topic.detail}
          </Text>
          {topic.recovery ? (
            <View
              style={[
                styles.recovery,
                {
                  backgroundColor:
                    colors.backgroundSubtle,
                },
              ]}
            >
              <Text
                variant="caption"
                color="secondary"
              >
                NEXT STEP
              </Text>
              <Text
                variant="bodySmall"
                style={styles.recoveryCopy}
              >
                {topic.recovery}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

export const HelpAboutScreen = () => (
  <RequireData>
    {(data) => {
      const navigation = useNavigation<any>();
      const colors = useColors();
      const isGuest =
        data.entitlement.isGuest;
      const [tab, setTab] = useState<
        'privacy' | 'help'
      >('privacy');
      const [expandedTopic, setExpandedTopic] =
        useState<HelpTopic['id'] | null>(
          'account'
        );
      const privacy =
        getPrivacyContent(isGuest);
      const help = getHelpTopics(isGuest);

      return (
        <AppScroll>
          <ScreenHeader
            leading={
              <IconButton
                icon="arrow-back"
                label="Go back"
                onPress={() => navigation.goBack()}
              />
            }
            title="Privacy & Help"
            subtitle="Data use, user controls, product scope, and recovery guidance."
          />

          <Segmented
            options={['privacy', 'help']}
            value={tab}
            onChange={(value) =>
              setTab(
                value as 'privacy' | 'help'
              )
            }
          />

          <View
            style={[
              styles.workspaceBanner,
              {
                backgroundColor:
                  colors.backgroundSubtle,
                borderColor:
                  colors.borderDefault,
              },
            ]}
          >
            <View
              style={[
                styles.bannerIcon,
                {
                  backgroundColor:
                    colors.actionPrimarySoft,
                },
              ]}
            >
              <MaterialIcons
                name={
                  isGuest
                    ? 'person-outline'
                    : 'verified-user'
                }
                size={22}
                color={colors.actionPrimary}
              />
            </View>
            <View style={styles.bannerCopy}>
              <Text variant="h4">
                {isGuest
                  ? 'Guest workspace'
                  : 'Signed-in workspace'}
              </Text>
              <Text
                variant="bodySmall"
                color="secondary"
              >
                {isGuest
                  ? 'Finance records use local app storage and are not synced to an account.'
                  : 'Account identity uses Firebase Authentication when configured; workspace records and saved Plans use the active signed-in workspace.'}
              </Text>
            </View>
          </View>

          {tab === 'privacy' ? (
            <>
              {privacy.map((section) => (
                <View
                  key={section.id}
                  style={styles.section}
                >
                  <View
                    style={
                      styles.sectionHeading
                    }
                  >
                    <MaterialIcons
                      name={
                        SECTION_ICONS[
                          section.id
                        ]
                      }
                      size={21}
                      color={colors.statusInformational}
                    />
                    <View
                      style={
                        styles.sectionCopy
                      }
                    >
                      <Text variant="h3">
                        {section.title}
                      </Text>
                      <Text
                        variant="bodySmall"
                        color="secondary"
                      >
                        {section.summary}
                      </Text>
                    </View>
                  </View>

                  <Card
                    style={styles.itemList}
                  >
                    {section.items.map(
                      (item) => (
                        <View
                          key={item.id}
                          style={[
                            styles.privacyItem,
                            {
                              borderBottomColor:
                                colors.borderSubtle,
                            },
                          ]}
                        >
                          <View
                            style={
                              styles.itemTitle
                            }
                          >
                            <Text variant="body">
                              {item.title}
                            </Text>
                            {item.status ? (
                              <Text
                                variant="caption"
                                color="secondary"
                              >
                                {item.status}
                              </Text>
                            ) : null}
                          </View>
                          <Text
                            variant="bodySmall"
                            color="secondary"
                          >
                            {item.detail}
                          </Text>
                        </View>
                      )
                    )}
                  </Card>
                </View>
              ))}

              <View
                style={[
                  styles.removal,
                  {
                    borderColor:
                      colors.statusWarning,
                  },
                ]}
              >
                <Text variant="h3">
                  Removing data
                </Text>
                <Text
                  variant="bodySmall"
                  color="secondary"
                  style={styles.removalCopy}
                >
                  {getDataRemovalGuidance(
                    isGuest
                  )}
                </Text>
                <Text
                  variant="bodySmall"
                  color="secondary"
                  style={styles.removalCopy}
                >
                  Removing a transaction does
                  not verify deletion of a
                  previously uploaded receipt
                  object. Do not rely on logout
                  as a deletion action.
                </Text>
              </View>

              <View style={styles.providers}>
                <Text variant="h3">
                  Service roles
                </Text>
                <Text
                  variant="bodySmall"
                  color="secondary"
                  style={styles.removalCopy}
                >
                  Firebase supports signed-in
                  identity and the signed-in
                  workspace path.
                  Cloudflare runs the app
                  gateway and optional receipt
                  storage. Google Places
                  supports place search. The
                  protected planning service
                  supports optional Plan
                  generation.
                </Text>
                <Text
                  variant="bodySmall"
                  color="secondary"
                  style={styles.removalCopy}
                >
                  Retention, backups, deployed
                  regions, staff access, and
                  provider account settings are
                  not verified in this build.
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.helpHeading}>
                <Text variant="h3">
                  Help by task
                </Text>
                <Text
                  variant="bodySmall"
                  color="secondary"
                  style={styles.removalCopy}
                >
                  Open a topic for product
                  behavior and the next
                  supported recovery step.
                </Text>
              </View>
              <Card style={styles.helpList}>
                {help.map((topic) => (
                  <HelpTopicRow
                    key={topic.id}
                    topic={topic}
                    expanded={
                      expandedTopic ===
                      topic.id
                    }
                    onToggle={() =>
                      setExpandedTopic(
                        expandedTopic ===
                          topic.id
                          ? null
                          : topic.id
                      )
                    }
                  />
                ))}
              </Card>

              <View style={styles.scope}>
                <Text variant="h3">
                  Product scope
                </Text>
                <Text
                  variant="bodySmall"
                  color="secondary"
                  style={styles.removalCopy}
                >
                  PerFin OS organizes personal
                  finance records and produces
                  educational summaries and
                  planning drafts. It does not
                  move money, process payments,
                  issue financial products, file
                  taxes, or make investment
                  decisions.
                </Text>
              </View>
            </>
          )}
        </AppScroll>
      );
    }}
  </RequireData>
);

const styles = StyleSheet.create({
  workspaceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  itemList: {
    paddingVertical: 0,
  },
  privacyItem: {
    gap: Spacing.sm,
    borderBottomWidth: 1,
    paddingVertical: Spacing.lg,
  },
  itemTitle: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  removal: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  removalCopy: {
    marginTop: Spacing.sm,
  },
  providers: {
    marginBottom: Spacing.xl,
  },
  helpHeading: {
    marginBottom: Spacing.md,
  },
  helpList: {
    paddingVertical: 0,
    marginBottom: Spacing.xl,
  },
  helpRow: {
    borderBottomWidth: 1,
  },
  helpToggle: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  helpDetail: {
    paddingBottom: Spacing.lg,
  },
  recovery: {
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  recoveryCopy: {
    marginTop: Spacing.xs,
  },
  scope: {
    marginBottom: Spacing.xl,
  },
});
