import type {
  PlanActionProposal,
  PlanActionResult,
} from '../models/planning';
import {
  isPlanActionProposalSupported,
} from './planActionApplication';

export interface PlanActionProgress {
  supportedCount: number;
  appliedCount: number;
  blockedCount: number;
  canceledCount: number;
  partialFailureCount: number;
  nonRetryableFailureCount: number;
  allComplete: boolean;
}

export const summarizePlanActionResults = (
  proposals: readonly PlanActionProposal[],
  results: readonly PlanActionResult[]
): PlanActionProgress => {
  const supported = proposals.filter(isPlanActionProposalSupported);
  const latestByProposal = new Map<string, PlanActionResult>();
  for (const result of results) {
    latestByProposal.set(result.proposalId, result);
  }
  const latest = supported
    .map((proposal) => latestByProposal.get(proposal.id))
    .filter((result): result is PlanActionResult => Boolean(result));
  const count = (status: PlanActionResult['status']) =>
    latest.filter((result) => result.status === status).length;
  const appliedCount = count('success');
  return {
    supportedCount: supported.length,
    appliedCount,
    blockedCount: count('blocked'),
    canceledCount: count('canceled'),
    partialFailureCount: count('partial_failure'),
    nonRetryableFailureCount: count('non_retryable_failure'),
    allComplete:
      supported.length > 0 &&
      appliedCount === supported.length,
  };
};
