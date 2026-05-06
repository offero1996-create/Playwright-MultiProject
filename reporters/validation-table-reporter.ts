import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
  TestStep,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

interface ValidationEntry {
  category: string;
  validation: string;
  status: 'PASS' | 'FAIL';
  duration: string;
  error?: string;
}

/**
 * Custom Playwright Reporter that generates a validation table in the HTML report.
 * Collects all test.step() results and console assertion logs, then creates
 * an HTML table attachment showing all validations with pass/fail status.
 * 
 * NOTE: This reporter is disabled when running from VS Code Test Explorer
 * to prevent result parsing issues.
 */
export default class ValidationTableReporter implements Reporter {
  private outputDir: string = '';
  private disabled: boolean = false;

  onBegin(config: FullConfig, suite: Suite) {
    // Disable reporter for VS Code Test Explorer to prevent hanging on failed tests
    // The extension uses specific env vars and communicates via protocol that can hang
    // if attachments are modified during test result processing
    if (process.env.VSCODE_PID || process.env.VSCODE_CWD || process.env.VSCODE_IPC_HOOK) {
      this.disabled = true;
      return;
    }

    // Get output folder from HTML reporter config
    try {
      const htmlReporter = config.reporter.find(
        (r) => Array.isArray(r) && r[0] === 'html'
      );
      if (htmlReporter && Array.isArray(htmlReporter) && htmlReporter[1]?.outputFolder) {
        this.outputDir = htmlReporter[1].outputFolder;
      }
    } catch {
      // Ignore config parsing errors
    }
  }

  onTestEnd(test: TestCase, result: TestResult) {
    // Skip all processing if disabled (VS Code Test Explorer)
    if (this.disabled) {
      return;
    }

    // Wrap everything in try-catch to never block test results
    try {
      this.processTestResult(test, result);
    } catch {
      // Silently ignore all errors - never block test results
    }
  }

  private processTestResult(test: TestCase, result: TestResult): void {
    const validations: ValidationEntry[] = [];
    let htmlTable: string;

    try {
      // Extract validations from test steps (guard for unexpected shapes)
      const steps = (result as any).steps;
      if (steps && Array.isArray(steps)) {
        this.collectStepValidations(steps, validations);
      }

      // Extract validations from stdout (console logs with [ASSERT PASS])
      const stdout = (result as any).stdout;
      if (stdout && Array.isArray(stdout)) {
        this.collectConsoleValidations(stdout, validations);
      }

      // Generate HTML table
      htmlTable = this.generateHtmlTable(
        String(test.title || 'Unknown Test'),
        validations,
        String(result.status || 'unknown')
      );
    } catch (err) {
      // Fall back to simple error attachment
      const message = this.safeErrorMessage(err);
      htmlTable = `<!DOCTYPE html>
<html lang="en">
  <head><meta charset="UTF-8"><title>Validation Summary Error</title></head>
  <body>
    <h2>Validation Table Reporter Error</h2>
    <p>Reporter failed while processing this test.</p>
    <pre>${this.escapeHtml(message)}</pre>
  </body>
</html>`;
    }

    // Attach to test result - wrap in try to never fail
    try {
      if (result.attachments && Array.isArray(result.attachments)) {
        result.attachments.push({
          name: 'Validation Summary',
          contentType: 'text/html',
          body: Buffer.from(htmlTable),
        });
      }
    } catch {
      // Ignore attachment errors
    }

    // Save as standalone file in report folder - wrap in try to never fail
    if (this.outputDir && validations.length > 0) {
      try {
        const safeTitle = String(test.title || 'test')
          .replace(/[^a-z0-9]/gi, '-')
          .substring(0, 50);
        const filePath = path.join(this.outputDir, `validation-table-${safeTitle}.html`);
        fs.mkdirSync(this.outputDir, { recursive: true });
        fs.writeFileSync(filePath, htmlTable);
      } catch {
        // Ignore write errors
      }
    }
  }

  private safeErrorMessage(err: unknown): string {
    try {
      if (err instanceof Error) return err.message;
      return String(err);
    } catch {
      return 'Unknown error';
    }
  }

  private collectStepValidations(steps: TestStep[], validations: ValidationEntry[], parentCategory = '') {
    if (!Array.isArray(steps)) return;

    for (const step of steps) {
      try {
        if (!step || typeof step.title !== 'string') continue;

        const titleLower = step.title.toLowerCase();
        const isValidationStep =
          titleLower.includes('verify') ||
          titleLower.includes('assert') ||
          titleLower.includes('validate') ||
          titleLower.includes('check') ||
          step.category === 'expect';

        if (isValidationStep || step.category === 'test.step') {
          const category = this.extractCategory(step.title) || parentCategory || 'General';
          const hasError = !!(step as any).error;
          const status = hasError ? 'FAIL' : 'PASS';
          const duration = typeof step.duration === 'number' ? `${step.duration}ms` : '-';

          // Safely extract error message without accessing getters that might throw/hang
          let errorMsg: string | undefined;
          if (hasError) {
            try {
              const err = (step as any).error;
              if (typeof err === 'string') {
                errorMsg = err.split('\n')[0];
              } else if (err && typeof err.message === 'string') {
                errorMsg = err.message.split('\n')[0];
              } else if (err) {
                errorMsg = String(err).split('\n')[0];
              }
            } catch {
              errorMsg = 'Error details unavailable';
            }
          }

          validations.push({
            category,
            validation: step.title,
            status,
            duration,
            error: errorMsg,
          });
        }

        // Recursively collect from nested steps
        const nestedSteps = (step as any).steps;
        if (nestedSteps && Array.isArray(nestedSteps) && nestedSteps.length > 0) {
          const nestedCategory = step.category === 'test.step' ? step.title : parentCategory;
          this.collectStepValidations(nestedSteps, validations, nestedCategory);
        }
      } catch {
        // Skip this step if any error occurs
        continue;
      }
    }
  }

  private collectConsoleValidations(stdout: (string | Buffer)[], validations: ValidationEntry[]) {
    if (!Array.isArray(stdout)) return;

    for (const output of stdout) {
      const text = typeof output === 'string' ? output : output.toString();
      const lines = text.split('\n');

      for (const line of lines) {
        // Match [ASSERT PASS] or [ASSERT FAIL] patterns
        const passMatch = line.match(/\[ASSERT PASS\]\s*(.+)/);
        const failMatch = line.match(/\[ASSERT FAIL\]\s*(.+)/);

        if (passMatch) {
          validations.push({
            category: 'Assertion',
            validation: passMatch[1].trim(),
            status: 'PASS',
            duration: '-',
          });
        } else if (failMatch) {
          validations.push({
            category: 'Assertion',
            validation: failMatch[1].trim(),
            status: 'FAIL',
            duration: '-',
          });
        }
      }
    }
  }

  private extractCategory(title: string): string {
    // Extract category from step title patterns
    const patterns = [
      /^(Form|Toolbar|Chat|Notes|Audio|Session|Meeting|User\d?):/i,
      /^Verify\s+(.*?)\s+(form|panel|controls?|elements?)/i,
      /^Validate\s+(.*?)\s+(controls?|toggle)/i,
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) return match[1];
    }

    // Categorize by keywords
    if (title.toLowerCase().includes('form')) return 'Form';
    if (title.toLowerCase().includes('toolbar') || title.toLowerCase().includes('mic') || title.toLowerCase().includes('camera')) return 'Toolbar';
    if (title.toLowerCase().includes('chat')) return 'Chat';
    if (title.toLowerCase().includes('notes')) return 'Notes';
    if (title.toLowerCase().includes('audio')) return 'Audio';
    if (title.toLowerCase().includes('transcri')) return 'Transcription';
    if (title.toLowerCase().includes('session')) return 'Session';

    return 'General';
  }

  private generateHtmlTable(testTitle: string, validations: ValidationEntry[], testStatus: string): string {
    const passCount = validations.filter((v) => v.status === 'PASS').length;
    const failCount = validations.filter((v) => v.status === 'FAIL').length;
    const totalCount = validations.length;

    // Group validations by category
    const grouped = new Map<string, ValidationEntry[]>();
    for (const v of validations) {
      if (!grouped.has(v.category)) {
        grouped.set(v.category, []);
      }
      grouped.get(v.category)!.push(v);
    }

    const statusColor = testStatus === 'passed' ? '#4caf50' : testStatus === 'failed' ? '#f44336' : '#ff9800';

    let tableRows = '';
    let rowIndex = 0;

    for (const [category, items] of grouped) {
      for (let i = 0; i < items.length; i++) {
        const v = items[i];
        const statusIcon = v.status === 'PASS' ? '✅' : '❌';
        const statusClass = v.status === 'PASS' ? 'pass' : 'fail';
        const rowClass = rowIndex % 2 === 0 ? 'even' : 'odd';
        
        // Add category cell with rowspan for first item in category
        const categoryCell = i === 0
          ? `<td class="category" rowspan="${items.length}">${this.escapeHtml(category)}</td>`
          : '';

        tableRows += `
          <tr class="${rowClass}">
            ${categoryCell}
            <td class="validation">${this.escapeHtml(v.validation)}</td>
            <td class="status ${statusClass}">${statusIcon} ${v.status}</td>
            <td class="duration">${v.duration}</td>
            ${v.error ? `<td class="error">${this.escapeHtml(v.error)}</td>` : '<td class="error">-</td>'}
          </tr>
        `;
        rowIndex++;
      }
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Validation Summary - ${this.escapeHtml(testTitle)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      color: #333;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px 24px;
    }
    .header h1 {
      font-size: 1.5rem;
      margin-bottom: 8px;
    }
    .header .test-title {
      font-size: 0.9rem;
      opacity: 0.9;
    }
    .summary {
      display: flex;
      gap: 20px;
      padding: 16px 24px;
      background: #fafafa;
      border-bottom: 1px solid #eee;
    }
    .summary-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .summary-item .count {
      font-size: 1.5rem;
      font-weight: bold;
    }
    .summary-item .label {
      color: #666;
      font-size: 0.85rem;
    }
    .summary-item.pass .count { color: #4caf50; }
    .summary-item.fail .count { color: #f44336; }
    .summary-item.total .count { color: #2196f3; }
    .test-status {
      margin-left: auto;
      padding: 6px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 0.85rem;
      background: ${statusColor};
      color: white;
      text-transform: uppercase;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      background: #f8f9fa;
      padding: 12px 16px;
      text-align: left;
      font-weight: 600;
      color: #555;
      border-bottom: 2px solid #dee2e6;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    td {
      padding: 12px 16px;
      border-bottom: 1px solid #eee;
      vertical-align: top;
    }
    tr.even { background: #fff; }
    tr.odd { background: #fafafa; }
    tr:hover { background: #f0f7ff; }
    .category {
      font-weight: 600;
      color: #667eea;
      background: #f8f9ff !important;
      border-right: 3px solid #667eea;
    }
    .validation {
      max-width: 400px;
      word-wrap: break-word;
    }
    .status {
      font-weight: 600;
      white-space: nowrap;
    }
    .status.pass { color: #4caf50; }
    .status.fail { color: #f44336; }
    .duration {
      color: #888;
      font-size: 0.85rem;
      white-space: nowrap;
    }
    .error {
      color: #f44336;
      font-size: 0.85rem;
      max-width: 300px;
      word-wrap: break-word;
    }
    .footer {
      padding: 16px 24px;
      background: #f8f9fa;
      text-align: center;
      color: #888;
      font-size: 0.8rem;
    }
    .no-validations {
      padding: 40px;
      text-align: center;
      color: #888;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Validation Summary</h1>
      <div class="test-title">${this.escapeHtml(testTitle)}</div>
    </div>
    <div class="summary">
      <div class="summary-item pass">
        <span class="count">${passCount}</span>
        <span class="label">Passed</span>
      </div>
      <div class="summary-item fail">
        <span class="count">${failCount}</span>
        <span class="label">Failed</span>
      </div>
      <div class="summary-item total">
        <span class="count">${totalCount}</span>
        <span class="label">Total</span>
      </div>
      <div class="test-status">${testStatus}</div>
    </div>
    ${validations.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th style="width: 120px;">Category</th>
          <th>Validation</th>
          <th style="width: 100px;">Status</th>
          <th style="width: 80px;">Duration</th>
          <th style="width: 250px;">Error</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
    ` : '<div class="no-validations">No validations recorded</div>'}
    <div class="footer">
      Generated by Validation Table Reporter • ${new Date().toLocaleString()}
    </div>
  </div>
</body>
</html>
    `;
  }

  private escapeHtml(text: string | null | undefined): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  onEnd(result: FullResult) {
    // Nothing needed here
  }
}
