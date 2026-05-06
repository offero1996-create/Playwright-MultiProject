/**
 * BloomLink - Centralized URLs and origins for test environments.
 * Values are read from environment variables with fallback defaults (staging).
 */

export const urls = {
  /** BloomLink application origin */
  bloomLinkOrigin: process.env.BLOOMLINK_ORIGIN || 'https://corestage-app.bloomlink.bloomifai.com',

  /** Main platform login */
  platformLogin: process.env.BASE_URL || 'https://app-corestage.platform.bloomifai.com/login',

  /** Audio fixture path */
  audioFixturePath: 'projects/BloomLink/test-data/audio/conversation.wav',
};

export default urls;
