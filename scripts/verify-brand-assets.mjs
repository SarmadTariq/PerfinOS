import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const manifestPath = path.join(
  repoRoot,
  'docs',
  'brand',
  'PF-235',
  'manifest.json',
);

const hashFile = async (filePath) => {
  const contents = await readFile(filePath);

  return createHash('sha256')
    .update(contents)
    .digest('hex');
};

const fail = (message) => {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
};

const main = async () => {
  let manifest;

  try {
    const rawManifest = await readFile(manifestPath, 'utf8');
    manifest = JSON.parse(rawManifest);
  } catch (error) {
    throw new Error(
      `Unable to read or parse ${path.relative(repoRoot, manifestPath)}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (manifest?.audit?.status !== 'PASS') {
    fail(
      `Manifest audit status must be PASS. Received: ${String(
        manifest?.audit?.status,
      )}`,
    );
  }

  if (manifest?.canonical_geometry?.ledger_slits !== 2) {
    fail(
      `Manifest must report exactly 2 ledger slits. Received: ${String(
        manifest?.canonical_geometry?.ledger_slits,
      )}`,
    );
  }

  if (!Array.isArray(manifest?.files)) {
    fail('Manifest files field must be an array.');
    return;
  }

  const approvedFiles = manifest.files.filter((entry) => {
    const filePath =
      typeof entry?.path === 'string'
        ? entry.path
        : '';

    return (
      filePath.startsWith('assets/') ||
      filePath.startsWith('src/assets/brand/')
    );
  });

  if (approvedFiles.length === 0) {
    fail('Manifest contains no approved asset paths.');
    return;
  }

  let verifiedCount = 0;

  for (const entry of approvedFiles) {
    const relativePath = entry.path;
    const expectedHash = entry.sha256;

    if (
      typeof relativePath !== 'string' ||
      relativePath.includes('..') ||
      path.isAbsolute(relativePath)
    ) {
      fail(`Unsafe manifest path: ${String(relativePath)}`);
      continue;
    }

    if (
      typeof expectedHash !== 'string' ||
      !/^[a-f0-9]{64}$/i.test(expectedHash)
    ) {
      fail(`Invalid SHA-256 value for ${relativePath}`);
      continue;
    }

    const absolutePath = path.resolve(repoRoot, relativePath);
    const allowedRoots = [
      path.resolve(repoRoot, 'assets'),
      path.resolve(repoRoot, 'src', 'assets', 'brand'),
    ];

    const isInsideAllowedRoot = allowedRoots.some(
      (allowedRoot) =>
        absolutePath === allowedRoot ||
        absolutePath.startsWith(`${allowedRoot}${path.sep}`),
    );

    if (!isInsideAllowedRoot) {
      fail(`Path is outside the approved asset roots: ${relativePath}`);
      continue;
    }

    try {
      const fileStats = await stat(absolutePath);

      if (!fileStats.isFile()) {
        fail(`Not a file: ${relativePath}`);
        continue;
      }
    } catch {
      fail(`Missing asset: ${relativePath}`);
      continue;
    }

    const actualHash = await hashFile(absolutePath);

    if (actualHash !== expectedHash) {
      fail(
        [
          `Hash mismatch: ${relativePath}`,
          `  Expected: ${expectedHash}`,
          `  Actual:   ${actualHash}`,
        ].join('\n'),
      );
      continue;
    }

    verifiedCount += 1;
    console.log(`PASS: ${relativePath}`);
  }

  if (process.exitCode) {
    console.error('\nBrand asset verification failed.');
    return;
  }

  console.log('');
  console.log('Brand asset verification: PASS');
  console.log('Ledger slits: 2');
  console.log(`Verified files: ${verifiedCount}`);
};

main().catch((error) => {
  console.error(
    `FAIL: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
