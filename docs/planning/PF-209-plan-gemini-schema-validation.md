# PF-209 Plan Gemini Schemas and Response Validation

## Purpose

PF-209 defines the boundary between deterministic Plan evidence and Gemini-generated educational planning guidance.

Gemini output is never authoritative by itself.

## Input authority

The application produces deterministic evidence before provider invocation.

The Worker accepts only the versioned evidence contract established by PF-207 and protected by the PF-208 gateway.

The model may explain, organize, recommend review, or propose a user-confirmed action.

The model may not replace authoritative financial values.

## Structured output

Gemini must return application/json matching the Plan response schema.

The structured response contains:

- action
- baseline revision
- currency
- evidence horizon
- summary
- observations
- allocations
- commitments
- recommendations
- action proposals
- warnings

Every generated claim type requires at least one verified evidence reference.

## Money

All generated monetary values use non-negative integer minor units.

Validation rejects:

- unsafe integers
- negative generated amounts
- allocations above available evidence
- commitments above projected recurring evidence
- savings proposals above both available cash and remaining savings evidence
- budget proposals outside supported category and arithmetic bounds

## Actions

Supported proposal types are:

- budget_adjustment
- savings_contribution
- recurring_review

Every proposal must contain:

- requiresConfirmation: true
- executionState: proposal_only

The model cannot report that an action was executed, saved, transferred, scheduled, paid, or applied.

No generated proposal is executable without a later explicit confirmation flow.

## Stale evidence

The Worker rejects output when any of these differ from the submitted evidence:

- baseline revision
- requested action
- currency
- horizon

## Safety

The Worker rejects request text that attempts to:

- override system or developer rules
- reveal hidden prompts or internal configuration
- extract keys or tokens
- request unsupported regulated professional advice
- request direct security or asset trading instructions

The Worker rejects model output containing:

- hidden or internal instructions
- credentials or tokens
- email addresses
- executed-action claims
- unsupported professional advice
- direct stock, security, bond, or cryptocurrency trading instructions
- unsupported proposal types
- unknown evidence references

## Tools

Gemini tools are disabled.

PF-209 does not enable:

- Search
- Maps grounding
- code execution
- URL context
- file search
- function calling

## Version provenance

Successful validated responses record server-owned:

- model ID
- prompt version
- response-schema version
- output-schema version
- attempt count
- generation timestamp

The model does not generate or control these values.

The validated response exposes this generation object for storage with the approved Plan version in the Plan creation and lifecycle work.

## Synthetic evaluations

All evaluation profiles are fabricated and contain no production or user data.

The evaluation suite covers:

- valid planning requests
- prompt injection
- secret extraction
- unsupported advice
- stale evidence
- invalid references
- arithmetic overflow
- missing fields
- executed-action claims
- professional-advice claims
- direct asset-trading instructions
- sensitive output
- automatic execution state
- unsupported action types

## Verification

From workers/perfin-api:

    npm run verify:pf209
    npm run verify:release

From the repository root:

    npm run typecheck
    npm run build
    npm test
    git diff --check
