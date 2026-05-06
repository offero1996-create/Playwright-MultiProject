import { readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

// Search for reports in project-specific folders and fallback root reports/
const reportsDirs = [
  './projects/BloomLink/reports',
  './projects/Bloomifai/reports',
  './reports',
];

// Timestamp format: YYYY-MM-DD_HH-MM-SS_IST
const isTimestamp = (name) => /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_IST$/.test(name);

try {
  const allReports = [];

  for (const reportsDir of reportsDirs) {
    if (!existsSync(reportsDir)) continue;

    const dirs = readdirSync(reportsDir)
      .filter(file => {
        const fullPath = join(reportsDir, file);
        return statSync(fullPath).isDirectory() && isTimestamp(file);
      })
      .map(file => ({
        name: file,
        path: join(reportsDir, file),
        time: statSync(join(reportsDir, file)).mtime.getTime(),
      }));

    allReports.push(...dirs);
  }

  // Sort by time descending — latest first
  allReports.sort((a, b) => b.time - a.time);

  if (allReports.length === 0) {
    console.error('No HTML reports found. Run tests first: npm test');
    process.exit(1);
  }

  const latestReport = allReports[0].path;
  console.log(`Opening latest report: ${latestReport}\n`);

  const reportProcess = spawn('playwright', ['show-report', latestReport], {
    stdio: 'inherit',
    shell: true,
  });

  reportProcess.on('exit', (code) => {
    process.exit(code);
  });

} catch (error) {
  console.error('Error finding reports:', error.message);
  console.error('Run tests first: npm test');
  process.exit(1);
}
