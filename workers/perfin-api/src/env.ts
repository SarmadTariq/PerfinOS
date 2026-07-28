export interface Env {
  PLAN_ENV?:
    | 'local'
    | 'production';

  RECEIPTS: R2Bucket;
  PLAN_PROVIDER_API_KEY?: string;

  PLAN_PROVIDER_MODEL?: string;

  PLAN_PROVIDER_API_BASE?: string;
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
