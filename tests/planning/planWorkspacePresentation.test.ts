import {
  describe,
  expect,
  it,
} from 'vitest';
import type {
  PlanVersion,
} from '../../src/models/planning';
import {
  PLAN_SAVED_STATE_COPY,
  PLAN_VERSION_EMPTY_COPY,
  planLifecycleActions,
  planDetailOwnershipKey,
  planWorkspaceOwnershipKey,
  planVersionPresentationState,
  shouldApplySavedPlansResult,
} from '../../src/planning/planWorkspacePresentation';

const legacyVersion: PlanVersion = {
  id: 'plan-1-v1',
  userId: 'alice',
  planId: 'plan-1',
  versionNumber: 1,
  createdAt: '2026-07-21T12:00:00.000Z',
  createdBy: 'user',
  sourceRevision: 'pe1-legacy',
  generation: null,
  summary: 'Legacy saved Plan',
  assumptions: [],
  allocations: [],
  commitments: [],
  recommendations: [],
  actionProposals: [],
  validation: {
    schemaVersion: 1,
    state: 'valid',
    validatedAt:
      '2026-07-21T12:00:00.000Z',
    errors: [],
    warnings: [],
  },
};

describe(
  'PF-211 Plan workspace presentation',
  () => {
    it('defines every saved-list recovery state', () => {
      expect(
        PLAN_SAVED_STATE_COPY.loading
      ).toContain('Loading');
      expect(
        PLAN_SAVED_STATE_COPY.signedOut
          .message
      ).toContain('Sign in');
      expect(
        PLAN_SAVED_STATE_COPY.empty
          .message
      ).toContain('immutable');
      expect(
        PLAN_SAVED_STATE_COPY.error
          .message
      ).toContain('try again');
    });

    it('exposes only valid lifecycle controls', () => {
      expect(
        planLifecycleActions('draft')
      ).toEqual(['active', 'archived']);
      expect(
        planLifecycleActions('active')
      ).toEqual([
        'completed',
        'archived',
      ]);
      expect(
        planLifecycleActions('completed')
      ).toEqual(['archived']);
      expect(
        planLifecycleActions('archived')
      ).toEqual([]);
    });

    it('keeps legacy versions readable without provider metadata', () => {
      expect(
        planVersionPresentationState(
          legacyVersion
        )
      ).toEqual({
        hasEvidenceSummary: false,
        hasGenerationMetadata: false,
        emptySections: {
          allocations: true,
          commitments: true,
          recommendations: true,
          proposals: true,
        },
      });
      expect(
        PLAN_VERSION_EMPTY_COPY
          .legacyEvidence
      ).toContain('remains readable');
      expect(
        PLAN_VERSION_EMPTY_COPY
          .manualGeneration
      ).toContain(
        'No model request was made'
      );
    });

    it('states that empty proposals and applied results are not applied', () => {
      expect(
        PLAN_VERSION_EMPTY_COPY.proposals
      ).toContain('No pending');
      expect(
        PLAN_VERSION_EMPTY_COPY
          .appliedActions
      ).toContain('No applied actions');
    });

    it('rejects saved-list results from a stale request or previous account', () => {
      expect(
        shouldApplySavedPlansResult({
          requestId: 2,
          latestRequestId: 2,
          requestedUserId: 'alice',
          currentUserId: 'alice',
        })
      ).toBe(true);
      expect(
        shouldApplySavedPlansResult({
          requestId: 1,
          latestRequestId: 2,
          requestedUserId: 'alice',
          currentUserId: 'alice',
        })
      ).toBe(false);
      expect(
        shouldApplySavedPlansResult({
          requestId: 2,
          latestRequestId: 2,
          requestedUserId: 'alice',
          currentUserId: 'bob',
        })
      ).toBe(false);
      expect(
        shouldApplySavedPlansResult({
          requestId: 2,
          latestRequestId: 2,
          requestedUserId: 'alice',
          currentUserId: null,
        })
      ).toBe(false);
    });

    it('changes ownership keys across accounts and Plan detail', () => {
      expect(
        planWorkspaceOwnershipKey(
          'alice'
        )
      ).not.toBe(
        planWorkspaceOwnershipKey(
          'bob'
        )
      );
      expect(
        planWorkspaceOwnershipKey(
          null
        )
      ).toBe(
        'plan-owner:signed-out'
      );
      expect(
        planDetailOwnershipKey(
          'alice',
          'plan-1'
        )
      ).not.toBe(
        planDetailOwnershipKey(
          'alice',
          'plan-2'
        )
      );
      expect(
        planDetailOwnershipKey(
          'alice',
          'plan-1'
        )
      ).not.toBe(
        planDetailOwnershipKey(
          'bob',
          'plan-1'
        )
      );
    });
  }
);
