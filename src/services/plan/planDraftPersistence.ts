import type {
  CreatePlanInput,
  PlanVersionCreationResult,
} from '../firebase';

import type {
  PlanEvidenceSnapshot,
} from '../../planning/planEvidence.types';

import {
  buildInitialPlanRecords,
  type PlanEditableDraft,
} from '../../planning/planDraftAdapter';

import type {
  PlanDraftResponse,
} from './planApiClient';

export interface SaveGeneratedPlanDraftInput {
  readonly userId:
    string;

  readonly primaryGoal:
    string;

  readonly evidence:
    PlanEvidenceSnapshot;

  readonly response:
    PlanDraftResponse;

  readonly draft:
    PlanEditableDraft;
}

export interface PlanDraftPersistenceDependencies {
  readonly createPlanRecord?:
    (
      userId: string,
      input:
        CreatePlanInput
    ) => Promise<
      PlanVersionCreationResult
    >;

  readonly now?:
    () => Date;

  readonly idFactory?:
    (
      prefix: string
    ) => string;
}

const defaultIdFactory = (
  prefix: string
): string => {
  const uuid =
    globalThis
      .crypto
      ?.randomUUID?.();

  if (uuid) {
    return `${prefix}-${uuid}`;
  }

  const random =
    Math.random()
      .toString(36)
      .slice(2, 14);

  return `${prefix}-${Date.now()}-${random}`;
};

const defaultCreatePlanRecord =
  async (
    userId: string,
    input:
      CreatePlanInput
  ): Promise<
    PlanVersionCreationResult
  > => {
    const {
      createPlan,
    } =
      await import(
        '../firebase/planRepository'
      );

    return createPlan(
      userId,
      input
    );
  };

export const saveGeneratedPlanDraft =
  async (
    input:
      SaveGeneratedPlanDraftInput,

    dependencies:
      PlanDraftPersistenceDependencies = {}
  ): Promise<
    PlanVersionCreationResult
  > => {
    const userId =
      input.userId.trim();

    if (!userId) {
      throw new Error(
        'Authenticated user id is required'
      );
    }

    const now =
      dependencies.now ??
      (() => new Date());

    const idFactory =
      dependencies.idFactory ??
      defaultIdFactory;

    const createPlanRecord =
      dependencies
        .createPlanRecord ??
      defaultCreatePlanRecord;

    const planId =
      idFactory('plan');

    const versionId =
      idFactory(
        'plan-version'
      );

    const createdAt =
      now().toISOString();

    const records =
      buildInitialPlanRecords({
        userId,

        primaryGoal:
          input.primaryGoal,

        evidence:
          input.evidence,

        response:
          input.response,

        draft:
          input.draft,

        planId,
        versionId,
        createdAt,
      });

    return createPlanRecord(
      userId,
      {
        plan:
          records.plan,

        initialVersion:
          records.version,
      }
    );
  };
