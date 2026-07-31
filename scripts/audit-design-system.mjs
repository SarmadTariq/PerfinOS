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

const obsoleteFiles = [
  'src/theme.ts',
  'src/components/Button.tsx',
  'src/components/Card.tsx',
  'src/components/Input.tsx',
  'src/components/Text.tsx',
];

for (const filePath of obsoleteFiles) {
  if (fs.existsSync(path.join(root, filePath))) {
    fail(`${filePath} must not exist.`);
  }
}

if (
  obsoleteFiles.every(
    (filePath) =>
      !fs.existsSync(path.join(root, filePath)),
  )
) {
  pass('Compatibility shim files are absent.');
}

const themeFiles = walk('src/theme');
const baseFiles = walk('src/components/base');
const brandFiles = walk('src/components/brand');
const authFiles = walk('src/views/auth');
const sharedComponentFiles = [
  'src/components/index.ts',
  'src/components/layout/AppScroll.tsx',
  'src/components/finance/ScreenHeader.tsx',
  'src/components/form/Field.tsx',
  'src/components/form/Segmented.tsx',
  'src/components/form/SelectField.tsx',
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

const runtimeFiles = walk('src').filter(
  (filePath) =>
    !filePath.startsWith('src/theme/'),
);

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

const compatibilityTokenPattern =
  /\bcolors\.(?:bg|bgSecondary|bgTertiary|text|textTertiary|border|borderLight|primary|primarySoft|success|danger|warning|card|surfaceWarm|surfaceBlue)\b/;

for (const filePath of runtimeFiles) {
  const source = read(filePath);

  if (compatibilityTokenPattern.test(source)) {
    fail(
      `${filePath} uses a retired compatibility colour token.`,
    );
  }
}

if (
  runtimeFiles.every(
    (filePath) =>
      !compatibilityTokenPattern.test(
        read(filePath),
      ),
  )
) {
  pass(
    'Runtime source uses semantic colour tokens only.',
  );
}

const colorsSource = read(
  'src/theme/colors.ts',
);

const typesSource = read(
  'src/theme/types.ts',
);

const themeIndexSource = read(
  'src/theme/index.ts',
);

if (
  /\b(?:lightCompatibility|darkCompatibility)\b/.test(
    colorsSource,
  )
) {
  fail(
    'src/theme/colors.ts still defines compatibility aliases.',
  );
}

if (
  /^\s*(?:bg|bgSecondary|bgTertiary|text|textTertiary|border|borderLight|primary|primarySoft|success|danger|warning|card|surfaceWarm|surfaceBlue):\s*string;/m.test(
    typesSource,
  )
) {
  fail(
    'src/theme/types.ts still exposes compatibility aliases.',
  );
}

if (
  /src\/theme\.ts|compatibility shim/i.test(
    themeIndexSource,
  )
) {
  fail(
    'src/theme/index.ts still documents the removed theme shim.',
  );
}

if (
  !/\b(?:lightCompatibility|darkCompatibility)\b/.test(
    colorsSource,
  ) &&
  !/^\s*(?:bg|bgSecondary|bgTertiary|text|textTertiary|border|borderLight|primary|primarySoft|success|danger|warning|card|surfaceWarm|surfaceBlue):\s*string;/m.test(
    typesSource,
  ) &&
  !/src\/theme\.ts|compatibility shim/i.test(
    themeIndexSource,
  )
) {
  pass(
    'Theme contracts expose semantic tokens only.',
  );
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
