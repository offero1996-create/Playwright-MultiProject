import { expect } from '@playwright/test';

/**
 * Session Notes validation patterns
 * Verifies structure and semantic content rather than exact text matching
 * because AI-generated notes vary in wording but maintain structure
 */

export interface SessionNotesStructure {
  hasMeetingDetails: boolean;
  hasSummary: boolean;
  hasActionItems: boolean;
  hasKeyDecisions: boolean;
  hasNextSteps: boolean;
  hasRiskIssues: boolean;
  isNotEmpty: boolean;
  minContentLength: number;
}

/**
 * Verify session notes contain required sections
 * @param content - Session notes text content
 * @returns true if all required sections are present
 */
export function validateSessionNotesStructure(content: string): SessionNotesStructure {
  const lowerContent = content.toLowerCase();
  const minLength = 100; // Ensure meaningful content

  return {
    hasMeetingDetails: /meeting details|date\/time|participants|topic/i.test(content),
    hasSummary: /summary|this session|discussion/i.test(content),
    hasActionItems: /action items|task|assigned to/i.test(content),
    hasKeyDecisions: /key decisions|decision|agreed/i.test(content),
    hasNextSteps: /next steps|follow-?up|schedule/i.test(content),
    hasRiskIssues: /risk|issues?|blockers?|concerns?/i.test(content),
    isNotEmpty: content.trim().length > 0,
    minContentLength: content.trim().length,
  };
}

/**
 * Assert that session notes contain all required sections
 * @param content - Session notes text content
 * @param label - Optional label for assertion message
 */
export function assertSessionNotesComplete(
  content: string,
  label: string = 'Session Notes'
): void {
  expect(content.trim().length, `${label} should not be empty`).toBeGreaterThan(0);

  const structure = validateSessionNotesStructure(content);

  expect(structure.hasMeetingDetails, `${label} should contain Meeting Details section`).toBe(true);
  expect(structure.hasSummary, `${label} should contain Summary section`).toBe(true);
  expect(structure.hasActionItems, `${label} should contain Action Items section`).toBe(true);
  expect(structure.hasKeyDecisions, `${label} should contain Key Decisions section`).toBe(true);
  expect(structure.hasNextSteps, `${label} should contain Next Steps section`).toBe(true);
  expect(structure.hasRiskIssues, `${label} should contain Risk/Issues section`).toBe(true);
  expect(
    structure.minContentLength,
    `${label} should have meaningful content (min 100 chars)`
  ).toBeGreaterThan(100);
}

/**
 * Verify session notes contain specific themes/keywords
 * Useful for validating that discussion topics were captured
 * @param content - Session notes text content
 * @param themes - Array of keywords/themes to search for
 * @returns count of matched themes
 */
export function validateSessionNotesThemes(content: string, themes: string[]): {
  matched: string[];
  unmatched: string[];
  matchedCount: number;
} {
  const lowerContent = content.toLowerCase();
  const matched = themes.filter((theme) =>
    new RegExp(`\\b${theme}\\b`, 'i').test(lowerContent)
  );
  const unmatched = themes.filter((theme) => !matched.includes(theme));

  return {
    matched,
    unmatched,
    matchedCount: matched.length,
  };
}

/**
 * Assert session notes contain expected themes
 * @param content - Session notes text content
 * @param themes - Expected themes/keywords
 * @param minMatches - Minimum number of themes that must match (default: all)
 * @param label - Optional label for assertion message
 */
export function assertSessionNotesContainThemes(
  content: string,
  themes: string[],
  minMatches: number = themes.length,
  label: string = 'Session Notes'
): void {
  const result = validateSessionNotesThemes(content, themes);

  expect(
    result.matchedCount,
    `${label} should contain at least ${minMatches} of these themes: ${themes.join(
      ', '
    )}. Matched: ${result.matched.join(', ')}`
  ).toBeGreaterThanOrEqual(minMatches);
}

/**
 * Validate action items are present and assigned
 * @param content - Session notes text content
 * @returns true if action items with assignments are found
 */
export function validateActionItems(content: string): boolean {
  const hasTaskPattern = /task|action|assigned to/i.test(content);
  const hasDueDate = /due by|due date|deadline/i.test(content);
  return hasTaskPattern && hasDueDate;
}

/**
 * Assert action items are properly structured
 * @param content - Session notes text content
 * @param label - Optional label for assertion message
 */
export function assertHasActionItems(
  content: string,
  label: string = 'Session Notes'
): void {
  expect(validateActionItems(content), `${label} should have properly structured action items`).toBe(
    true
  );
}

/**
 * Get summary section from session notes (first paragraph usually)
 * Useful for extracting just the summary for further analysis
 * @param content - Session notes text content
 * @returns summary text or empty string
 */
export function extractSessionSummary(content: string): string {
  const summaryMatch = content.match(
    /summary:?\s*\n?([\s\S]*?)(?=action items|key decisions|next steps|$)/i
  );
  return summaryMatch ? summaryMatch[1].trim() : '';
}

/**
 * Verify transcription keywords are captured in session notes
 * @param content - Session notes text content
 * @param transcriptionKeywords - Keywords from the actual meeting transcription
 * @returns percentage of keywords found (0-100)
 */
export function getTranscriptionCoveragePercentage(
  content: string,
  transcriptionKeywords: string[]
): number {
  if (transcriptionKeywords.length === 0) return 0;

  const lowerContent = content.toLowerCase();
  const found = transcriptionKeywords.filter((keyword) =>
    new RegExp(`\\b${keyword}\\b`, 'i').test(lowerContent)
  );

  return Math.round((found.length / transcriptionKeywords.length) * 100);
}

/**
 * Combined session notes validation — structure + keyword themes.
 * Use this in all session tests to validate AI-generated notes.
 *
 * 1. Structure: verifies required sections (Meeting Details, Summary, Action Items, etc.)
 * 2. Keywords: verifies key discussion themes from the audio appear in the notes
 *
 * @param content - Session notes text content
 * @param label - Optional label for assertion messages
 */
const MEETING_THEMES = ['transcription', 'session', 'compliance', 'privacy', 'automation', 'caregiver'];

/**
 * Combined session notes validation — structure + keyword themes.
 *
 * @param content - Session notes text content
 * @param options.validateStructure - If true, also checks for required sections
 *        (Meeting Details, Summary, Action Items, etc.). Only use when content is
 *        the AI-generated summary, not raw page/transcript text. Default: false.
 * @param options.label - Label for assertion messages
 */
export function assertSessionNotesValid(
  content: string,
  options: { validateStructure?: boolean; label?: string } = {}
): void {
  const { validateStructure = false, label = 'Session Notes' } = options;

  // Structure: all required sections must be present (only for AI-generated summaries)
  if (validateStructure) {
    assertSessionNotesComplete(content, label);
  }

  // Keywords: at least 3 of 6 themes from the audio must appear
  assertSessionNotesContainThemes(content, MEETING_THEMES, 3, label);
}
