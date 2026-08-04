import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ACCOUNT_DELETION_STATUSES,
  buildAccountDeletionDisclosure,
  receiptObjectKeysForDeletion,
} from '../src/services/accountDeletionContracts';

test('account deletion status contract includes resumable partial failure states', () => {
  assert.deepEqual(
    ACCOUNT_DELETION_STATUSES,
    [
      'requested',
      'reauth_required',
      'deleting',
      'partial_failure',
      'remote_complete',
      'identity_complete',
      'complete',
    ]
  );
});

test('account deletion disclosure enumerates data categories without content values', () => {
  const disclosure = buildAccountDeletionDisclosure(false);

  assert.ok(disclosure.title.includes('Delete account'));
  assert.ok(disclosure.categories.includes('Profile and account identity'));
  assert.ok(disclosure.categories.includes('Transactions, budgets, goals, recurring items, and reports'));
  assert.ok(disclosure.categories.includes('Plan drafts, generated versions, and action history'));
  assert.ok(disclosure.categories.includes('Uploaded receipt objects and receipt metadata'));
  assert.equal(disclosure.requiresReauthentication, true);
});

test('guest deletion disclosure is not labelled account deletion', () => {
  const disclosure = buildAccountDeletionDisclosure(true);

  assert.equal(disclosure.title, 'Delete guest data');
  assert.equal(disclosure.requiresReauthentication, false);
  assert.ok(disclosure.categories.includes('Guest workspace data on this device'));
});

test('receipt deletion extracts canonical owned object keys only', () => {
  const keys = receiptObjectKeysForDeletion({
    uid: 'user-1',
    transactions: [
      {
        receipts: [
          {
            objectKey: 'receipts/user-1/tx-1/receipt-1.jpg',
          },
          {
            objectKey: 'receipts/user-2/tx-1/receipt-2.jpg',
          },
          {
            objectKey: 'receipts/user-1/../receipt-3.jpg',
          },
        ],
      },
    ],
  });

  assert.deepEqual(keys, ['receipts/user-1/tx-1/receipt-1.jpg']);
});
