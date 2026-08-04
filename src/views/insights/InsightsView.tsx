import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import {
  Button,
  Card,
  Text,
} from '../../components/base';
import {
  EmptyState,
} from '../../components/finance';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import { RootAppHeader } from '../../components/layout/RootAppHeader';
import { RootTabBottomSpacer } from '../../components/layout/FloatingTabChrome';
import {
  calculateActivitySummary,
  useActivityFilters,
} from '../../context/ActivityFilterContext';
import { useColors } from '../../context/ThemeContext';
import {
  buildInsightHierarchy,
  getInsightCoverageState,
  type InsightGroup,
  type InsightHierarchyItem,
} from '../../insights';
import type {
  AppData,
} from '../../models/finance';
import {
  filterTransactions,
  sortTransactions,
} from '../../repositories/AnalyticsRepository';
import {
  Radius,
  Spacing,
} from '../../theme/index';
import { formatCurrency } from '../../utils/format';

const GROUP_META: Record<
  InsightGroup,
  {
    title: string;
    description: string;
    icon: React.ComponentProps<
      typeof MaterialIcons
    >['name'];
  }
> = {
  observation: {
    title: 'Informational',
    description:
      'Context from the selected Activity period.',
    icon: 'visibility',
  },
  attention: {
    title: 'Review',
    description:
      'Evidence worth checking before deciding.',
    icon: 'fact-check',
  },
  action: {
    title: 'Action needed',
    description:
      'Verified next steps supported by this evidence.',
    icon: 'arrow-forward',
  },
};

const InsightCard = ({
  item,
  onOpen,
}: {
  item: InsightHierarchyItem;
  onOpen: () => void;
}) => {
  const colors = useColors();
  const meta = GROUP_META[item.group];

  return (
    <Card style={styles.itemCard}>
      <View style={styles.itemLayout}>
        <View
          style={[
            styles.itemIcon,
            {
              backgroundColor:
                colors.actionPrimarySoft,
            },
          ]}
        >
          <MaterialIcons
            name={meta.icon}
            size={20}
            color={colors.actionPrimary}
          />
        </View>
        <View style={styles.itemContent}>
          <Text variant="h4">
            {item.title}
          </Text>
          {/* INSIGHTS_EVIDENCE_SLICE_I2 */}
          <View style={styles.insightBlock}>
            <Text
              variant="caption"
              color="secondary"
              style={styles.blockLabel}
            >
              WHAT CHANGED
            </Text>

            <Text
              variant="body"
              color="secondary"
            >
              {item.summary}
            </Text>
          </View>

          <View
            style={[
              styles.evidence,
              {
                borderColor:
                  colors.borderSubtle,
              },
            ]}
          >
            <View style={styles.insightBlock}>
              <Text
                variant="caption"
                color="secondary"
                style={styles.blockLabel}
              >
                WHY IT MATTERS
              </Text>

              <Text variant="bodySmall">
                {item.whyItMatters}
              </Text>
            </View>

            <View style={styles.insightBlock}>
              <Text
                variant="caption"
                color="secondary"
                style={styles.blockLabel}
              >
                EVIDENCE
              </Text>

              <Text variant="bodySmall">
                {item.evidence}
              </Text>
            </View>

            <View
              style={styles.evidenceMetaGrid}
            >
              <View
                style={
                  styles.evidenceMetaItem
                }
              >
                <Text
                  variant="caption"
                  color="secondary"
                  style={styles.blockLabel}
                >
                  PERIOD
                </Text>

                <Text variant="bodySmall">
                  {item.period}
                </Text>
              </View>

              <View
                style={
                  styles.evidenceMetaItem
                }
              >
                <Text
                  variant="caption"
                  color="secondary"
                  style={styles.blockLabel}
                >
                  COMPARISON
                </Text>

                <Text variant="bodySmall">
                  {item.comparison}
                </Text>
              </View>
            </View>

            <View style={styles.insightBlock}>
              <Text
                variant="caption"
                color="secondary"
                style={styles.blockLabel}
              >
                BASIS AND UNCERTAINTY
              </Text>

              <Text variant="bodySmall">
                Deterministic calculation.{' '}
                {item.uncertainty}
              </Text>
            </View>
          </View>

          {item.destination &&
          item.actionLabel ? (
            <View
              style={
                styles.recommendedAction
              }
            >
              <Text
                variant="caption"
                color="secondary"
                style={styles.blockLabel}
              >
                RECOMMENDED ACTION
              </Text>

              {item.destination ===
              'Reports' ? (
                <Text
                  variant="bodySmall"
                  color="secondary"
                >
                  Open Reports to generate or
                  review a deterministic monthly
                  record.
                </Text>
              ) : item.destination ===
                'Plan' ? (
                <Text
                  variant="bodySmall"
                  color="secondary"
                >
                  Carry this evidence into Plan
                  for review. Opening Plan does
                  not create, activate, archive,
                  or replace a Plan.
                </Text>
              ) : null}

              <Button
                label={item.actionLabel}
                variant={
                  item.group === 'action'
                    ? 'primary'
                    : 'secondary'
                }
                onPress={onOpen}
                style={styles.itemAction}
              />
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
};

const InsightSection = ({
  group,
  items,
  onOpen,
}: {
  group: InsightGroup;
  items: InsightHierarchyItem[];
  onOpen: (
    item: InsightHierarchyItem
  ) => void;
}) => {
  if (items.length === 0) return null;
  const meta = GROUP_META[group];

  return (
    <View style={styles.section}>
      <Text variant="h3">{meta.title}</Text>
      <Text
        variant="bodySmall"
        color="secondary"
        style={styles.sectionCopy}
      >
        {meta.description}
      </Text>
      <View style={styles.itemList}>
        {items.map((item) => (
          <InsightCard
            key={item.id}
            item={item}
            onOpen={() => onOpen(item)}
          />
        ))}
      </View>
    </View>
  );
};

const InsightsContent = ({
  data,
}: {
  data: AppData;
}) => {
  const navigation = useNavigation<any>();
  const colors = useColors();
  const {
    dateRange,
    frequencyFilter,
  } = useActivityFilters();
  const transactions = useMemo(
    () =>
      sortTransactions(
        filterTransactions(
          data.transactions,
          {
            startDate:
              dateRange.startDate,
            endDate: dateRange.endDate,
            frequency:
              frequencyFilter,
          }
        ),
        'date-desc'
      ),
    [
      data.transactions,
      dateRange.endDate,
      dateRange.startDate,
      frequencyFilter,
    ]
  );
  const summary = useMemo(
    () =>
      calculateActivitySummary(
        transactions
      ),
    [transactions]
  );
  const input = useMemo(
    () => ({
      data,
      transactions,
      period: {
        label: dateRange.label,
        startDate:
          dateRange.startDate,
        endDate: dateRange.endDate,
      },
    }),
    [
      data,
      dateRange.endDate,
      dateRange.label,
      dateRange.startDate,
      transactions,
    ]
  );
  const coverage =
    getInsightCoverageState(input);
  const items =
    buildInsightHierarchy(input);

  const open = (
    item: InsightHierarchyItem
  ) => {
    if (!item.destination) return;
    if (item.destination === 'Plan') {
      navigation.navigate('Plan', {
        insightProposal: {
          source: 'insights',
          insightId: item.id,
          period: input.period,
          frequency: frequencyFilter,
          summary: item.summary,
          evidence: item.evidence,
          comparison: item.comparison,
          whyItMatters: item.whyItMatters,
          intent: 'review_plan_context',
          persists: false,
        },
      });
      return;
    }
    navigation.navigate(item.destination);
  };

  /* INSIGHTS_STRUCTURE_SLICE_I1 */
  const groups: InsightGroup[] = [
    'action',
    'attention',
    'observation',
  ];
  const frequencyLabel =
    frequencyFilter === 'all'
      ? 'All transaction frequencies'
      : frequencyFilter === 'recurring'
        ? 'Recurring transactions'
        : 'One-time transactions';

  return (
    <AppScroll>
      <RootAppHeader
        title="Insights"
        subtitle="A small set of evidence-bound signals and supported next steps."
      />

      <View
        style={[
          styles.contextBand,
          {
            backgroundColor:
              colors.backgroundSubtle,
            borderColor: colors.borderDefault,
          },
        ]}
      >
        <View style={styles.contextHeading}>
          <View style={styles.contextCopy}>
            <Text
              variant="caption"
              color="secondary"
            >
              EVIDENCE PERIOD
            </Text>
            <Text variant="h3">
              {dateRange.label}
            </Text>
            <Text
              variant="bodySmall"
              color="secondary"
            >
              {dateRange.startDate ||
                'First tracked date'}{' '}
              to{' '}
              {dateRange.endDate ||
                'latest tracked date'}{' '}
              · {frequencyLabel}
            </Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text
              variant="caption"
              color="secondary"
            >
              Income
            </Text>
            <Text variant="h4">
              {formatCurrency(
                summary.income,
                data.user.currency
              )}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text
              variant="caption"
              color="secondary"
            >
              Expenses
            </Text>
            <Text variant="h4">
              {formatCurrency(
                summary.expenses,
                data.user.currency
              )}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text
              variant="caption"
              color="secondary"
            >
              Transactions
            </Text>
            <Text variant="h4">
              {summary.transactionCount}
            </Text>
          </View>
        </View>
      </View>

      {coverage === 'empty' ? (
        <EmptyState
          title="No evidence for this period"
          message="Adjust the Activity period or add tracked transactions before using Insights."
          actionLabel="Open Activity"
          onAction={() =>
            navigation.navigate(
              'Transactions'
            )
          }
        />
      ) : (
        <>
          {coverage === 'partial' ? (
            <View
              accessibilityRole="alert"
              style={[
                styles.coverageNotice,
                {
                  borderColor:
                    colors.statusWarning,
                },
              ]}
            >
              <Text variant="h4">
                Partial category data
              </Text>
              <Text
                variant="bodySmall"
                color="secondary"
                style={styles.sectionCopy}
              >
                Some transactions no longer
                resolve to a category. Totals
                still use transaction amounts,
                but category comparisons need
                review.
              </Text>
            </View>
          ) : coverage ===
            'historical' ? (
            <View
              style={[
                styles.coverageNotice,
                {
                  borderColor:
                    colors.borderDefault,
                },
              ]}
            >
              <Text variant="h4">
                Historical period
              </Text>
              <Text
                variant="bodySmall"
                color="secondary"
                style={styles.sectionCopy}
              >
                These signals describe a
                completed period and are not a
                prediction of current activity.
              </Text>
            </View>
          ) : null}

          {groups.map((group) => (
            <InsightSection
              key={group}
              group={group}
              items={items.filter(
                (item) =>
                  item.group === group
              )}
              onOpen={open}
            />
          ))}
        </>
      )}
      <RootTabBottomSpacer />
    </AppScroll>
  );
};

export const InsightsScreen = () => (
  <RequireData>
    {(data) => (
      <InsightsContent data={data} />
    )}
  </RequireData>
);

const styles = StyleSheet.create({
  insightBlock: {
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  blockLabel: {
    letterSpacing: 0.6,
  },
  evidenceMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  evidenceMetaItem: {
    flexGrow: 1,
    flexBasis: 220,
    minWidth: 0,
    gap: Spacing.xs,
  },
  recommendedAction: {
    borderTopWidth:
      StyleSheet.hairlineWidth,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },

  contextBand: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  contextHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  contextCopy: {
    flex: 1,
    minWidth: 240,
    gap: Spacing.xs,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
    marginTop: Spacing.xl,
  },
  summaryItem: {
    minWidth: 120,
    flexGrow: 1,
    gap: Spacing.xs,
  },
  coverageNotice: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionCopy: {
    marginTop: Spacing.xs,
  },
  itemList: {
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  itemCard: {
    paddingVertical: Spacing.lg,
  },
  itemLayout: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemSummary: {
    marginTop: Spacing.xs,
  },
  evidence: {
    borderTopWidth: 1,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
  },
  evidenceLabel: {
    marginTop: Spacing.md,
  },
  evidenceCopy: {
    marginTop: Spacing.xs,
  },
  itemAction: {
    alignSelf: 'flex-start',
    marginTop: Spacing.lg,
  },
});
