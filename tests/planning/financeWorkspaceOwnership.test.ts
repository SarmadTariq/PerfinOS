import {
  describe,
  expect,
  it,
} from 'vitest';
import {
  financeWorkspaceOwnershipKey,
} from '../../src/context/financeWorkspaceOwnership';

describe(
  'PF-211 finance workspace ownership',
  () => {
    it('uses distinct keys for signed-out, guest, and remote owners', () => {
      const signedOut =
        financeWorkspaceOwnershipKey({
          remoteUserId: null,
          isAuthenticated: false,
          isGuestSession: false,
        });
      const guest =
        financeWorkspaceOwnershipKey({
          remoteUserId: null,
          isAuthenticated: true,
          isGuestSession: true,
        });
      const alice =
        financeWorkspaceOwnershipKey({
          remoteUserId: 'alice',
          isAuthenticated: true,
          isGuestSession: false,
        });
      const bob =
        financeWorkspaceOwnershipKey({
          remoteUserId: 'bob',
          isAuthenticated: true,
          isGuestSession: false,
        });

      expect(
        new Set([
          signedOut,
          guest,
          alice,
          bob,
        ]).size
      ).toBe(4);
    });

    it('binds remote ownership to the user id', () => {
      expect(
        financeWorkspaceOwnershipKey({
          remoteUserId: 'alice',
          isAuthenticated: false,
          isGuestSession: true,
        })
      ).toBe(
        'finance-owner:remote:alice'
      );
    });
  }
);
