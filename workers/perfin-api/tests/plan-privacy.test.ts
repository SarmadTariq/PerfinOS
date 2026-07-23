import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type {
  Env,
} from '../src/env';

import {
  createPlanActionHandler,
} from '../src/plan/actionHandler';

import {
  PlanOutputValidationError,
  validatePlanProviderResult,
} from '../src/plan/outputValidation';

import {
  detectSensitiveText,
} from '../src/plan/privacy';

import {
  assertPlanProviderRequestSafe,
  PlanRequestSafetyError,
} from '../src/plan/requestSafety';

import {
  PlanRequestValidationError,
  validatePlanActionRequest,
} from '../src/plan/validation';

import type {
  PlanProvider,
} from '../src/plan/provider';

import {
  baselineRevision,
  sessionId,
  validPlanEvidence,
  validPlanProviderResult,
  validPlanStructuredOutput,
} from './plan-fixtures';

const env = {} as Env;

const clone = <Value,>(
  value: Value
): Value =>
  JSON.parse(
    JSON.stringify(value)
  ) as Value;

const turnRequest = (
  message: string
) => ({
  action: 'turn' as const,
  request: {
    schemaVersion: 1 as const,
    sessionId,
    baselineRevision,
    message,
    evidence: validPlanEvidence,
  },
});

const reviseRequest = (
  instruction: string
) => ({
  action: 'revise' as const,
  request: {
    schemaVersion: 1 as const,
    sessionId,
    baselineRevision,
    instruction,
    evidence: validPlanEvidence,
  },
});

const handlerContext = (
  message: string
) => ({
  action: 'turn' as const,
  uid: 'synthetic-user',
  appId: 'synthetic-app',
  requestId: 'synthetic-request',
  bodyBytes: 500,
  body: turnRequest(message).request,
});

const validateOutput = (
  candidate: unknown
) =>
  validatePlanProviderResult({
    action: 'generate',
    request: {
      schemaVersion: 1 as const,
      sessionId,
      baselineRevision,
      evidence: validPlanEvidence,
    },
    result: {
      ...validPlanProviderResult,
      text: JSON.stringify(candidate),
      candidate,
    },
  });

describe(
  'PF-213 bounded sensitive-text detection',
  () => {
    it.each([
      ['email', 'fake.person@example.test'],
      ['credential_material', 'api_key: fake-token-abcdef123456'],
      ['banking_number', 'Routing number: 123456789'],
      ['banking_number', 'Account: 123456789'],
      ['phone_number', 'Phone: 416-555-0100'],
      ['street_address', '123 Test Street'],
    ] as const)(
      'detects fake %s material',
      (expected, value) => {
        expect(
          detectSensitiveText(value)
        ).toBe(expected);
      }
    );

    it(
      'allows ordinary financial amounts and dates',
      () => {
        expect(
          detectSensitiveText(
            'Set a CAD $1,250 budget for 2026-07-21.'
          )
        ).toBeNull();
      }
    );
  }
);

describe(
  'PF-213 request privacy boundary',
  () => {
    it.each([
      turnRequest('Contact fake.person@example.test about my plan.'),
      reviseRequest('Use account number: 123456789 for this revision.'),
    ])(
      'rejects sensitive user text with a safe error code',
      (request) => {
        try {
          assertPlanProviderRequestSafe(request);
          throw new Error('Expected sensitive text rejection');
        } catch (error) {
          expect(error).toBeInstanceOf(
            PlanRequestSafetyError
          );
          expect(
            (error as PlanRequestSafetyError).code
          ).toBe('SENSITIVE_TEXT_DETECTED');
          expect(String(error)).not.toContain(
            'fake.person@example.test'
          );
        }
      }
    );

    it(
      'stops sensitive text before provider invocation',
      async () => {
        const provider: PlanProvider = {
          generate: vi.fn(
            async () => validPlanProviderResult
          ),
        };

        const response =
          await createPlanActionHandler({
            provider,
          })(
            handlerContext(
              'Please call 416-555-0100 about this plan.'
            ),
            env
          );

        expect(response.status).toBe(400);
        expect(provider.generate).not.toHaveBeenCalled();
        expect(await response.json()).toMatchObject({
          error: {
            code: 'REQUEST_UNSUPPORTED',
          },
        });
      }
    );
  }
);

describe(
  'PF-213 evidence and output privacy boundaries',
  () => {
    it.each([
      ['category label', 'categories', 'categoryName'],
      ['area label', 'locations', 'areaLabel'],
    ] as const)(
      'rejects sensitive %s evidence',
      (_label, collection, field) => {
        const evidence = clone(validPlanEvidence);
        evidence[collection][0][field] =
          '123 Test Street';

        expect(() =>
          validatePlanActionRequest(
            'session',
            {
              schemaVersion: 1,
              evidence,
            }
          )
        ).toThrow(PlanRequestValidationError);
      }
    );

    it.each([
      ['email', 'Send to fake.person@example.test.'],
      ['credential material', 'Bearer fake-token-abcdef123456'],
      ['labeled banking number', 'Account number: 123456789'],
      ['phone contact', 'Call 416-555-0100.'],
      ['street address', 'Meet at 123 Test Street.'],
    ] as const)(
      'rejects provider output with fake %s',
      (_label, summary) => {
        const candidate =
          clone(validPlanStructuredOutput);
        candidate.summary = summary;

        expect(() =>
          validateOutput(candidate)
        ).toThrow(PlanOutputValidationError);
      }
    );
  }
);
