import { expect } from '@playwright/test';
import { logAssertion } from './log';

/**
 * Assert a message was sent and tick is visible.
 */
export function assertMessageSent(
  result: { sent: boolean; tick: boolean; tickColor?: string },
  messageText: string,
): void {
  expect(result.sent, `Message "${messageText}" should appear in chat`).toBeTruthy();
  expect(result.tick, `Tick should be visible for "${messageText}"`).toBeTruthy();
  logAssertion(`Message sent with tick: "${messageText}"`);
}

/**
 * Assert a tick mark is visible on a message.
 */
export function assertTickVisible(tickVisible: boolean, description?: string): void {
  const label = description || 'Tick mark should be visible';
  expect(tickVisible, label).toBeTruthy();
  logAssertion(label);
}

/**
 * Assert tick color matches expected value (e.g., gray = delivered).
 */
export function assertTickColor(
  actual: string,
  expected: string,
  description?: string,
): void {
  const label = description || `Tick color should be ${expected}`;
  expect(actual, label).toBe(expected);
  logAssertion(`${label}: ${actual}`);
}

/**
 * Assert tick color changed from a previous value (e.g., gray → blue = read).
 */
export function assertTickColorChanged(
  currentColor: string,
  previousColor: string,
  description?: string,
): void {
  const label = description || `Tick should change from ${previousColor}`;
  expect(
    currentColor !== previousColor,
    `${label}, but it is still ${currentColor}`,
  ).toBeTruthy();
  logAssertion(`${label}: ${previousColor} → ${currentColor}`);
}

/**
 * Assert the double-checkmark SVG path contains both expected segments.
 */
export function assertDoubleCheckmarkSvg(pathD: string): void {
  expect(pathD, 'SVG path should contain M1 6.9 segment').toContain('M1 6.9');
  expect(pathD, 'SVG path should contain M17 1.563 segment').toContain('M17 1.563');
  logAssertion('Double-checkmark SVG path verified');
}

/**
 * Assert a message is right-aligned (outgoing).
 */
export function assertOutgoingMessage(isOutgoing: boolean, messageText: string): void {
  expect(isOutgoing, `"${messageText}" should be right-aligned (outgoing)`).toBeTruthy();
  logAssertion(`Message is outgoing: "${messageText}"`);
}

/**
 * Assert the sidebar unread badge count is at least the expected value.
 */
export function assertUnreadBadgeCount(
  actual: number,
  expectedMin: number,
  description?: string,
): void {
  const label = description || `Unread badge should be >= ${expectedMin}`;
  expect(actual, label).toBeGreaterThanOrEqual(expectedMin);
  logAssertion(`${label}: ${actual}`);
}

/**
 * Assert the sidebar unread badge is NOT present (count is 0).
 * Used to verify sender does not get a self-notification.
 */
export function assertNoUnreadBadge(
  badgeCount: number,
  description?: string,
): void {
  const label = description || 'Sidebar should NOT show unread badge';
  expect(badgeCount, label).toBe(0);
  logAssertion(`${label}: count=${badgeCount}`);
}

/**
 * Assert the sender's unread badge did NOT increase after sending a message.
 * Validates the self-notification bug is not present.
 */
export function assertSenderNotSelfNotified(
  countBefore: number,
  countAfter: number,
  description?: string,
): void {
  const label = description || 'Sender should not receive self-notification';
  expect(
    countAfter,
    `${label} — badge was ${countBefore} before sending, should not increase, but is now ${countAfter}`,
  ).toBeLessThanOrEqual(countBefore);
  logAssertion(`${label}: before=${countBefore}, after=${countAfter}`);
}
