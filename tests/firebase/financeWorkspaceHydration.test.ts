import {
  describe,
  expect,
  it,
} from 'vitest';
import {
  createFinanceWorkspaceHydrationEpoch,
} from '../../src/context/financeWorkspaceHydrationEpoch';
import {
  createWorkspaceSubscriptionBarrier,
  FINANCE_WORKSPACE_SOURCES,
} from '../../src/services/firebase/workspaceSubscriptionBarrier';

describe('finance workspace hydration coordination', () => {
  it('invalidates callbacks from a prior account epoch', () => {
    const epoch =
      createFinanceWorkspaceHydrationEpoch();
    const alice = epoch.begin('alice');

    expect(epoch.isCurrent(alice)).toBe(
      true
    );

    const bob = epoch.begin('bob');

    expect(epoch.isCurrent(alice)).toBe(
      false
    );
    expect(epoch.isCurrent(bob)).toBe(
      true
    );

    epoch.invalidate(bob);
    expect(epoch.isCurrent(bob)).toBe(
      false
    );
  });

  it('waits for every initial source before releasing a snapshot', () => {
    const barrier =
      createWorkspaceSubscriptionBarrier();

    for (
      const source of
      FINANCE_WORKSPACE_SOURCES.slice(
        0,
        -1
      )
    ) {
      expect(
        barrier.markReady(source)
      ).toBe(false);
    }

    expect(barrier.isReady()).toBe(false);
    expect(
      barrier.markReady('reports')
    ).toBe(true);
    expect(barrier.isReady()).toBe(true);
  });

  it('does not count duplicate callbacks as distinct initial sources', () => {
    const barrier =
      createWorkspaceSubscriptionBarrier();

    expect(
      barrier.markReady('profile')
    ).toBe(false);
    expect(
      barrier.markReady('profile')
    ).toBe(false);
    expect(barrier.isReady()).toBe(false);
  });
});
