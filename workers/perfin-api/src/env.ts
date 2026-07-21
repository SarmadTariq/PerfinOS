export interface Env {
  RECEIPTS: R2Bucket;
  GEMINI_API_KEY?: string;
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
