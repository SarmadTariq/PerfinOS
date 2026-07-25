import { describe, expect, it } from 'vitest';

const { scanPublicSurface } = await import('../../scripts/verify-public-surface.mjs');

const scan = (files: Record<string, string>) =>
  scanPublicSurface(Object.keys(files), (filePath: string) => files[filePath]);

describe('verify-public-surface', () => {
  it('allows curated product and engineering files', () => {
    const findings = scan({
      'README.md': '# PerFin OS\n',
      'src/services/planService.ts': 'export const route = "/plan";\n',
      'docs/architecture/data-flow.md': '# Data Flow\nPublic overview.\n',
    });

    expect(findings).toEqual([]);
  });

  it('flags local execution and internal planning surfaces', () => {
    const findings = scan({
      '.codex/private/production-readiness/report.md': '# private\n',
      'docs/superpowers/specs/example.md': '# Old internal spec\n',
      'docs/planning/PF-213-plan-threat-model-abuse-cost.md': '# Raw threat model\n',
      'CODEX.md': '# agent instructions\n',
    });

    expect(findings.map((finding) => finding.file)).toEqual([
      '.codex/private/production-readiness/report.md',
      'docs/superpowers/specs/example.md',
      'docs/planning/PF-213-plan-threat-model-abuse-cost.md',
      'CODEX.md',
    ]);
  });

  it('flags secrets and private local paths in tracked text', () => {
    const googleApiKey = ['AI', 'za123456789012345678901234567890'].join('');
    const localPath = ['/', 'Users', 'yashkanadhia', 'private', 'package'].join('/');
    const findings = scan({
      'src/config/example.ts': `const key = "${googleApiKey}";\n`,
      'docs/release.md': `Source: ${localPath}\n`,
    });

    expect(findings.map((finding) => finding.reason)).toEqual([
      'Google API key',
      'absolute local path',
    ]);
  });
});
