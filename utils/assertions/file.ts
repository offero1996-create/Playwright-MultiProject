import { expect } from '@playwright/test';
import { logAssertion } from './log';

/**
 * Assert a file exists at the given path.
 */
export function assertFileExists(exists: boolean, filePath: string): void {
  expect(exists, `File should exist at ${filePath}`).toBeTruthy();
  logAssertion(`File exists: ${filePath}`);
}

/**
 * Assert two file hashes match (integrity check).
 */
export function assertFileHashMatch(
  actualHash: string,
  expectedHash: string,
  fileName?: string,
): void {
  const label = fileName || 'File';
  expect(actualHash, `${label} hash mismatch: expected ${expectedHash}, got ${actualHash}`).toBe(expectedHash);
  logAssertion(`${label} integrity verified (hash: ${expectedHash})`);
}
