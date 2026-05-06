/**
 * Bloomifai - Centralized URLs and origins for test environments.
 * Values are read from environment variables with fallback defaults (staging).
 */

export const urls = {
  /** Bloomifai platform origin */
  platformOrigin: process.env.PLATFORM_ORIGIN || 'https://app-corestage.platform.bloomifai.com',

  /** Main platform login */
  platformLogin: process.env.BASE_URL || 'https://app-corestage.platform.bloomifai.com/login',
};

export default urls;
