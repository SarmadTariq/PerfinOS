export type SensitiveTextKind =
  | 'credential_material'
  | 'email'
  | 'banking_number'
  | 'phone_number'
  | 'street_address'
  | 'text_limit';

const SENSITIVE_TEXT_SCAN_LIMIT =
  4_096;

// Every expression requires a privacy-specific marker or format. In particular,
// currency amounts and ISO dates are intentionally not treated as sensitive text.
const SENSITIVE_TEXT_PATTERNS:
  ReadonlyArray<
    readonly [
      SensitiveTextKind,
      RegExp,
    ]
  > = [
  [
    'credential_material',
    /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/i,
  ],
  [
    'credential_material',
    /\bAIza[0-9A-Za-z_-]{30,}\b/,
  ],
  [
    'credential_material',
    /\bBearer\s+[A-Za-z0-9._~+/-]{8,}={0,2}\b/i,
  ],
  [
    'credential_material',
    /\b(?:api[-_ ]?key|access[-_ ]?token|refresh[-_ ]?token|id[-_ ]?token|session[-_ ]?token|token|authorization|password|secret)\s*(?:[:=]|is)\s*(?:Bearer\s+)?[A-Za-z0-9._~+/-]{8,}={0,2}\b/i,
  ],
  [
    'email',
    /\b[A-Z0-9._%+-]{1,64}@[A-Z0-9.-]{1,253}\.[A-Z]{2,63}\b/i,
  ],
  [
    'banking_number',
    /\b(?:account|routing|transit)\s*(?:number|no\.?|#)\s*[:#=-]?\s*\d(?:[ -]?\d){5,19}\b/i,
  ],
  [
    'banking_number',
    /\b(?:account|routing|transit)\s*[:#=]\s*\d(?:[ -]?\d){5,19}\b/i,
  ],
  [
    'phone_number',
    /\b(?:phone|mobile|tel(?:ephone)?|call|text)\s*(?:number|no\.?|#)?\s*[:#=-]?\s*(?:\+?1[ .-]?)?(?:\(\d{3}\)|\d{3})[ .-]?\d{3}[ .-]?\d{4}\b/i,
  ],
  [
    'phone_number',
    /(?:\+?1[ .-]?)?(?:\(\d{3}\)|\d{3})[ .-]\d{3}[ .-]\d{4}\b/,
  ],
  [
    'street_address',
    /\b\d{1,5}\s+[A-Za-z][A-Za-z.'-]{1,30}(?:\s+[A-Za-z][A-Za-z.'-]{1,30}){0,3}\s+(?:street|st\.?|avenue|ave\.?|road|rd\.?|boulevard|blvd\.?|drive|dr\.?|lane|ln\.?|court|ct\.?|place|pl\.?|parkway|pkwy\.?|way|terrace|terr\.?|crescent|cres\.?)\b/i,
  ],
];

export const detectSensitiveText = (
  value: string
): SensitiveTextKind | null => {
  const normalized =
    value.normalize('NFKC');

  if (
    normalized.length >
    SENSITIVE_TEXT_SCAN_LIMIT
  ) {
    return 'text_limit';
  }

  for (
    const [
      kind,
      pattern,
    ] of SENSITIVE_TEXT_PATTERNS
  ) {
    if (pattern.test(normalized)) {
      return kind;
    }
  }

  return null;
};
