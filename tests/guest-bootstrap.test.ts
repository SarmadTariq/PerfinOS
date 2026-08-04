import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEmptyAppData,
} from '../src/services/initialData';
import {
  resolveGuestStorageData,
} from '../src/repositories/guestStorageMigration';

test('first guest launch creates an empty workspace without seeded history', () => {
  const result = resolveGuestStorageData(null);

  assert.equal(result.data.transactions.length, 0);
  assert.equal(result.data.savingsGoals.length, 0);
  assert.equal(result.data.recurringExpenses.length, 0);
  assert.equal(result.data.reports.length, 0);
  assert.notEqual(result.data.user.name, 'Alex Johnson');
  assert.equal(result.recoveryNotice, null);
});

test('corrupt guest JSON returns empty data and a recoverable notice', () => {
  const result = resolveGuestStorageData('{not-json');

  assert.equal(result.data.transactions.length, 0);
  assert.equal(result.data.savingsGoals.length, 0);
  assert.equal(result.data.user.name, 'Guest User');
  assert.match(result.recoveryNotice ?? '', /could not be read/i);
});

test('legacy seeded guest data is cleared without deleting the exact storage namespace', () => {
  const legacySeed = createEmptyAppData({
    userId: 'guest-local',
    name: 'Alex Johnson',
    isGuest: true,
  });
  legacySeed.transactions = [
    {
      id: 'seed-cx-001',
      userId: 'guest-local',
      type: 'income',
      amount: 2600,
      categoryId: 'cat-income',
      categoryName: 'Income',
      merchant: 'Acme Corp',
      date: '2026-08-01',
      notes: 'Bi-weekly paycheck',
      location: {
        name: 'Acme Corp HQ',
        formattedAddress: '130 King St W, Toronto, ON, Canada',
        address: '130 King St W',
        latitude: 43.6477,
        longitude: -79.382,
        source: 'imported',
      },
      paymentMethod: 'Direct Deposit',
      isRecurring: true,
      receipts: [],
      updateCount: 0,
      createdAt: '2026-08-01T12:00:00.000Z',
      updatedAt: '2026-08-01T12:00:00.000Z',
    },
  ];

  const result = resolveGuestStorageData(JSON.stringify(legacySeed));

  assert.equal(result.data.transactions.length, 0);
  assert.equal(result.data.user.name, 'Guest User');
  assert.match(result.recoveryNotice ?? '', /legacy demo/i);
});

test('default product categories do not carry sample monthly budgets', () => {
  const data = createEmptyAppData({
    userId: 'guest-local',
    isGuest: true,
  });

  assert.ok(data.categories.length > 0);
  assert.deepEqual(
    data.categories.map((category) => category.monthlyBudget),
    data.categories.map(() => 0)
  );
});
