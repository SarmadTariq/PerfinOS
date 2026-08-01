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
  ScreenHeader,
} from '../../components/finance';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
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
    title: 'Observations',
    description:
      'Descriptive facts from the selected Activity period.',
    icon: 'visibility',
  },
  attention: {
    title: 'Needs review',
    description:
      'Evidence gaps or comparisons worth checking.',
    icon: 'fact-check',
  },
  action: {
    title: 'Next actions',
    description:
      'Supported destinations for an explicit next step.',
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
          <Text
            variant="body"
            color="secondary"
            style={styles.itemSummary}
          >
            {item.summary}
          </Text>

          <View
            style={[
              styles.evidence,
              {
                borderColor:
                  colors.borderSubtle,
              },
            ]}
          >
            <Text
              variant="caption"
              color="secondary"
            >
              DATA USED
            </Text>
            <Text
              variant="bodySmall"
              style={styles.evidenceCopy}
            >
              {item.evidence}
            </Text>
            <Text
              variant="caption"
              color="secondary"
              style={styles.evidenceLabel}
            >
              PERIOD
            </Text>
            <Text
              variant="bodySmall"
              style={styles.evidenceCopy}
            >
              {item.period}
            </Text>
            <Text
              variant="caption"
              color="secondary"
              style={styles.evidenceLabel}
            >
              COMPARISON
            </Text>
            <Text
              variant="bodySmall"
              style={styles.evidenceCopy}
            >
              {item.comparison}
            </Text>
            <Text
              variant="caption"
              color="secondary"
              style={styles.evidenceLabel}
            >
              WHY IT MATTERS
            </Text>
            <Text
              variant="bodySmall"
              style={styles.evidenceCopy}
            >
              {item.whyItMatters}
            </Text>
            <Text
              variant="caption"
              color="secondary"
              style={styles.evidenceLabel}
            >
              BASIS AND UNCERTAINTY
            </Text>
            <Text
              variant="bodySmall"
              style={styles.evidenceCopy}
            >
              Deterministic calculation.{' '}
              {item.uncertainty}
            </Text>
          </View>

          {item.destination &&
          item.actionLabel ? (
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

  const groups: InsightGroup[] = [
    'observation',
    'attention',
    'action',
  ];
  const frequencyLabel =
    frequencyFilter === 'all'
      ? 'All transaction frequencies'
      : frequencyFilter === 'recurring'
        ? 'Recurring transactions'
        : 'One-time transactions';

  return (
    <AppScroll>
      <ScreenHeader
        title="Insights"
        subtitle="A small set of evidence-bound signals and supported next steps."
        action={
          <Button
            label="Activity"
            size="sm"
            variant="secondary"
            onPress={() => navigation.navigate('Transactions')}
          />
        }
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
