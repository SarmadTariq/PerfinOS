import {
  describe,
  expect,
  it,
} from 'vitest';
import {
  getDataRemovalGuidance,
  getHelpTopics,
  getPrivacyContent,
} from '../../src/privacy';

describe('PF-203 privacy and help content', () => {
  it('separates required processing, optional permissions, and optional AI for guest and signed-in workspaces', () => {
    for (const isGuest of [true, false]) {
      const content =
        getPrivacyContent(isGuest);
      expect(
        content.map((section) => section.id)
      ).toEqual([
        'required',
        'permissions',
        'ai',
      ]);
      expect(
        JSON.stringify(content)
      ).toContain(
        isGuest
          ? 'Stored on this device'
          : 'Signed-in workspace'
      );
    }
  });

  it('provides actionable recovery and product-specific guidance', () => {
    const topics = getHelpTopics(false);
    expect(
      topics.map((topic) => topic.id)
    ).toEqual([
      'account',
      'data',
      'receipts',
      'location',
      'reports',
      'plan',
      'insights',
      'troubleshooting',
      'contact',
    ]);
    const copy = JSON.stringify(topics);
    expect(copy).toContain('system settings');
    expect(copy).toContain('account-wide deletion');
    expect(copy).toContain('Gemini');
    expect(copy).toContain('proposals require confirmation');
    expect(copy).toContain('Saved Plans remain readable during a provider outage');
    expect(copy).toContain('Settings owns financial preferences');
    expect(copy).toContain('Monthly Reports are deterministic');
    expect(copy).toContain('Remote receipt deletion is not verified');
    expect(copy).toContain('Activity filters');
  });

  it('states removal limits and avoids stale names or unsupported guarantees', () => {
    const copy = JSON.stringify({
      guest: getPrivacyContent(true),
      signedIn: getPrivacyContent(false),
      guestHelp: getHelpTopics(true),
      signedInHelp: getHelpTopics(false),
      guestRemoval:
        getDataRemovalGuidance(true),
      signedInRemoval:
        getDataRemovalGuidance(false),
    });

    expect(copy).not.toMatch(
      /PlannerChat|AI chat|premium|military-grade|fully confidential|zero retention|never stored|never leaves|we do not sell/i
    );
    expect(copy).not.toMatch(
      /\/Users\/|EXPO_PUBLIC_|project[_ -]?id|api[_ -]?key/i
    );
  });
});
