import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

const read = (path: string): string =>
  readFileSync(join(root, path), 'utf8');

const walk = (directory: string, files: string[] = []): string[] => {
  for (const entry of readdirSync(join(root, directory))) {
    const relative = join(directory, entry);
    const stat = statSync(join(root, relative));

    if (stat.isDirectory()) {
      if (
        [
          '.expo',
          '.git',
          '.test-build',
          'dist',
          'node_modules'
        ].includes(entry)
      ) {
        continue;
      }

      walk(relative, files);
      continue;
    }

    files.push(relative);
  }

  return files;
};

const allowedAsyncStorageWrites = new Map([
  [
    'src/context/ThemeContext.tsx',
    [/AsyncStorage\s*\.\s*setItem\s*\(\s*STORAGE_KEY\s*,\s*m\s*\)/s]
  ],
  [
    'src/repositories/LocalRepository.ts',
    [
      /AsyncStorage\s*\.\s*setItem\s*\(\s*GUEST_STORAGE_NAMESPACE\s*,\s*JSON\.stringify\(data\)\s*\)/s
    ]
  ]
]);

test('firestore rules have explicit recursive default deny', () => {
  const rules = read('firestore.rules');

  assert.match(
    rules,
    /match\s+\/\{document=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s+false;\s*\}/s
  );
  assert.doesNotMatch(
    rules,
    /match\s+\/transactions\/\{documentId\}\s*\{[^}]*allow\s+read:[^}]*allow\s+read:/s
  );
});

test('worker source does not expose wildcard CORS', () => {
  for (const file of walk('workers/perfin-api/src')) {
    if (!file.endsWith('.ts')) continue;

    assert.doesNotMatch(
      read(file),
      /Access-Control-Allow-Origin['"]?\s*[:,]\s*['"]\*/,
      `${file} must not set wildcard CORS`
    );
  }
});

test('AsyncStorage writes stay limited to reviewed non-auth data', () => {
  for (const file of walk('src')) {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;

    let source = read(file);
    for (const allowedPattern of allowedAsyncStorageWrites.get(file) || []) {
      source = source.replace(allowedPattern, '');
    }

    assert.doesNotMatch(
      source,
      /AsyncStorage\s*\.\s*setItem\s*\(/s,
      `${file} must not contain an unreviewed AsyncStorage write`
    );
  }
});

test('background location remains absent from app configuration and source', () => {
  for (const file of [
    'app.json',
    'app.config.ts',
    ...walk('src').filter(
      (sourceFile) =>
        sourceFile.endsWith('.ts') || sourceFile.endsWith('.tsx')
    )
  ]) {
    assert.doesNotMatch(
      read(file),
      /ACCESS_BACKGROUND_LOCATION|UIBackgroundModes|location-always|requestBackgroundPermissionsAsync|startLocationUpdatesAsync|startGeofencingAsync|expo-task-manager|TaskManager/i,
      `${file} must not include background location capability`
    );
  }
});
