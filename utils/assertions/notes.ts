import { expect, Locator } from '@playwright/test';
import { logAssertion } from './log';

/**
 * Assert a notes section (Session Notes, Transcript Notes, Channel Notes) is NOT empty.
 */
export function assertNoteSectionNotEmpty(isEmpty: boolean, sectionName: string): void {
  expect(isEmpty, `${sectionName} should NOT be empty`).toBeFalsy();
  logAssertion(`${sectionName} is not empty`);
}

/**
 * Assert a notes section contains specific content.
 */
export function assertNoteSectionContent(
  actual: string,
  expected: string,
  sectionName: string,
): void {
  expect(actual, `${sectionName} should be "${expected}", got "${actual}"`).toBe(expected);
  logAssertion(`${sectionName} content verified: "${expected}"`);
}

/**
 * Assert the Session Notes panel is visible.
 */
export async function assertSessionNotesPanel(panelLocator: Locator): Promise<void> {
  await expect(panelLocator, 'Session Notes panel should be visible').toBeVisible();
  logAssertion('Session Notes panel is visible');
}
