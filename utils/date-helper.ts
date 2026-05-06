/**
 * Date and time utility functions for test automation.
 */

/**
 * Generate a URL/filename-safe timestamp string for unique test data.
 * Example output: "2026-03-18T10-30-45-123Z"
 */
export function generateTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

/**
 * Calculate milliseconds until the Join button becomes available.
 * Join opens 10 minutes before session start time.
 * @param startTime - Time string in format "HH:MM AM/PM"
 * @returns Milliseconds to wait (0 if already available)
 */
export function msUntilJoinAvailable(startTime: string): number {
  const [time, period] = startTime.split(' ');
  const [h, m] = time.split(':').map(Number);
  const hours24 = h % 12 + (period === 'PM' ? 12 : 0);

  const sessionStart = new Date();
  sessionStart.setHours(hours24, m, 0, 0);

  const joinOpensAt = new Date(sessionStart.getTime() - 10 * 60_000);
  return Math.max(0, joinOpensAt.getTime() - Date.now());
}

/**
 * Format date as MM/DD/YYYY
 */
export function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Get current date formatted as MM/DD/YYYY
 */
export function getCurrentDate(): string {
  return formatDate(new Date());
}
