import { logger } from '../logger';

export function logAssertion(description: string): void {
  logger.info(`[ASSERT PASS] ${description}`);
}
