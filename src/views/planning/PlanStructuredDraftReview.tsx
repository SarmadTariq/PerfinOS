import React from 'react';

import {
  StyleSheet,
  View,
} from 'react-native';

import {
  MaterialIcons,
} from '@expo/vector-icons';

import {
  Card,
  Text,
} from '../../components/base';

import {
  useColors,
} from '../../context/ThemeContext';

import {
  fromMinorUnits,
} from '../../planning/planEvidence';

import type {
  PlanDraftResponse,
} from '../../services/plan';

import type {
  PlanEditableDraft,
} from '../../planning/planDraftAdapter';

import {
  Radius,
  Spacing,
} from '../../theme';

import {
  formatCurrency,
} from '../../utils/format';

interface PlanStructuredDraftReviewProps {
  readonly draft:
    PlanDraftResponse;

  readonly output:
    PlanEditableDraft;
}

const EvidenceRefs = ({
  references,
}: {
  readonly references:
    readonly string[];
}) => (
  <Text
    variant="caption"
    color="tertiary"
    style={styles.evidenceRefs}
  >
    Evidence: {
      references.join(', ')
    }
  </Text>
);

const EmptySection = ({
  message,
}: {
  readonly message:
    string;
}) => (
  <Text
    variant="bodySmall"
    color="tertiary"
  >
    {message}
  </Text>
);

const SectionTitle = ({
  title,
  count,
}: {
  readonly title:
    string;

  readonly count:
    number;
}) => (
  <View style={styles.sectionTitle}>
    <Text variant="h4">
      {title}
    </Text>

    <Text
      variant="caption"
      color="secondary"
    >
      {count}
    </Text>
  </View>
);

export const PlanStructuredDraftReview = ({
  draft,
  output,
}: PlanStructuredDraftReviewProps) => {
  const colors =
    useColors();

  const money = (
    amountMinor:
      number | null
  ) =>
    amountMinor === null
      ? null
      : formatCurrency(
          fromMinorUnits(
            amountMinor,
            output.currency
          ),
          output.currency
        );

  return (
    <View style={styles.stack}>
      <Card>
        <Text
          variant="caption"
          color="secondary"
        >
          Validated draft
        </Text>

        <Text
          variant="h3"
          style={styles.summary}
        >
          {output.summary}
        </Text>

        <Text
          variant="bodySmall"
          color="secondary"
          style={styles.metadata}
        >
          {
            output.periodKind
          } · {
            output.currency
          } · {
            draft.generation.modelId
          }
        </Text>

        <Text
          variant="caption"
          color="tertiary"
          style={styles.metadata}
        >
          Prompt {
            draft.generation
              .promptVersion
          } · Schema {
            draft.generation
              .responseSchemaVersion
          }
        </Text>
      </Card>

      <Card>
        <SectionTitle
          title="Observations"
          count={
            output
              .observations
              .length
          }
        />

        <View style={styles.itemStack}>
          {
            output
              .observations
              .length === 0
              ? (
                  <EmptySection
                    message="No observations were generated."
                  />
                )
              : output
                  .observations
                  .map(
                    (observation) => (
                      <View
                        key={
                          observation.id
                        }
                        style={styles.item}
                      >
                        <Text variant="body">
                          {
                            observation
                              .statement
                          }
                        </Text>

                        <EvidenceRefs
                          references={
                            observation
                              .evidenceRefs
                          }
                        />
                      </View>
                    )
                  )
          }
        </View>
      </Card>

      <Card>
        <SectionTitle
          title="Allocations"
          count={
            output
              .allocations
              .length
          }
        />

        <View style={styles.itemStack}>
          {
            output
              .allocations
              .length === 0
              ? (
                  <EmptySection
                    message="No allocation changes were proposed."
                  />
                )
              : output
                  .allocations
                  .map(
                    (allocation) => (
                      <View
                        key={
                          allocation.id
                        }
                        style={styles.item}
                      >
                        <View style={styles.itemHeader}>
                          <Text variant="body">
                            {
                              allocation
                                .label
                            }
                          </Text>

                          <Text variant="h4">
                            {
                              money(
                                allocation
                                  .amountMinor
                              )
                            }
                          </Text>
                        </View>

                        <Text
                          variant="caption"
                          color="secondary"
                        >
                          {
                            allocation
                              .period
                          }
                        </Text>

                        <EvidenceRefs
                          references={
                            allocation
                              .evidenceRefs
                          }
                        />
                      </View>
                    )
                  )
          }
        </View>
      </Card>

      <Card>
        <SectionTitle
          title="Commitments"
          count={
            output
              .commitments
              .length
          }
        />

        <View style={styles.itemStack}>
          {
            output
              .commitments
              .length === 0
              ? (
                  <EmptySection
                    message="No commitments were generated."
                  />
                )
              : output
                  .commitments
                  .map(
                    (commitment) => (
                      <View
                        key={
                          commitment.id
                        }
                        style={styles.item}
                      >
                        <View style={styles.itemHeader}>
                          <Text variant="body">
                            {
                              commitment
                                .title
                            }
                          </Text>

                          {
                            commitment
                              .amountMinor !==
                              null
                              ? (
                                  <Text variant="h4">
                                    {
                                      money(
                                        commitment
                                          .amountMinor
                                      )
                                    }
                                  </Text>
                                )
                              : null
                          }
                        </View>

                        <Text
                          variant="bodySmall"
                          color="secondary"
                        >
                          {
                            commitment
                              .description
                          }
                        </Text>

                        {
                          commitment
                            .dueDate
                            ? (
                                <Text
                                  variant="caption"
                                  color="secondary"
                                  style={styles.metadata}
                                >
                                  Due {
                                    commitment
                                      .dueDate
                                  }
                                </Text>
                              )
                            : null
                        }

                        <EvidenceRefs
                          references={
                            commitment
                              .evidenceRefs
                          }
                        />
                      </View>
                    )
                  )
          }
        </View>
      </Card>

      <Card>
        <SectionTitle
          title="Recommendations"
          count={
            output
              .recommendations
              .length
          }
        />

        <View style={styles.itemStack}>
          {
            output
              .recommendations
              .length === 0
              ? (
                  <EmptySection
                    message="No recommendations were generated."
                  />
                )
              : output
                  .recommendations
                  .map(
                    (recommendation) => (
                      <View
                        key={
                          recommendation.id
                        }
                        style={styles.item}
                      >
                        <View style={styles.itemHeader}>
                          <Text variant="body">
                            {
                              recommendation
                                .title
                            }
                          </Text>

                          <Text
                            variant="caption"
                            color="secondary"
                          >
                            {
                              recommendation
                                .priority
                            }
                          </Text>
                        </View>

                        <Text
                          variant="bodySmall"
                          color="secondary"
                        >
                          {
                            recommendation
                              .description
                          }
                        </Text>

                        <EvidenceRefs
                          references={
                            recommendation
                              .evidenceRefs
                          }
                        />
                      </View>
                    )
                  )
          }
        </View>
      </Card>

      <Card>
        <SectionTitle
          title="Action proposals"
          count={
            output
              .actionProposals
              .length
          }
        />

        <View
          style={[
            styles.proposalNotice,
            {
              backgroundColor:
                colors.primarySoft,

              borderColor:
                colors.primary,
            },
          ]}
        >
          <MaterialIcons
            name="verified-user"
            size={20}
            color={
              colors.primary
            }
          />

          <Text
            variant="bodySmall"
            style={styles.noticeCopy}
          >
            These are proposals only. Nothing is applied without a later explicit confirmation.
          </Text>
        </View>

        <View style={styles.itemStack}>
          {
            output
              .actionProposals
              .length === 0
              ? (
                  <EmptySection
                    message="No financial actions were proposed."
                  />
                )
              : output
                  .actionProposals
                  .map(
                    (proposal) => (
                      <View
                        key={
                          proposal.id
                        }
                        style={styles.item}
                      >
                        <View style={styles.itemHeader}>
                          <Text variant="body">
                            {
                              proposal
                                .title
                            }
                          </Text>

                          {
                            proposal
                              .proposedAmountMinor !==
                              null
                              ? (
                                  <Text variant="h4">
                                    {
                                      money(
                                        proposal
                                          .proposedAmountMinor
                                      )
                                    }
                                  </Text>
                                )
                              : null
                          }
                        </View>

                        <Text
                          variant="caption"
                          color="secondary"
                        >
                          {
                            proposal.type
                          } · proposal only
                        </Text>

                        <Text
                          variant="bodySmall"
                          color="secondary"
                          style={styles.metadata}
                        >
                          {
                            proposal
                              .description
                          }
                        </Text>

                        <EvidenceRefs
                          references={
                            proposal
                              .evidenceRefs
                          }
                        />
                      </View>
                    )
                  )
          }
        </View>
      </Card>

      {
        output
          .warnings
          .length > 0
          ? (
              <Card>
                <SectionTitle
                  title="Warnings"
                  count={
                    output
                      .warnings
                      .length
                  }
                />

                <View style={styles.itemStack}>
                  {
                    output
                      .warnings
                      .map(
                        (warning) => (
                          <View
                            key={
                              warning.id
                            }
                            style={styles.item}
                          >
                            <Text variant="body">
                              {
                                warning
                                  .message
                              }
                            </Text>

                            <Text
                              variant="caption"
                              color="secondary"
                            >
                              {
                                warning.code
                              }
                            </Text>

                            <EvidenceRefs
                              references={
                                warning
                                  .evidenceRefs
                              }
                            />
                          </View>
                        )
                      )
                  }
                </View>
              </Card>
            )
          : null
      }
    </View>
  );
};

const styles =
  StyleSheet.create({
    stack: {
      gap:
        Spacing.md,
    },

    summary: {
      marginTop:
        Spacing.sm,
    },

    metadata: {
      marginTop:
        Spacing.sm,
    },

    sectionTitle: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      gap:
        Spacing.md,

      marginBottom:
        Spacing.md,
    },

    itemStack: {
      gap:
        Spacing.md,
    },

    item: {
      borderTopWidth:
        1,

      borderTopColor:
        'rgba(127, 127, 127, 0.20)',

      paddingTop:
        Spacing.md,

      gap:
        Spacing.xs,
    },

    itemHeader: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      alignItems:
        'flex-start',

      justifyContent:
        'space-between',

      gap:
        Spacing.md,
    },

    evidenceRefs: {
      marginTop:
        Spacing.xs,
    },

    proposalNotice: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        Spacing.sm,

      borderWidth:
        1,

      borderRadius:
        Radius.sm,

      padding:
        Spacing.md,

      marginBottom:
        Spacing.md,
    },

    noticeCopy: {
      flex:
        1,
    },
  });
