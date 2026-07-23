import type {
  PlanProviderRequest,
} from './provider';

import {
  detectSensitiveText,
} from './privacy';

export type PlanRequestSafetyErrorCode =
  | 'PROMPT_INJECTION_DETECTED'
  | 'REQUEST_UNSUPPORTED'
  | 'SENSITIVE_TEXT_DETECTED';

export class PlanRequestSafetyError
  extends Error {
  constructor(
    readonly code:
      PlanRequestSafetyErrorCode
  ) {
    super(code);
  }
}

const PROMPT_INJECTION_PATTERNS = [
  /\bignore\s+(?:all|any|the|your)?\s*(?:previous|prior|earlier|system|developer)\s+(?:instructions?|messages?|rules?)\b/i,

  /\b(?:reveal|show|print|repeat|expose|return)\s+(?:the\s+)?(?:system|developer|hidden|internal)\s+(?:prompt|message|instructions?|configuration)\b/i,

  /\b(?:override|bypass|disable|break|evade)\s+(?:the\s+)?(?:rules?|policy|policies|guardrails?|restrictions?|safety)\b/i,

  /\b(?:jailbreak|prompt\s*injection|developer\s*mode|system\s*override)\b/i,

  /\b(?:api\s*key|private\s*key|bearer\s*token|authorization\s*header|firebase\s*token|app\s*check\s*token)\b/i,
] as const;

const UNSUPPORTED_REQUEST_PATTERNS = [
  /\b(?:legal|tax|investment|securities|credit|banking)\s+advice\b/i,

  /\b(?:which|what)\s+(?:stock|share|security|crypto|cryptocurrency|bond)\s+(?:should\s+i|to)\s+(?:buy|sell|short|trade)\b/i,

  /\b(?:buy|sell|short|trade)\s+(?:this\s+)?(?:stock|shares?|crypto|cryptocurrency|bond|security)\b/i,

  /\b(?:evade|avoid|hide)\s+(?:tax|taxes|income|assets?)\b/i,

  /\b(?:guaranteed|risk[- ]free)\s+(?:return|investment|profit)\b/i,

  /\b(?:declare|file\s+for)\s+bankruptcy\b/i,

  /\b(?:credit\s+repair|loan\s+approval|debt\s+settlement)\s+(?:strategy|advice|guarantee)\b/i,
] as const;

const requestTextFor = (
  input:
    PlanProviderRequest
): string | null => {
  if (
    input.action === 'turn' &&
    'message' in
      input.request
  ) {
    return input
      .request
      .message;
  }

  if (
    input.action ===
      'revise' &&
    'instruction' in
      input.request
  ) {
    return input
      .request
      .instruction;
  }

  return null;
};

export const assertPlanProviderRequestSafe =
  (
    input:
      PlanProviderRequest
  ): void => {
    const requestText =
      requestTextFor(
        input
      );

    if (!requestText) {
      return;
    }

    const normalized =
      requestText
        .normalize('NFKC')
        .trim();

    if (
      PROMPT_INJECTION_PATTERNS
        .some(
          (pattern) =>
            pattern.test(
              normalized
            )
        )
    ) {
      throw new PlanRequestSafetyError(
        'PROMPT_INJECTION_DETECTED'
      );
    }

    if (
      UNSUPPORTED_REQUEST_PATTERNS
        .some(
          (pattern) =>
            pattern.test(
              normalized
            )
        )
    ) {
      throw new PlanRequestSafetyError(
        'REQUEST_UNSUPPORTED'
      );
    }

    if (
      detectSensitiveText(
        normalized
      ) !== null
    ) {
      throw new PlanRequestSafetyError(
        'SENSITIVE_TEXT_DETECTED'
      );
    }
  };
