export interface Env {
  PLAN_ENV?:
    | 'local'
    | 'preview'
    | 'production';

  RECEIPTS: R2Bucket;
  GEMINI_API_KEY?: string;

  GEMINI_MODEL?: string;

  GEMINI_API_BASE?: string;
  GOOGLE_PLACES_API_KEY?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_PROJECT_NUMBER?: string;
  ALLOWED_ORIGINS?: string;

  PLAN_SESSION_RATE_LIMITER?:
    RateLimit;

  PLAN_TURN_RATE_LIMITER?:
    RateLimit;

  PLAN_GENERATE_RATE_LIMITER?:
    RateLimit;

  PLAN_REVISE_RATE_LIMITER?:
    RateLimit;
}
