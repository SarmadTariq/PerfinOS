#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const FORBIDDEN_PATH_SEGMENTS = new Set([
  '.zeref',
  '.zeref-memory',
  '.codex',
  '.claude',
  '.superpowers',
  '.local',
  'memory',
]);

const FORBIDDEN_BASENAMES = new Set([
  'AGENTS.md',
  'CODEX.md',
  'CLAUDE.md',
  'ZEREFOS.md',
]);

const RAW_OPERATIONAL_DOCS = [
  /^docs\/superpowers\//,
  /^docs\/.*\/PF-\d+-.*provider.*research.*\.md$/i,
  /^docs\/.*\/PF-\d+-.*incident.*\.md$/i,
  /^docs\/.*\/PF-\d+-.*threat.*model.*\.md$/i,
  /^docs\/.*\/PF-\d+-.*engineering.*gaps.*\.md$/i,
  /^docs\/.*\/PF-\d+-.*data.*inventory.*\.md$/i,
];

const SECRET_CONTENT_PATTERNS = [
  { pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, reason: 'private key material' },
  { pattern: /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{16,}\b/, reason: 'provider token' },
  { pattern: /\bsk-proj-[A-Za-z0-9_-]{16,}\b/, reason: 'OpenAI project key' },
  { pattern: /\bAIza[0-9A-Za-z_-]{20,}\b/, reason: 'Google API key' },
  {
    pattern: /(?:^|\n)\s*(?:EXPO_PUBLIC_)?(?:FIREBASE|CLOUDFLARE|GEMINI|GOOGLE|R2)_[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)[^\S\r\n]*=[^\S\r\n]*(?!$|["']?(?:replace|your|example|todo|dummy|placeholder|changeme|local|development|test-only|<))[^#\s]+/im,
    reason: 'environment secret assignment',
  },
];

const PRIVATE_CONTENT_PATTERNS = [
  { pattern: /\/Users\/[^/\s]+/, reason: 'absolute local path' },
  { pattern: /\bPerFin_OS_Final_Production_Readiness_Codex_Handoff\b/, reason: 'private handoff package reference' },
  { pattern: /\bZeref OS\b.*\bexecution\b/i, reason: 'AI operation instruction content' },
];

const TEXT_EXTENSIONS = new Set([
  '.cjs',
  '.css',
  '.env',
  '.example',
  '.firebaserc',
  '.html',
  '.js',
  '.json',
  '.jsonc',
  '.jsx',
  '.md',
  '.mjs',
  '.rules',
  '.svg',
  '.toml',
  '.ts',
  '.tsx',
  '.txt',
  '.xml',
  '.yaml',
  '.yml',
]);

const splitPath = (filePath) => filePath.split('/').filter(Boolean);

const extensionOf = (filePath) => {
  const name = filePath.split('/').pop() ?? filePath;
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot);
};

const isTextFile = (filePath) => {
  if (filePath === '.gitignore' || filePath === '.npmrc') {
    return true;
  }

  return TEXT_EXTENSIONS.has(extensionOf(filePath));
};

export const scanPublicSurface = (files, readFile) => {
  const findings = [];

  for (const filePath of files) {
    const normalizedPath = filePath.replaceAll('\\', '/');
    const segments = splitPath(normalizedPath);
    const basename = segments.at(-1) ?? normalizedPath;

    for (const segment of segments) {
      if (FORBIDDEN_PATH_SEGMENTS.has(segment)) {
        findings.push({
          file: normalizedPath,
          reason: `forbidden public path segment: ${segment}`,
        });
        break;
      }
    }

    if (FORBIDDEN_BASENAMES.has(basename)) {
      findings.push({
        file: normalizedPath,
        reason: `forbidden AI operation file: ${basename}`,
      });
    }

    if (/handoff|agent[-_ ]?report|session[-_ ]?report|private[-_ ]?architecture|raw[-_ ]?security/i.test(basename)) {
      findings.push({
        file: normalizedPath,
        reason: 'forbidden operational report filename',
      });
    }

    if (RAW_OPERATIONAL_DOCS.some((pattern) => pattern.test(normalizedPath))) {
      findings.push({
        file: normalizedPath,
        reason: 'raw internal planning, provider, incident, threat, or data-inventory document',
      });
    }

    if (!isTextFile(normalizedPath)) {
      continue;
    }

    let text;
    try {
      text = readFile(normalizedPath);
    } catch {
      findings.push({
        file: normalizedPath,
        reason: 'tracked file could not be read for public-surface scan',
      });
      continue;
    }

    for (const { pattern, reason } of SECRET_CONTENT_PATTERNS) {
      if (pattern.test(text)) {
        findings.push({ file: normalizedPath, reason });
      }
    }

    for (const { pattern, reason } of PRIVATE_CONTENT_PATTERNS) {
      if (pattern.test(text)) {
        findings.push({ file: normalizedPath, reason });
      }
    }
  }

  return findings;
};

const loadTrackedFiles = (cwd) =>
  execFileSync('git', ['-C', cwd, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
    .split('\0')
    .filter((filePath) => filePath && existsSync(filePath));

const runCli = () => {
  const cwd = process.cwd();
  const files = loadTrackedFiles(cwd);
  const findings = scanPublicSurface(files, (filePath) => readFileSync(filePath, 'utf8'));

  if (findings.length === 0) {
    console.log('Public-surface scan passed: no forbidden tracked files or content patterns found.');
    return;
  }

  console.error('Public-surface scan failed:');
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.reason}`);
  }
  process.exitCode = 1;
};

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  runCli();
}
