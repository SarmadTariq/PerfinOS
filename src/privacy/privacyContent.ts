export interface PrivacyContentItem {
  id: string;
  title: string;
  detail: string;
  status?: string;
}

export interface PrivacyContentSection {
  id: 'required' | 'permissions' | 'ai';
  title: string;
  summary: string;
  items: PrivacyContentItem[];
}

export interface HelpTopic {
  id:
    | 'account'
    | 'data'
    | 'receipts'
    | 'location'
    | 'reports'
    | 'plan'
    | 'insights'
    | 'troubleshooting'
    | 'contact';
  title: string;
  detail: string;
  recovery?: string;
}

export const getPrivacyContent = (
  isGuest: boolean
): PrivacyContentSection[] => [
  {
    id: 'required',
    title: 'Required processing',
    summary:
      'Data needed to run the workspace features you choose.',
    items: [
      {
        id: 'workspace',
        title:
          isGuest
            ? 'Guest workspace data'
            : 'Signed-in workspace data',
        status:
          isGuest
            ? 'Stored on this device'
            : 'Signed-in workspace',
        detail: isGuest
          ? 'Profile preferences, transactions, categories, budgets, goals, recurring items, and reports use local app storage. Guest data is not a synced account.'
          : 'Firebase Authentication identifies the account when configured. Profile and financial preferences, transactions, categories, budgets, goals, recurring items, reports, and saved Plan records use the active signed-in workspace.',
      },
      {
        id: 'financial-records',
        title: 'Financial records',
        status: 'User entered',
        detail:
          'Transaction amounts, merchant text, notes, dates, category selections, payment method, recurring status, and saved location fields support Activity, Dashboard, Reports, Insights, and Plan evidence.',
      },
      {
        id: 'derived',
        title: 'Calculated outputs',
        status: 'Deterministic',
        detail:
          'Reports and Insights calculate aggregate totals and comparisons from stored workspace records. They are not labeled as AI output.',
      },
    ],
  },
  {
    id: 'permissions',
    title: 'Optional permissions',
    summary:
      'Requested only from a workflow that needs them.',
    items: [
      {
        id: 'location',
        title: 'Location',
        status: 'Point of use',
        detail:
          'Current location can prefill a transaction place. Place search can return a place name, address, identifier, type, and coordinates. You can continue with place search or entered location details when current-location permission is unavailable.',
      },
      {
        id: 'receipts',
        title: 'Camera and photo library',
        status: 'Optional',
        detail:
          'Receipt images can be selected for a transaction. Signed-in uploads use the configured receipt service; guest receipt upload is unavailable. You can save a transaction without a receipt.',
      },
    ],
  },
  {
    id: 'ai',
    title: 'Optional AI-assisted features',
    summary:
      'Plan generation is explicit and can fail without changing finance data.',
    items: [
      {
        id: 'plan-input',
        title: 'Plan request',
        status:
          isGuest
            ? 'Signed-in account required'
            : 'Available when configured',
        detail:
          'Plan generation can send bounded financial evidence and the planning text you enter through the app service to Gemini. Do not enter account numbers, credentials, addresses, tax identifiers, or receipt contents.',
      },
      {
        id: 'plan-output',
        title: 'Validated Plan output',
        status: 'Review required',
        detail:
          'Provider output is validated before display. Saved Plans keep versions and evidence references. A proposed finance-data change is not applied until you review and confirm that proposal.',
      },
      {
        id: 'plan-failure',
        title: 'Provider outage',
        status: 'No automatic mutation',
        detail:
          'If generation is unavailable, the request fails and existing transactions, budgets, goals, categories, and active Plans remain unchanged.',
      },
    ],
  },
];

export const getDataRemovalGuidance = (
  isGuest: boolean
) =>
  isGuest
    ? 'Leaving guest mode does not delete stored guest data. To remove all guest workspace data, clear PerFin OS app storage in device or browser settings. Individual supported records can be removed from their product screens.'
    : 'Logging out does not delete cloud data. Individual supported records can be removed from their product screens. This build does not provide verified account-wide deletion or a support request form.';

export const getHelpTopics = (
  isGuest: boolean
): HelpTopic[] => [
  {
    id: 'account',
    title: 'Account and workspace',
    detail: isGuest
      ? 'Guest mode is local and unsynced. Profile shows which values are editable and which account fields are unavailable.'
      : 'Profile separates editable identity fields from read-only authentication and account state. Settings owns financial preferences.',
    recovery:
      'Open Profile for account state, workspace utilities, and confirmed logout.',
  },
  {
    id: 'data',
    title: 'Data and privacy',
    detail:
      getDataRemovalGuidance(isGuest),
    recovery:
      'Use the relevant product screen for supported record deletion. Review confirmation copy before destructive actions.',
  },
  {
    id: 'receipts',
    title: 'Receipts',
    detail:
      'Receipt selection is optional. Signed-in upload can store the image remotely when the service is configured. Transaction records keep receipt metadata and upload state.',
    recovery:
      'If camera or photo access is denied, enable it in system settings or continue without a receipt. Remote receipt deletion is not verified from the app workflow.',
  },
  {
    id: 'location',
    title: 'Location',
    detail:
      'Transactions can store a selected place name, address, identifier, type, coordinates, neighborhood, and source.',
    recovery:
      'If current-location access is denied, use place search or entered location details. Permission changes are managed in system settings.',
  },
  {
    id: 'reports',
    title: 'Reports',
    detail:
      'Monthly Reports are deterministic summaries with period boundaries, data coverage, budget status, and an account-level savings snapshot.',
    recovery:
      'If a report fails, keep the selected month, review Activity data, and generate the preview again. Saving is a separate action.',
  },
  {
    id: 'plan',
    title: 'Plan',
    detail:
      'Plan can use Gemini for an editable planning draft. Saved Plans retain versions. Opening Plan never silently replaces an active Plan, and proposals require confirmation before supported finance-data changes.',
    recovery:
      'Saved Plans remain readable during a provider outage. If generation is unavailable, retry later or continue using deterministic Activity, Budgets, Reports, and Insights.',
  },
  {
    id: 'insights',
    title: 'Insights',
    detail:
      'Insights shows a small deterministic hierarchy for the selected Activity period. It names the evidence, source, and uncertainty.',
    recovery:
      'Adjust Activity filters when the period is empty, partial, or historical.',
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    detail:
      'Check the visible error first. Keep the selected period or draft, confirm network access, and retry only the failed action.',
    recovery:
      'For permission failures, use system settings. For account failures, return to Profile. For missing data, review the source product screen.',
  },
  {
    id: 'contact',
    title: 'Contact',
    detail:
      'This build does not include an in-app support form or verified account-deletion request route.',
    recovery:
      'Use the support channel provided with the build or distribution source. Do not send passwords, tokens, account numbers, or receipt images in a support message.',
  },
];
