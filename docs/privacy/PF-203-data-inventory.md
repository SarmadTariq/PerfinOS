# PF-203 Verified Data Inventory

Reviewed: 2026-07-23

This is an engineering inventory, not a production configuration attestation
or legal opinion. `Unknown` means the inspected repository cannot prove the
deployed setting.

## Identity And Finance Workspace

| Data class | Collected and purpose | Source and processing | Storage/provider | Retention and deletion | User control and workspace difference | Evidence and Unknowns |
| --- | --- | --- | --- | --- | --- | --- |
| Authentication and account identifiers | Yes, for sign-in, ownership, and authorization. | Firebase sign-in or signup. Remote for signed-in users. | Firebase Authentication; user-scoped Firestore paths use the identifier. | Auth retention and account-wide deletion are Unknown. Logout does not delete. | Guest has no remote account identifier. No in-app account deletion. | `SessionContext`, Firebase auth and path helpers. Deployed auth settings Unknown. |
| Profile and financial preferences | Yes: name, email, phone, currency, monthly income, and monthly budget. | User entry, onboarding, Profile, and Settings. | Guest app storage or user-scoped Firestore workspace when configured. | Persists until changed or app data/account data is removed. Account-wide removal is not implemented. | Profile edits name and phone. Settings edits currency, monthly income, and monthly budget. Email is read-only. | Finance model, Profile, Settings, workspace persistence. Backup/TTL Unknown. |
| Transactions | Yes, for Activity and all finance calculations. | User entry/imported demo data. | Guest app storage or user-scoped Firestore entity plus compatibility document. | Individual delete exists. Remote receipt-object deletion is separate and not called. | Add, edit with limits, and delete. Guest local; signed-in remote. | Transaction model/actions/repositories. Backup recovery Unknown. |
| Categories | Yes, for transaction meaning and comparisons. | Defaults plus user entry. | Guest app storage or user-scoped Firestore. | Defaults protected; user categories archive and restore. | Create/edit/archive/restore. | PF-202 category helpers/actions. |
| Budgets | Yes, for monthly and category comparisons. | User entry and confirmed supported Plan actions. | Guest app storage or user-scoped Firestore. | Replaced by month; account-wide retention Unknown. | User can update budgets. Guest local; signed-in remote. | Budget model/actions and Plan action repository. |
| Savings goals | Yes, for progress and supported Plan actions. | User entry and confirmed supported Plan actions. | Guest app storage or user-scoped Firestore. | Individual delete exists; backup/TTL Unknown. | Create, update, delete. | Finance actions/entity repository. |
| Recurring items | Yes, to display tracked recurring expenses. | User flag and deterministic detection. | Guest app storage or user-scoped Firestore. | Updated with workspace; account-wide retention Unknown. | Status can be updated. | Recurring model, detector, Finance actions. |
| Reports | Yes, aggregate monthly output. | Deterministic local calculation. | Guest app storage or user-scoped Firestore. | One saved report identity per month; report delete is not implemented. | Generate preview and explicitly save. | PF-198 reporting and Finance actions. |
| Insights | Calculated, not separately persisted by PF-199. | Deterministic current Activity-period calculations. | In-memory presentation from workspace records. | Recomputed; no PF-199 insight retention. | Activity filters control period. | PF-199 hierarchy and Insights view. |

## Plan

| Data class | Collected and purpose | Source and processing | Storage/provider | Retention and deletion | User control and workspace difference | Evidence and Unknowns |
| --- | --- | --- | --- | --- | --- | --- |
| Plans | Yes, for saved planning workspace and lifecycle. | Deterministic evidence plus optional provider output and user edits. | Signed-in user-scoped Firestore Plan document. Guest cannot cloud-save Plan history. | Lifecycle can archive; hard delete is not implemented. Retention/backups Unknown. | User explicitly creates, activates, completes, or archives. | Plan models/repository/lifecycle. |
| Plan versions | Yes, immutable history and provenance. | Initial generation and later revisions. | Firestore version subcollection. | Immutable and not user-deletable in app. Retention Unknown. | User can review versions; cannot overwrite history. | PF-211 paths/repository/rules. |
| Proposals | Yes, bounded proposal fields inside a Plan version. | Validated provider output and user selection. | Saved with immutable Plan version. | Follows version retention; hard deletion unavailable. | Review is required before application. | Plan output contracts and action presentation. |
| Applied action results | Yes, audit result for confirmed/blocked/canceled application. | Confirmed user action plus deterministic validation. | Firestore Plan action-result subcollection and action state. | Append-only/immutable in app; retention Unknown. | User initiates or cancels; result cannot be edited. | PF-212 action repository and rules. |
| Coarse planning signals | Yes when minimum evidence is met. | Deterministic aggregation of finance and coarse location evidence. | Sent in bounded Plan evidence; saved output keeps evidence references and summaries. | Follows Plan/provider behavior. Provider retention depends on deployed service and is Unknown. | User chooses Plan generation; can continue without a provider result. | Plan evidence builder/validation and PF-213 docs. |
| AI inputs | Yes for explicit Plan generation: bounded evidence and planning text entered by the user. | App to Worker to Gemini when configured. | Request processing by Cloudflare Worker and Gemini; saved Plan data in Firestore. | Deployed Gemini paid/ZDR status and logs remain Unknown. | Signed-in explicit request. Sensitive-pattern checks can reject input. | Plan API client, gateway, prompt, privacy checks. |
| AI session data | Multi-turn Plan action and bounded turn history are processed. | User revise/turn request through Worker. | Request-time Worker/provider processing; Firestore stores saved Plan versions, not an asserted provider session. | Provider/session retention Unknown. | User explicitly submits each turn. | Worker gateway/provider and Plan API client. |
| Validated outputs | Yes, for display and draft creation. | Gemini response checked against schema, evidence references, safety, and bounds. | Request memory, then saved only when the app saves a Plan/version. | Failed output is rejected; provider logging remains Unknown. | User reviews and edits. | Worker output validation and Plan draft adapter. |
| Saved outputs | Yes: Plan, versions, provenance, evidence summaries, and proposal/result bindings. | User save and lifecycle actions. | User-scoped Firestore. | Archive supported; account-wide/hard deletion and backups Unknown. | Signed-in workspace only. | Plan repositories/rules. |
| Model metadata | Yes: bounded provenance such as model/schema/prompt version and timestamps. | Worker/provider generation. | Saved generation provenance with Plan output. | Follows Plan version retention. | Read-only evidence. | Plan contracts, adapter, repository. |
| Failure states | Yes, bounded error/status codes and local UI state. | App, Worker, provider, persistence. | Mostly transient UI; bounded action outcomes and operational events can persist/log. | Log retention Unknown. | Retry/cancel where exposed. No finance mutation on provider failure. | Plan presentation, gateway, action results. |

## Location And Receipts

| Data class | Collected and purpose | Source and processing | Storage/provider | Retention and deletion | User control and workspace difference | Evidence and Unknowns |
| --- | --- | --- | --- | --- | --- | --- |
| Location permission | Requested only for current-location workflow. | Device OS permission. | OS-managed permission state; app does not persist a Settings toggle. | OS-defined. | User can deny/change in system settings and use search/entered location. | Expo config and location service. |
| Current location | Optional coordinates/address to prefill a transaction place. | Device location and reverse geocoding. | Added to transaction only when user saves it. Guest local or signed-in Firestore. | Follows transaction retention. | Point-of-use action. | Location service and Transaction Form. |
| Searched places | Optional query and returned candidates. | User query through Worker to Google Places. | Request/response processing; selected result may be saved in transaction. | Search-query logs/provider retention Unknown. Google Places storage restrictions require review. | User can use search or entered details. | Location service and Worker Places handler. |
| Place identifiers | Optional selected Place identifier. | Google Places result. | Transaction location record. | Follows transaction; provider terms allow stated identifier exception, but compliance review is pending. | User selects place. | ExpenseLocation model and Places field mask. |
| Addresses | Optional selected/current/entered transaction location. | Device, Places, import, or user. | Transaction record, guest local or Firestore. | Follows transaction; AI safety copy says not to enter addresses in Plan text. | User can edit transaction location. | ExpenseLocation/Transaction Form/Plan privacy checks. |
| Coordinates | Optional selected/current location coordinates. | Device or Places. | Transaction record. | Follows transaction. | User chooses location workflow. | ExpenseLocation and services. |
| Neighborhood context | Optional transaction field and deterministic coarse Plan signal. | Imported/selected location processing. | Transaction plus bounded Plan evidence when eligible. | Follows transaction/Plan; provider retention Unknown for Plan request. | User controls transaction location and Plan request. | Analytics and Plan evidence. |
| Receipt images | Optional image attachment. | Camera/photo library selection. | Local URI until upload; signed-in configured uploads use Cloudflare R2. | R2 lifecycle/backup Unknown. Worker has delete route, but app does not call it from receipt/transaction deletion. | Guest upload unavailable; signed-in user explicitly adds image. | Receipt service, form, Worker R2 handlers. |
| Receipt metadata | Yes when attached: bounded ID, object key, filename, MIME type, size, time, status, error. | App selection/upload. | Transaction record in local/Firestore workspace. | Follows transaction; object metadata may outlive transaction unless remote deletion is separately performed. | User can attach/remove before save and edit within transaction limits. | ReceiptAttachment model and Transaction Form. |
| Upload state | Yes: local/uploading/uploaded/error. | Receipt upload workflow. | Transaction receipt metadata and transient UI. | Follows transaction. | Signed-in only for remote upload; errors are visible. | Receipt service/form. |

## Infrastructure And Operations

| Data class | Collected and purpose | Source and processing | Storage/provider | Retention and deletion | User control and workspace difference | Evidence and Unknowns |
| --- | --- | --- | --- | --- | --- | --- |
| Worker behavior | Authenticates bounded Plan/receipt/place routes, validates input/output, rate limits, and returns generic failures. | App requests. | Cloudflare Worker runtime. | Deployed logs/runtime retention Unknown. | Feature request is explicit; no provider console control in app. | Worker router/gateway/PF-213 docs. |
| R2 behavior | Stores signed-in receipt objects when configured. | Worker upload/download/delete route. | Cloudflare R2. | Lifecycle, cache, backup, location Unknown. Authenticated delete capability exists but lacks verified app call. | No complete in-app remote deletion control. | Worker R2 binding/official research. |
| Firebase products and paths | Authentication, App Check for Plan, and user-scoped Firestore data. | Signed-in app and Worker token verification. | Firebase Authentication/App Check/Firestore. | Location, TTL, backups, recovery, account deletion Unknown. | Individual entity operations exist; account-wide deletion does not. | Firebase client, paths, repositories, rules, Worker verification. |
| Guest local storage | Yes, complete guest workspace. | Guest session. | Device/browser AsyncStorage. | Persists until app storage is cleared; leaving guest mode does not delete it. | Clear app storage in device/browser settings. | Local repository and workspace context. |
| Logging | Bounded Plan operational events and platform logs can occur. | Worker gateway/runtime. | Cloudflare logs when enabled. | Deployed sampling/retention/access Unknown. | No user control. | Operational-event serializer, Worker config, PF-213. |
| Analytics | Product analytics SDK is not present in inspected dependencies. Deterministic finance analytics run locally. | Workspace records. | In-memory/local calculations. | No separate product-analytics retention verified. | Activity filters affect calculations. | Package dependencies and analytics repository. |
| Diagnostics | Error messages/statuses exist; dedicated remote diagnostics service is not verified. | App/Worker failures. | Local UI and platform runtime logs. | Unknown. | Retry/recovery actions where implemented. | Error handling and Worker logs. |
| Crash reporting | Not collected by a verified crash-reporting SDK in this repository. | Not applicable. | None verified. | Not applicable; platform-level collection outside app code Unknown. | No in-app control. | Package/dependency scan. |
| Notifications | Push notification implementation and preference storage are absent. | Not collected by app code. | None verified. | Not applicable. | Settings shows information, not a toggle. | PF-201 inventory/dependency scan. |
| Deletion | Individual transactions, goals, selected entities, categories under safe rules, and R2 Worker objects have code paths. | User actions or server route. | Local/Firebase/R2 depending on object. | Parent Firestore deletion does not prove subcollection deletion. Account-wide orchestration absent. | Controls only where exposed. | Finance actions, entity repository, official provider docs. |
| Retention | No product-wide configured retention policy is proven. | Provider/project configuration. | Firebase, R2, Gemini, Cloudflare logs. | Unknown. | No in-app retention selector. | Repository/config review and official docs. |
| Backup | No deployed backup policy is proven. | Provider configuration. | Firebase/R2/platform. | Unknown. | No in-app control. | Repository/config review. |
| Recovery | Password reset exists; app retry/error recovery exists for selected workflows. Data restore is not implemented. | Firebase Authentication and local UI. | Provider/workspace. | Backup-based recovery Unknown. | Password reset, retries, local re-entry. | Auth flow and product screens. |

## Provider Roles

- Firebase is the signed-in identity and workspace data provider.
- Cloudflare Worker is the authenticated application gateway for Plan,
  receipts, and place search.
- Cloudflare R2 is the optional receipt-object store when configured.
- Google Places supplies selected place-search fields through the Worker.
- Google Gemini supplies optional Plan generation through the Worker.

These roles describe inspected code paths. Deployed region, retention, backup,
billing tier, staff access, and production separation remain Unknown.
