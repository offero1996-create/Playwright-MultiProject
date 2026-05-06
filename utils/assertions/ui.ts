import { expect, Locator } from '@playwright/test';
import { logAssertion } from './log';

/**
 * Assert a locator is visible on the page.
 */
export async function assertVisible(
  locator: Locator,
  description: string,
  options?: { timeout?: number },
): Promise<void> {
  await expect(locator, `${description} should be visible`).toBeVisible(options);
  logAssertion(`${description} is visible`);
}

/**
 * Assert a locator is NOT visible on the page.
 */
export async function assertNotVisible(
  locator: Locator,
  description: string,
  options?: { timeout?: number },
): Promise<void> {
  await expect(locator, `${description} should not be visible`).not.toBeVisible(options);
  logAssertion(`${description} is not visible`);
}

/**
 * Assert a radio/checkbox is checked.
 */
export async function assertChecked(locator: Locator, description: string): Promise<void> {
  await expect(locator, `${description} should be checked`).toBeChecked();
  logAssertion(`${description} is checked`);
}

/**
 * Assert a radio/checkbox is NOT checked.
 */
export async function assertNotChecked(locator: Locator, description: string): Promise<void> {
  await expect(locator, `${description} should not be checked`).not.toBeChecked();
  logAssertion(`${description} is not checked`);
}

/**
 * Assert a locator has a CSS class matching the given pattern.
 */
export async function assertHasClass(
  locator: Locator,
  classPattern: RegExp,
  description: string,
): Promise<void> {
  await expect(locator, `${description} should match class ${classPattern}`).toHaveClass(classPattern);
  logAssertion(`${description} has class matching ${classPattern}`);
}

/**
 * Assert an input has a specific value.
 */
export async function assertHasValue(
  locator: Locator,
  value: string,
  description: string,
): Promise<void> {
  await expect(locator, `${description} should have value "${value}"`).toHaveValue(value);
  logAssertion(`${description} has value "${value}"`);
}

/**
 * Assert two strings are exactly equal.
 */
export function assertTextEquals(actual: string, expected: string, description: string): void {
  expect(actual, `${description}: expected "${expected}", got "${actual}"`).toBe(expected);
  logAssertion(`${description}: "${expected}"`);
}

/**
 * Assert a string contains a substring.
 */
export function assertTextContains(actual: string, substring: string, description: string): void {
  expect(actual, `${description} should contain "${substring}"`).toContain(substring);
  logAssertion(`${description} contains "${substring}"`);
}

/**
 * Assert a numeric value is greater than a minimum.
 */
export function assertCountGreaterThan(actual: number, min: number, description: string): void {
  expect(actual, `${description}: expected > ${min}, got ${actual}`).toBeGreaterThan(min);
  logAssertion(`${description}: ${actual} > ${min}`);
}

/**
 * Assert a value is truthy.
 */
export function assertTruthy(value: unknown, description: string): void {
  expect(value, description).toBeTruthy();
  logAssertion(description);
}

/**
 * Assert a value is falsy.
 */
export function assertFalsy(value: unknown, description: string): void {
  expect(value, description).toBeFalsy();
  logAssertion(description);
}
