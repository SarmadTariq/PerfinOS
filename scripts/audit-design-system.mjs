import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const failures = [];

const relative = (filePath) =>
  path.relative(root, filePath).split(path.sep).join('/');

const read = (filePath) =>
  fs.readFileSync(path.join(root, filePath), 'utf8');

const walk = (directory) => {
  const absoluteDirectory = path.join(root, directory);

  if (!fs.existsSync(absoluteDirectory)) {
    return [];
  }

  return fs
    .readdirSync(absoluteDirectory, {
      withFileTypes: true,
    })
    .flatMap((entry) => {
      const absolutePath = path.join(
        absoluteDirectory,
        entry.name,
      );

      if (entry.isDirectory()) {
        return walk(relative(absolutePath));
      }

      return /\.(ts|tsx)$/.test(entry.name)
        ? [relative(absolutePath)]
        : [];
    });
};

const fail = (message) => {
  failures.push(message);
};

const pass = (message) => {
  console.log(`PASS: ${message}`);
};

const rootShims = {
  'src/components/Button.tsx': [
    "export { Button } from './base/Button';",
    "export type { ButtonProps } from './base/Button';",
  ].join('\n'),

  'src/components/Card.tsx': [
    "export { Card } from './base/Card';",
    "export type { CardProps } from './base/Card';",
  ].join('\n'),

  'src/components/Input.tsx': [
    "export { Input } from './base/Input';",
    "export type { InputProps } from './base/Input';",
  ].join('\n'),

  'src/components/Text.tsx': [
    "export { Text } from './base/Text';",
    "export type { TextColor, TextComponentProps, TypographyVariant } from './base/Text';",
  ].join('\n'),
};

for (const [filePath, expected] of Object.entries(rootShims)) {
  const actual = read(filePath).trim();

  if (actual !== expected) {
    fail(`${filePath} is not the approved re-export-only shim.`);
  } else {
    pass(`${filePath} is a re-export-only shim.`);
  }
}

const themeFiles = walk('src/theme');
const baseFiles = walk('src/components/base');
const brandFiles = walk('src/components/brand');
const authFiles = walk('src/views/auth');
const sharedComponentFiles = [
  'src/components/layout/AppScroll.tsx',
  'src/components/finance/ScreenHeader.tsx',
  'src/components/form/Field.tsx',
];

const migratedFinanceFiles = [
  'src/components/finance/ConfirmModal.tsx',
  'src/components/finance/ErrorState.tsx',
  'src/components/finance/Toast.tsx',
  'src/components/finance/BarListChart.tsx',
  'src/components/finance/CategoryBadge.tsx',
  'src/components/finance/LoadingState.tsx',
  'src/components/finance/ProgressBar.tsx',
  'src/components/finance/ChartCard.tsx',
  'src/components/finance/EmptyState.tsx',
  'src/components/finance/IconButton.tsx',
  'src/components/finance/StatCard.tsx',
];


const scopedFiles = [
  ...themeFiles,
  'src/context/ThemeContext.tsx',
  'src/navigation/AppNavigator.tsx',
  ...authFiles,
  ...sharedComponentFiles,
  ...migratedFinanceFiles,
  ...baseFiles,
  ...brandFiles,
  ...Object.keys(rootShims),
];

const rawHexAllowed = new Set([
  'src/theme/colors.ts',
  'src/theme/brand.ts',
  'src/theme/charts.ts',
]);

for (const filePath of scopedFiles) {
  if (rawHexAllowed.has(filePath)) {
    continue;
  }

  const matches =
    read(filePath).match(/#[0-9A-Fa-f]{3,8}\b/g) ?? [];

  if (matches.length > 0) {
    fail(
      `${filePath} contains prohibited raw colours: ${[
        ...new Set(matches),
      ].join(', ')}`,
    );
  }
}

if (
  scopedFiles
    .filter((filePath) => !rawHexAllowed.has(filePath))
    .every(
      (filePath) =>
        !/#[0-9A-Fa-f]{3,8}\b/.test(read(filePath)),
    )
) {
  pass('No prohibited raw colours exist in the foundation scope.');
}

const runtimeFiles = [
  'src/context/ThemeContext.tsx',
  'src/navigation/AppNavigator.tsx',
  ...authFiles,
  ...sharedComponentFiles,
  ...migratedFinanceFiles,
  ...baseFiles,
  ...brandFiles,
  ...Object.keys(rootShims),
];

for (const filePath of runtimeFiles) {
  if (/Colors\.(light|dark)\b/.test(read(filePath))) {
    fail(`${filePath} directly selects Colors.light or Colors.dark.`);
  }
}

if (
  runtimeFiles.every(
    (filePath) =>
      !/Colors\.(light|dark)\b/.test(read(filePath)),
  )
) {
  pass('No scoped runtime file directly selects a palette.');
}

for (const component of ['Button', 'Card', 'Input', 'Text']) {
  const filePath = `src/components/base/${component}.tsx`;
  const source = read(filePath);

  if (!source.includes('useColors()')) {
    fail(`${filePath} does not consume useColors().`);
  }

  if (/useThemeScheme|Colors\./.test(source)) {
    fail(`${filePath} contains legacy runtime colour selection.`);
  }
}

if (
  ['Button', 'Card', 'Input', 'Text'].every((component) => {
    const source = read(
      `src/components/base/${component}.tsx`,
    );

    return (
      source.includes('useColors()') &&
      !/useThemeScheme|Colors\./.test(source)
    );
  })
) {
  pass('All canonical primitives consume useColors().');
}

const themeContext = read('src/context/ThemeContext.tsx');

if (!themeContext.includes('return getThemeColor(scheme);')) {
  fail('ThemeContext does not resolve colours through getThemeColor().');
} else {
  pass('ThemeContext resolves colours through getThemeColor().');
}

for (const filePath of brandFiles) {
  if (/tintColor/.test(read(filePath))) {
    fail(`${filePath} applies tintColor to approved artwork.`);
  }
}

if (
  brandFiles.every(
    (filePath) => !/tintColor/.test(read(filePath)),
  )
) {
  pass('Brand components do not tint approved artwork.');
}

if (failures.length > 0) {
  console.error('\nDesign-system audit: FAIL');

  for (const failure of [...new Set(failures)]) {
    console.error(`- ${failure}`);
  }

  process.exitCode = 1;
} else {
  console.log('\nDesign-system audit: PASS');
  console.log(`Audited files: ${new Set(scopedFiles).size}`);
}
