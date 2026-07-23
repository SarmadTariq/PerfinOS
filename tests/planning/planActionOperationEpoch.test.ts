import { describe, expect, it } from 'vitest';
import {
  createPlanActionOperationEpoch,
  planActionOwnerKey,
} from '../../src/planning/planActionOperationEpoch';

describe('Plan action operation epoch', () => {
  it('invalidates an in-flight operation when account ownership changes', async () => {
    const operations = createPlanActionOperationEpoch('alice:plan-1');
    const token = operations.begin();
    let resolveOperation: (() => void) | undefined;
    const operation = new Promise<void>((resolve) => {
      resolveOperation = resolve;
    });

    operations.move('bob:plan-1');
    resolveOperation?.();
    await operation;

    expect(operations.isCurrent(token)).toBe(false);
    expect(operations.isCurrent(operations.begin())).toBe(true);
  });

  it('keeps an operation current when the owner key is unchanged', () => {
    const operations = createPlanActionOperationEpoch('alice:plan-1');
    const token = operations.begin();

    operations.move('alice:plan-1');

    expect(operations.isCurrent(token)).toBe(true);
  });

  it('changes ownership for both account and immutable version transitions', () => {
    expect(
      planActionOwnerKey('alice', 'plan-1', 'plan-1-v1')
    ).not.toBe(
      planActionOwnerKey('alice', 'plan-1', 'plan-1-v2')
    );
    expect(
      planActionOwnerKey('alice', 'plan-1', 'plan-1-v1')
    ).not.toBe(
      planActionOwnerKey('bob', 'plan-1', 'plan-1-v1')
    );
  });
});
