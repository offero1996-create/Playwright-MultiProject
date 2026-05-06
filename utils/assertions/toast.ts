import { expect, Page } from '@playwright/test';
import { logAssertion } from './log';

/**
 * Assert a toast message is visible on the page.
 */
export async function assertToastVisible(
  page: Page,
  toastText: string,
  options?: { timeout?: number },
): Promise<void> {
  // Use .first() to handle cases where multiple toasts with the same text appear simultaneously
  const toast = page.getByText(toastText).first();
  await expect(toast, `Toast "${toastText}" should be visible`).toBeVisible(options);
  logAssertion(`Toast visible: "${toastText}"`);
}

/**
 * Assert the "Session notes added successfully" toast appears.
 */
export async function assertSessionNotesSavedToast(
  page: Page,
  options?: { timeout?: number },
): Promise<void> {
  await assertToastVisible(page, 'Session notes added successfully', options);
}
