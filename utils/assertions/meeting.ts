import { expect, Locator } from '@playwright/test';
import { logAssertion } from './log';

/**
 * Assert recording indicator is visible for a user.
 */
export async function assertRecordingActive(
  recordingIndicator: Locator,
  userLabel?: string,
): Promise<void> {
  const label = userLabel ? `[${userLabel}] Recording indicator` : 'Recording indicator';
  await expect(recordingIndicator, `${label} should be visible`).toBeVisible();
  logAssertion(`${label} is active`);
}

/**
 * Assert the "YOU" participant tile is visible (user is connected).
 */
export async function assertParticipantConnected(
  youTile: Locator,
  userLabel?: string,
): Promise<void> {
  const label = userLabel ? `[${userLabel}] Participant` : 'Participant';
  await expect(youTile, `${label} "YOU" tile should be visible`).toBeVisible();
  logAssertion(`${label} connected (YOU tile visible)`);
}

/**
 * Assert at least one user has active fake audio.
 */
export function assertAudioActive(
  audioResults: Array<{ active: boolean; avgLevel: number }>,
  description?: string,
): void {
  const hasActive = audioResults.some((r) => r.active);
  const label = description || 'At least one user should have active fake audio';
  expect(hasActive, label).toBeTruthy();
  logAssertion(label);
}

/**
 * Assert mic was successfully toggled (state changed after click).
 */
export function assertMicToggled(
  wasMuted: boolean,
  toggledToMuted: boolean,
  userLabel?: string,
): void {
  const label = userLabel ? `[${userLabel}] Mic` : 'Mic';
  expect(wasMuted !== toggledToMuted, `${label} state should change after toggle`).toBeTruthy();
  logAssertion(`${label} toggled: ${wasMuted ? 'MUTED' : 'ACTIVE'} → ${toggledToMuted ? 'MUTED' : 'ACTIVE'}`);
}

/**
 * Assert camera state changed after toggle (button was clickable and state updated).
 */
export function assertCameraToggled(
  stateChanged: boolean,
  userLabel?: string,
): void {
  const label = userLabel ? `[${userLabel}] Camera` : 'Camera';
  expect(stateChanged, `${label} state should change after toggle`).toBeTruthy();
  logAssertion(`${label} toggled successfully`);
}

/**
 * Assert screenshare button was clickable/triggered.
 */
export function assertScreenshareTriggered(
  triggered: boolean,
  userLabel?: string,
): void {
  const label = userLabel ? `[${userLabel}] Screenshare` : 'Screenshare';
  expect(triggered, `${label} button should be visible and clickable`).toBeTruthy();
  logAssertion(`${label} button triggered successfully`);
}

/**
 * Assert an in-call chat message was received by the other participant.
 */
export function assertInCallChatReceived(
  found: boolean,
  messageText: string,
  recipientLabel?: string,
): void {
  const label = recipientLabel
    ? `[${recipientLabel}] should receive chat message: "${messageText}"`
    : `Chat message should be received: "${messageText}"`;
  expect(found, label).toBeTruthy();
  logAssertion(label);
}
