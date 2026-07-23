import { describe, expect, it } from 'vitest';
import type {
  PlanActionProposal,
  PlanActionResult,
} from '../../src/models/planning';
import {
  summarizePlanActionResults,
} from '../../src/planning/planActionPresentation';

const proposal = (
  id: string,
  type: PlanActionProposal['type'] = 'budget_adjustment'
): PlanActionProposal => ({
  id,
  schemaVersion: 2,
  type,
  title: id,
  description: id,
  targetEntityId: null,
  proposedAmount: 10,
  effectiveDate: null,
  requiresConfirmation: true,
  executionState: 'proposal_only',
});

const result = (
  proposalId: string,
  status: PlanActionResult['status']
): PlanActionResult => ({
  schemaVersion: 1,
  id: `application-${proposalId}-${status}`,
  userId: 'alice',
  planId: 'plan-1',
  sourceVersionId: 'plan-1-v1',
  proposalId,
  previewFingerprint: 'fingerprint',
  selectionDigest: 'selection',
  actionType: 'total_budget_update',
  targetKind: 'budget',
  targetId: 'budget-1',
  financeDocumentId: 'budget-1',
  targetMonth: '2026-07',
  legacyEntityIndex: 0,
  status,
  failureCode:
    status === 'success' || status === 'canceled'
      ? null
      : 'write_failed',
  retryable: false,
  currency: 'CAD',
  beforeValueMinor: 1_000,
  beforeValueMajor: 10,
  changeValueMinor: 1_000,
  changeValueMajor: 10,
  proposedValueMinor: 2_000,
  proposedValueMajor: 20,
  confirmedEvidenceRevision: 'evidence',
  postEvidenceRevision: 'post-evidence',
  previewRevision: 'preview',
  appliedAt: '2026-07-23T12:00:00.000Z',
});

describe('Plan action result summary', () => {
  it('does not report all complete for mixed or non-success outcomes', () => {
    const proposals = [
      proposal('success'),
      proposal('blocked'),
      proposal('canceled'),
      proposal('partial'),
      proposal('failed'),
      proposal('read-only', 'recurring_review'),
    ];
    const summary = summarizePlanActionResults(proposals, [
      result('success', 'success'),
      result('blocked', 'blocked'),
      result('canceled', 'canceled'),
      result('partial', 'partial_failure'),
      result('failed', 'non_retryable_failure'),
    ]);

    expect(summary).toEqual({
      supportedCount: 5,
      appliedCount: 1,
      blockedCount: 1,
      canceledCount: 1,
      partialFailureCount: 1,
      nonRetryableFailureCount: 1,
      allComplete: false,
    });
  });

  it('uses the latest result for each proposal and requires every supported action to succeed', () => {
    const proposals = [proposal('one'), proposal('two')];
    const summary = summarizePlanActionResults(proposals, [
      result('one', 'blocked'),
      result('one', 'success'),
      result('two', 'success'),
    ]);

    expect(summary).toMatchObject({
      supportedCount: 2,
      appliedCount: 2,
      blockedCount: 0,
      allComplete: true,
    });
  });
});
