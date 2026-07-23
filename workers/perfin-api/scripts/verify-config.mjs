import {
  readFileSync,
} from 'node:fs';

import {
  resolve,
} from 'node:path';

const workerRoot =
  resolve(
    import.meta.dirname,
    '..'
  );

const config =
  readFileSync(
    resolve(
      workerRoot,
      'wrangler.toml'
    ),
    'utf8'
  );

const requiredSnippets = [
  'name = "perfin-os-local"',
  'PLAN_ENV = "local"',
  '[env.production]',
  'name = "perfin-os"',
  '[env.production.vars]',
  'PLAN_ENV = "production"',
  'GEMINI_MODEL = "gemini-3.5-flash"',
  'head_sampling_rate = 0.1',
  '[env.production.secrets]',
  '"GEMINI_API_KEY"',
  '"FIREBASE_PROJECT_NUMBER"',
  '"ALLOWED_ORIGINS"',
  'PLAN_SESSION_RATE_LIMITER',
  'PLAN_TURN_RATE_LIMITER',
  'PLAN_GENERATE_RATE_LIMITER',
  'PLAN_REVISE_RATE_LIMITER',
];

const missing =
  requiredSnippets.filter(
    (snippet) =>
      !config.includes(
        snippet
      )
  );

if (missing.length > 0) {
  console.error(
    'Missing Worker configuration:',
    missing
  );

  process.exitCode = 1;
} else if (
  /^\s*GEMINI_API_KEY\s*=/m.test(
    config
  )
) {
  console.error(
    'GEMINI_API_KEY must not be assigned in wrangler.toml.'
  );

  process.exitCode = 1;
} else {
  console.log(
    'PASS: Worker environment configuration is valid.'
  );
}
