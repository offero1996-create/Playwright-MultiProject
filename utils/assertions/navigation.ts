import { expect, Page } from '@playwright/test';
import { logAssertion } from './log';

/**
 * Assert the current page URL contains the given substring.
 */
export function assertUrlContains(page: Page, substring: string, description?: string): void {
  const url = page.url();
  const label = description || `URL contains "${substring}"`;
  expect(url, `${label}: expected URL to contain "${substring}", got "${url}"`).toContain(substring);
  logAssertion(`${label}: ${url}`);
}

/**
 * Assert the page has been redirected to the appointment page.
 * Convenience wrapper for the most common URL assertion.
 */
export function assertRedirectedToAppointment(page: Page): void {
  assertUrlContains(page, '/appointment', 'Redirected to appointment page');
}
