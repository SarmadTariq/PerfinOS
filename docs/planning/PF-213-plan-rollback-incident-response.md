# PF-213 Plan Rollback And Incident Response

## Rollback

No rollback command in this document is authorization to mutate production.

1. Stop Plan generation at the routing/configuration layer using the approved
   production change process.
2. Preserve existing saved Plans and immutable versions. Do not rewrite history.
3. Revert Worker code, prompt, schema, model, or rules to the last human-approved
   release artifact.
4. Run Worker tests, typecheck, config/security checks, Wrangler dry-run, app
   Plan suites, Firestore emulator tests, and all-platform export.
5. Validate old saved versions, stale evidence, active-Plan conflicts, and
   partially completed action history.
6. Deploy only after authorized review. Record the deployed artifact and
   configuration separately from this local package.

Schema rollback must remain backward-compatible with saved immutable versions.
If compatibility cannot be proved, disable creation/action entry points and
leave existing Plan reading available.

## Incident Response

1. Contain: disable the affected Plan route or provider call without deleting
   evidence.
2. Classify: credential exposure, raw-data logging, provider leakage, unsafe
   output, incorrect write, rate-limit failure, or availability failure.
3. Preserve bounded operational metadata. Do not copy raw prompts, finance data,
   tokens, or provider responses into tickets or chat.
4. Rotate exposed credentials through the authorized console process.
5. Identify affected time window, route, schema/prompt/model version, and
   immutable Plan/action IDs without exposing user content.
6. Correct code/config locally and rerun the complete PF-213 gate.
7. Notify affected users only through an approved incident process with verified
   scope and plain-language impact.
8. Document remaining Unknowns and obtain human release approval.

## Stop Conditions

- Raw production finance data appears in logs or review artifacts.
- A credential is exposed.
- An action result disagrees with its canonical or legacy finance record.
- Provider or platform retention settings cannot support approved product copy.
- A migration would rewrite immutable Plan history.
