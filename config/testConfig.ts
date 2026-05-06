/**
 * Centralized test configuration constants.
 * Import and use these instead of hardcoding values in pages/tests.
 */

export const testConfig = {
  /**
   * Timeouts used across page objects and tests.
   * All values in milliseconds.
   */
  timeouts: {
    /** Short pause for form field stabilization (after fill/click) */
    tiny: 500,
    /** Wait for dropdown options to load after typing */
    short: 1_000,
    /** Wait for dropdown selection to stabilize / post-save settle */
    medium: 2_000,
    /** Post-navigation page settle */
    navigation: 3_000,
    /** Element visibility checks, heading/button assertions */
    element: 10_000,
    /** Button click timeout, initial loading detection */
    action: 15_000,
    /** Page reload, loading overlay, dashboard ready */
    pageLoad: 30_000,
    /** Loading screen max wait, meeting timer appearance */
    longWait: 60_000,
    /** Session notes / transcription panel wait */
    sessionNotes: 90_000,
    /** Full meeting UI load (WebRTC connection) */
    meetingLoad: 180_000,
    /** End-to-end transcription test suite timeout */
    testSuite: 600_000,
  },

  /**
   * Polling configuration for retry loops.
   */
  polling: {
    /** Interval between Join button poll attempts (ms) */
    joinInterval: 10_000,
    /** Max attempts to find Join button */
    joinMaxAttempts: 20,
    /** Interval between transcription poll attempts (seconds) */
    transcriptionIntervalSec: 10,
    /** Max transcription poll duration (seconds) */
    transcriptionMaxSec: 300,
  },

  /**
   * React-select dropdown interaction delays.
   * These are needed because react-select doesn't expose
   * reliable state; force: true clicks + waits are required.
   */
  reactSelect: {
    /** Wait after clicking dropdown before typing */
    preTypeDelay: 500,
    /** Wait after typing for options to filter */
    optionLoadDelay: 1_000,
    /** Wait after pressing Enter for selection to register */
    postSelectDelay: 2_000,
  },

  /**
   * Retry configuration.
   */
  retry: {
    /** Number of retries in CI */
    ciRetries: 2,
    /** Delay between retries */
    delay: 1_000,
  },
};
