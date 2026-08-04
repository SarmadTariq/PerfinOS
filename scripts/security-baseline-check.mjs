import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const read = (path) => readFileSync(join(root, path), 'utf8');

const fail = (message) => {
  throw new Error(message);
};

const walk = (directory, files = []) => {
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

const firestoreRules = read('firestore.rules');

if (
  !/match\s+\/\{document=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s+false;\s*\}/s.test(
    firestoreRules
  )
) {
  fail('firestore.rules must include an explicit recursive default deny rule.');
}

if (
  /match\s+\/transactions\/\{documentId\}\s*\{[^}]*allow\s+read:[^}]*allow\s+read:/s.test(
    firestoreRules
  )
) {
  fail('firestore.rules must not duplicate transaction read grants.');
}

for (const file of walk('workers/perfin-api/src')) {
  if (!file.endsWith('.ts')) continue;

  const source = read(file);
  if (
    /Access-Control-Allow-Origin['"]?\s*[:,]\s*['"]\*/.test(source)
  ) {
    fail(`${file} contains wildcard CORS.`);
  }
}

for (const file of walk('src')) {
  if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;

  let source = read(file);
  for (const allowedPattern of allowedAsyncStorageWrites.get(file) || []) {
    source = source.replace(allowedPattern, '');
  }

  if (/AsyncStorage\s*\.\s*setItem\s*\(/s.test(source)) {
    fail(`${file} contains an unreviewed AsyncStorage write.`);
  }

  if (
    /ACCESS_BACKGROUND_LOCATION|UIBackgroundModes|location-always|requestBackgroundPermissionsAsync|startLocationUpdatesAsync|startGeofencingAsync|expo-task-manager|TaskManager/i.test(
      source
    )
  ) {
    fail(`${file} contains background location capability.`);
  }
}

const appConfigSources = [
  'app.json',
  'app.config.ts'
];

for (const file of appConfigSources) {
  const source = read(file);
  if (
    /ACCESS_BACKGROUND_LOCATION|UIBackgroundModes|location-always|requestBackgroundPermissionsAsync|startLocationUpdatesAsync|startGeofencingAsync|expo-task-manager|TaskManager/i.test(
      source
    )
  ) {
    fail(`${file} contains background location capability.`);
  }
}

const gitignore = read('.gitignore');
for (const pattern of [
  '.env',
  'google-services.json',
  'GoogleService-Info.plist',
  '*.pem',
  '*.key'
]) {
  if (!gitignore.includes(pattern)) {
    fail(`.gitignore must include ${pattern}.`);
  }
}

console.log('Security baseline static checks passed.');
