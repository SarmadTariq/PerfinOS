import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyReauthenticationError,
  supportedAuthProviders,
} from '../src/services/firebase/authContracts';

test('email and password is the only supported auth provider', () => {
  assert.deepEqual(
    supportedAuthProviders,
    ['password']
  );
});

test('invalid password reauthentication errors are explicit', () => {
  assert.equal(
    classifyReauthenticationError({
      code: 'auth/wrong-password',
    }),
    'invalid_password'
  );
});

test('missing current user is represented separately from provider errors', () => {
  assert.equal(
    classifyReauthenticationError(null),
    'missing_user'
  );
});
