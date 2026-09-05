const fs = require('fs');
const path = require('path');

const TARGET_EXTENSIONS = ['.kt', '.tsx', '.jsx', '.ts', '.js', '.py'];
const IGNORE_DIRS = ['node_modules', '.git', 'build', 'dist', '.gradle', '.idea', '.scratch', '.gitnexus'];

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!IGNORE_DIRS.includes(path.basename(file))) {
        results = results.concat(walk(file));
      }
    } else {
      if (TARGET_EXTENSIONS.some(ext => file.endsWith(ext))) {
        results.push(file);
      }
    }
  });
  return results;
}

const directoriesToScan = ['composeApp/src', 'src', 'functions/src', 'server', 'services'];
let allFiles = [];
directoriesToScan.forEach(dir => {
  allFiles = allFiles.concat(walk(dir));
});

let mockIssues = [];
let productionIssues = [];

const mockPatterns = [
  { regex: /TODO\b|FIXME\b/, type: 'TODO/FIXME' },
  { regex: /mock|dummy/i, type: 'Mock Keyword' },
  { regex: /delay\([0-9]+\)|Thread\.sleep/i, type: 'Hardcoded Delay' },
  { regex: /onClick\s*=\s*\{\s*\}/, type: 'Empty onClick (Compose)' },
  { regex: /onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}/, type: 'Empty onClick (React)' },
  { regex: /uid\s*={0,2}\s*["'](123|test_user|dummy|mock)["']/i, type: 'Hardcoded ID' }
];

const productionPatterns = [
  { regex: /Bearer\s+test-token|test-token/, type: 'Test credential' },
  { regex: /localhost:\d+|127\.0\.0\.1:\d+/, type: 'Localhost fallback' },
  { regex: /success\s*:\s*true[\s\S]{0,160}(ORD-|clientSecret|receiptUrl|orderId)/i, type: 'Synthetic success payload' },
  { regex: /pi_[A-Za-z0-9]+_secret_test/, type: 'Provider test artifact' }
];

const strictProduction = process.argv.includes('--strict-production');

console.log('\n================================================');
console.log('🛡️  UNIVERSAL MOCK SCANNER (CROSS-PLATFORM) 🛡️');
console.log('================================================\n');

allFiles.forEach(file => {
  if (file.toLowerCase().includes('test') || file.includes('Preview') || file.includes('gradle')) return;

  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, idx) => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('//') && !trimmedLine.includes('TODO') && !trimmedLine.includes('FIXME') && !trimmedLine.toLowerCase().includes('mock')) return;
    if (trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) return;
    if (trimmedLine.startsWith('import ') || trimmedLine.startsWith('package ')) return;

    mockPatterns.forEach(pattern => {
      if (pattern.regex.test(line)) {
        if (line.includes('@Preview')) return;
        if (line.includes('console.log') && pattern.type === 'Mock Keyword') return;
        if (line.includes('Zero Mock')) return; // Ignore our own rules text
        
        mockIssues.push({
          file: file,
          line: idx + 1,
          type: pattern.type,
          content: line.trim()
        });
      }
    });
    if (strictProduction) {
      productionPatterns.forEach(pattern => {
        if (pattern.regex.test(line)) {
          const issue = { file, line: idx + 1, type: pattern.type, content: line.trim() };
          mockIssues.push(issue);
          productionIssues.push(issue);
        }
      });
    }
  });
});

// Group by app
const grouped = {
  Android_Compose: mockIssues.filter(i => i.file.includes('composeApp')),
  Web_React: mockIssues.filter(i => i.file.includes('src/') && !i.file.includes('composeApp') && !i.file.includes('functions')),
  Backend_Functions: mockIssues.filter(i => i.file.includes('functions/src')),
  Backend_Server: mockIssues.filter(i => i.file.includes('server/')),
  Backend_Python: mockIssues.filter(i => i.file.includes('services/'))
};

Object.keys(grouped).forEach(app => {
  console.log(`\n--- [ ${app.toUpperCase()} ] ---`);
  if (grouped[app].length === 0) {
    console.log(`✅ Clean - No mocks detected.`);
  } else {
    grouped[app].forEach(issue => {
      console.log(`❌ ${issue.type} | ${path.basename(issue.file)}:${issue.line} -> ${issue.content}`);
    });
  }
});

console.log('\n================================================');
console.log(`Total Issues Found: ${mockIssues.length}`);
console.log('================================================\n');
if (strictProduction && productionIssues.length > 0) process.exitCode = 1;
