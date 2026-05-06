/**
 * Environment loader — resolves the correct .env file per project and environment.
 *
 * Resolution order:
 *   1. .env                                 (root — shared settings: HEADLESS, BROWSER)
 *   2. projects/<project>/.env              (project — sets TEST_ENV for this project)
 *   3. projects/<project>/.env.<TEST_ENV>   (environment — URLs, credentials)
 *
 * Each project has its own TEST_ENV so different projects can target different
 * environments independently (e.g. BloomLink on dev, Bloomifai on staging).
 *
 * Usage in playwright.config.ts:
 *   import { loadEnv } from './config/env-loader';
 *   loadEnv();   // auto-detects project from --project CLI arg
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Map Playwright project names to folder names */
const PROJECT_MAP: Record<string, string> = {
  'bloomlink-chromium': 'BloomLink',
  'bloomlink-firefox': 'BloomLink',
  'bloomlink-webkit': 'BloomLink',
  'bloomifai-chromium': 'Bloomifai',
  'bloomifai-firefox': 'Bloomifai',
  'bloomifai-webkit': 'Bloomifai',
};

/**
 * Detect which project folder to load env for, based on --project CLI arg.
 */
function detectProject(): string | undefined {
  const idx = process.argv.indexOf('--project');
  if (idx !== -1 && process.argv[idx + 1]) {
    return PROJECT_MAP[process.argv[idx + 1]];
  }
  return undefined;
}

/**
 * Load environment variables in the correct order:
 *   1. Root .env (shared settings)
 *   2. Project .env (TEST_ENV for this project)
 *   3. Project .env.<TEST_ENV> (environment-specific URLs + credentials)
 *
 * @param project  - Optional project folder name (e.g. 'BloomLink'). Auto-detected if omitted.
 * @param env      - Optional environment name (e.g. 'dev', 'staging'). Reads from project .env if omitted.
 */
export function loadEnv(project?: string, env?: string): void {
  const rootDir = path.resolve(__dirname, '..');

  // Step 1: Load root .env (shared settings like HEADLESS, BROWSER)
  const rootEnvPath = path.join(rootDir, '.env');
  if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath });
  }

  // Step 2: Determine project
  const resolvedProject = project || detectProject();
  if (!resolvedProject) {
    return; // No project detected — root .env is enough
  }

  const projectDir = path.join(rootDir, 'projects', resolvedProject);

  // Step 3: Load project .env (contains TEST_ENV for this project)
  const projectBaseEnv = path.join(projectDir, '.env');
  if (fs.existsSync(projectBaseEnv)) {
    dotenv.config({ path: projectBaseEnv, override: true });
  }

  // Step 4: Resolve environment and load .env.<TEST_ENV>
  const resolvedEnv = env || process.env.TEST_ENV || 'staging';
  const projectEnvPath = path.join(projectDir, `.env.${resolvedEnv}`);
  if (fs.existsSync(projectEnvPath)) {
    dotenv.config({ path: projectEnvPath, override: true });
  }
}
