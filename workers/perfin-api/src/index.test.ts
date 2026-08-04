import {
  describe,
  expect,
  it,
} from 'vitest';

import worker from './index';

describe(
  'worker router hardening',
  () => {
    it(
      'does not return wildcard CORS for unknown preflight routes',
      async () => {
        const response =
          await worker.fetch(
            new Request(
              'https://worker.example/unknown',
              {
                method: 'OPTIONS',
                headers: {
                  Origin:
                    'https://app.example',
                },
              }
            ),
            {} as never
          );

        expect(response.status)
          .toBe(404);
        expect(
          response.headers.get(
            'Access-Control-Allow-Origin'
          )
        ).not.toBe('*');
      }
    );
  }
);
