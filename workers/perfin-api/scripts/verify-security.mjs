import {
  execFileSync,
} from 'node:child_process';

import {
  readFileSync,
} from 'node:fs';

import {
  extname,
  resolve,
} from 'node:path';

const repositoryRoot =
  resolve(
    import.meta.dirname,
    '../../..'
  );

const trackedFiles =
  execFileSync(
    'git',
    [
      'ls-files',
      '-z',
    ],
    {
      cwd:
        repositoryRoot,
      encoding:
        'utf8',
    }
  )
    .split('\0')
    .filter(Boolean);

const textExtensions =
  new Set([
    '.ts',
    '.tsx',
    '.js',
    '.mjs',
    '.json',
    '.toml',
    '.md',
    '.yml',
    '.yaml',
    '.txt',
  ]);

const findings = [];

for (
  const relativePath
  of trackedFiles
) {
  if (
    !textExtensions.has(
      extname(relativePath)
    )
  ) {
    continue;
  }

  const absolutePath =
    resolve(
      repositoryRoot,
      relativePath
    );

  let content;

  try {
    content =
      readFileSync(
        absolutePath,
        'utf8'
      );
  } catch {
    continue;
  }

  if (
    /AIza[0-9A-Za-z_-]{30,}/.test(
      content
    )
  ) {
    findings.push(
      `${relativePath}: possible Google API key`
    );
  }

  if (
    /-----BEGIN (?:RSA |EC |)PRIVATE KEY-----/.test(
      content
    )
  ) {
    findings.push(
      `${relativePath}: private key material`
    );
  }

  if (
    relativePath ===
      'workers/perfin-api/wrangler.toml' &&
    /^\s*GEMINI_API_KEY\s*=/m.test(
      content
    )
  ) {
    findings.push(
      `${relativePath}: plaintext Gemini secret`
    );
  }

  if (
    relativePath.startsWith(
      'src/'
    ) &&
    content.includes(
      'GEMINI_API_KEY'
    )
  ) {
    findings.push(
      `${relativePath}: client-side Gemini secret reference`
    );
  }
}

const runtimeFiles =
  trackedFiles.filter(
    (path) =>
      path.startsWith(
        'workers/perfin-api/src/'
      )
  );

for (
  const relativePath
  of runtimeFiles
) {
  const content =
    readFileSync(
      resolve(
        repositoryRoot,
        relativePath
      ),
      'utf8'
    );

  if (
    /generateContent\?key=/.test(
      content
    )
  ) {
    findings.push(
      `${relativePath}: API key placed in provider URL`
    );
  }

  if (
    relativePath.endsWith(
      '/provider.ts'
    ) &&
    /response\.text\s*\(/.test(
      content
    )
  ) {
    findings.push(
      `${relativePath}: provider failure body is read`
    );
  }

  if (
    /console\.(?:log|warn|error)\s*\([^)]*(?:body|message|instruction|evidence|prompt|token|authorization|uid|appId)/is.test(
      content
    )
  ) {
    findings.push(
      `${relativePath}: potentially sensitive logging`
    );
  }
}

const trackedSecretFiles =
  trackedFiles.filter(
    (path) =>
      (
        path.includes(
          '.dev.vars'
        ) ||
        path.match(
          /(^|\/)\.env(?:\.|$)/
        )
      ) &&
      !path.endsWith(
        '.example'
      )
  );

trackedSecretFiles.forEach(
  (path) => {
    findings.push(
      `${path}: tracked local secret file`
    );
  }
);

if (findings.length > 0) {
  console.error(
    findings.join('\n')
  );

  process.exitCode = 1;
} else {
  console.log(
    'PASS: No tracked Worker secret or sensitive-log violations found.'
  );
}
