import type {
  FinancialPlan,
  PlanStatus,
} from '../../models/planning';

const DAY_IN_MILLISECONDS = 86_400_000;
const MAX_PLAN_DAYS = 31;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T/;

export type PlanLifecycleTargetStatus = Exclude<
  PlanStatus,
  'draft'
>;

const allowedTransitions: Record<
  PlanStatus,
  readonly PlanLifecycleTargetStatus[]
> = {
  draft: ['active', 'archived'],
  active: ['completed', 'archived'],
  completed: ['archived'],
  archived: [],
};

const parseDateOnly = (
  value: string,
  label: string
): Date => {
  if (!DATE_ONLY_PATTERN.test(value)) {
    throw new Error(`${label} must use YYYY-MM-DD format`);
  }

  const [year, month, day] = value
    .split('-')
    .map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  const normalized = date
    .toISOString()
    .slice(0, 10);

  if (normalized !== value) {
    throw new Error(`${label} is not a valid date`);
  }

  return date;
};

const assertIsoDateTime = (
  value: string
): void => {
  if (
    !ISO_DATETIME_PATTERN.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    throw new Error(
      'Plan lifecycle timestamp must be an ISO datetime'
    );
  }
};

export const planDateKeys = (
  startDate: string,
  endDate: string
): string[] => {
  const start = parseDateOnly(
    startDate,
    'Plan start date'
  );

  const end = parseDateOnly(
    endDate,
    'Plan end date'
  );

  if (end.getTime() < start.getTime()) {
    throw new Error(
      'Plan end date cannot precede its start date'
    );
  }

  const dayCount =
    Math.floor(
      (end.getTime() - start.getTime()) /
        DAY_IN_MILLISECONDS
    ) + 1;

  if (dayCount > MAX_PLAN_DAYS) {
    throw new Error(
      `A Plan cannot reserve more than ${MAX_PLAN_DAYS} days`
    );
  }

  return Array.from(
    { length: dayCount },
    (_, index) =>
      new Date(
        start.getTime() +
          index * DAY_IN_MILLISECONDS
      )
        .toISOString()
        .slice(0, 10)
  );
};

export const isPlanStatusTransitionAllowed = (
  currentStatus: PlanStatus,
  targetStatus: PlanLifecycleTargetStatus
): boolean =>
  allowedTransitions[currentStatus].includes(
    targetStatus
  );

export const assertPlanStatusTransition = (
  currentStatus: PlanStatus,
  targetStatus: PlanLifecycleTargetStatus
): void => {
  if (
    !isPlanStatusTransitionAllowed(
      currentStatus,
      targetStatus
    )
  ) {
    throw new Error(
      `Cannot transition Plan from ${currentStatus} to ${targetStatus}`
    );
  }
};

export const transitionPlanLifecycle = (
  plan: FinancialPlan,
  targetStatus: PlanLifecycleTargetStatus,
  occurredAt: string,
  replacedPlanId: string | null
): FinancialPlan => {
  assertIsoDateTime(occurredAt);

  assertPlanStatusTransition(
    plan.status,
    targetStatus
  );

  if (
    targetStatus !== 'active' &&
    replacedPlanId !== null
  ) {
    throw new Error(
      'A replacement Plan may only be supplied during activation'
    );
  }

  if (targetStatus === 'active') {
    return {
      ...plan,
      status: 'active',
      replacedPlanId,
      updatedAt: occurredAt,
      activatedAt: occurredAt,
      completedAt: null,
      archivedAt: null,
    };
  }

  if (targetStatus === 'completed') {
    return {
      ...plan,
      status: 'completed',
      updatedAt: occurredAt,
      completedAt: occurredAt,
      archivedAt: null,
    };
  }

  return {
    ...plan,
    status: 'archived',
    updatedAt: occurredAt,
    archivedAt: occurredAt,
  };
};
