import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

const read = (path: string): string =>
  readFileSync(join(root, path), 'utf8');

test('release privacy inventory covers required store data categories', () => {
  const inventory = read('docs/release/privacy-data-inventory.md');

  for (const heading of [
    'Crash logs',
    'Diagnostics',
    'Product analytics',
    'AI prompts',
    'AI responses',
    'Support messages',
    'Subscription or purchase records'
  ]) {
    assert.match(
      inventory,
      new RegExp(`^\\\\| ${heading} \\\\|`, 'm'),
      `${heading} must have a privacy inventory row`
    );
  }

  for (const column of [
    'Collected',
    'Required',
    'Linked to identity',
    'Shared',
    'Retention',
    'Deletion path',
    'Encryption',
    'Consent or control',
    'Store disclosure position'
  ]) {
    assert.match(
      inventory,
      new RegExp(`\\\\| ${column} `),
      `${column} must be documented`
    );
  }
});

test('privacy inventory reflects installed telemetry dependencies', () => {
  const inventory = read('docs/release/privacy-data-inventory.md');
  const packageJson = read('package.json');

  assert.doesNotMatch(
    packageJson,
    /firebase\/analytics|@react-native-firebase\/analytics|@react-native-firebase\/crashlytics|sentry|amplitude|posthog/i
  );
  assert.match(
    inventory,
    /\| Crash logs \| No dedicated crash-reporting SDK installed/i
  );
  assert.match(
    inventory,
    /\| Product analytics \| No third-party analytics SDK installed/i
  );
});
