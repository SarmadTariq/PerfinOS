
import {
  StyleSheet,
  View,
} from 'react-native';

import {
  Card,
  Input,
  Text,
} from '../../components/base';

import type {
  PlanEditableDraft,
} from '../../planning/planDraftAdapter';

import {
  Spacing,
} from '../../theme/index';

interface PlanDraftEditorProps {
  readonly draft:
    PlanEditableDraft;

  readonly onChange:
    (
      draft:
        PlanEditableDraft
    ) => void;
}

export const PlanDraftEditor = ({
  draft,
  onChange,
}: PlanDraftEditorProps) => {
  const updateRecommendation = (
    id: string,
    field:
      'title' |
      'description',
    value: string
  ) => {
    onChange({
      ...draft,

      recommendations:
        draft
          .recommendations
          .map(
            (recommendation) =>
              recommendation.id ===
                id
                ? {
                    ...recommendation,
                    [field]:
                      value,
                  }
                : recommendation
          ),
    });
  };

  const updateProposal = (
    id: string,
    field:
      'title' |
      'description',
    value: string
  ) => {
    onChange({
      ...draft,

      actionProposals:
        draft
          .actionProposals
          .map(
            (proposal) =>
              proposal.id === id
                ? {
                    ...proposal,
                    [field]:
                      value,
                  }
                : proposal
          ),
    });
  };

  return (
    <Card>
      <Text variant="h3">
        Edit draft copy
      </Text>

      <Text
        variant="body"
        color="secondary"
        style={styles.description}
      >
        Edit the summary and explanatory copy before saving. Evidence references, amounts, action types, and confirmation requirements remain locked.
      </Text>

      <View style={styles.section}>
        <Text variant="h4">
          Summary
        </Text>

        <Input
          placeholder="Plan summary"
          value={draft.summary}
          onChangeText={
            (value) =>
              onChange({
                ...draft,
                summary:
                  value,
              })
          }
          multiline
          numberOfLines={5}
          maxLength={1_000}
          accessibilityLabel="Editable Plan summary"
          style={styles.multiline}
        />

        <Text
          variant="caption"
          color="tertiary"
        >
          {
            draft
              .summary
              .length
          }/1000
        </Text>
      </View>

      {
        draft
          .recommendations
          .map(
            (
              recommendation,
              index
            ) => (
              <View
                key={
                  recommendation.id
                }
                style={styles.section}
              >
                <Text variant="h4">
                  Recommendation {
                    index + 1
                  }
                </Text>

                <Input
                  placeholder="Recommendation title"
                  value={
                    recommendation
                      .title
                  }
                  onChangeText={
                    (value) =>
                      updateRecommendation(
                        recommendation.id,
                        'title',
                        value
                      )
                  }
                  maxLength={160}
                  accessibilityLabel={
                    `Recommendation ${index + 1} title`
                  }
                />

                <Input
                  placeholder="Recommendation description"
                  value={
                    recommendation
                      .description
                  }
                  onChangeText={
                    (value) =>
                      updateRecommendation(
                        recommendation.id,
                        'description',
                        value
                      )
                  }
                  multiline
                  numberOfLines={4}
                  maxLength={800}
                  accessibilityLabel={
                    `Recommendation ${index + 1} description`
                  }
                  style={styles.multiline}
                />
              </View>
            )
          )
      }

      {
        draft
          .actionProposals
          .map(
            (
              proposal,
              index
            ) => (
              <View
                key={
                  proposal.id
                }
                style={styles.section}
              >
                <Text variant="h4">
                  Proposal {
                    index + 1
                  } copy
                </Text>

                <Text
                  variant="caption"
                  color="secondary"
                >
                  {
                    proposal.type
                  } · proposal only · confirmation required
                </Text>

                <Input
                  placeholder="Proposal title"
                  value={
                    proposal.title
                  }
                  onChangeText={
                    (value) =>
                      updateProposal(
                        proposal.id,
                        'title',
                        value
                      )
                  }
                  maxLength={160}
                  accessibilityLabel={
                    `Proposal ${index + 1} title`
                  }
                />

                <Input
                  placeholder="Proposal description"
                  value={
                    proposal
                      .description
                  }
                  onChangeText={
                    (value) =>
                      updateProposal(
                        proposal.id,
                        'description',
                        value
                      )
                  }
                  multiline
                  numberOfLines={4}
                  maxLength={800}
                  accessibilityLabel={
                    `Proposal ${index + 1} description`
                  }
                  style={styles.multiline}
                />
              </View>
            )
          )
      }
    </Card>
  );
};

const styles =
  StyleSheet.create({
    description: {
      marginTop:
        Spacing.sm,
    },

    section: {
      gap:
        Spacing.sm,

      marginTop:
        Spacing.xl,
    },

    multiline: {
      minHeight:
        120,
    },
  });
