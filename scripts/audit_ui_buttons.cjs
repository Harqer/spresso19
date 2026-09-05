const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.kt') || file.endsWith('.tsx') || file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const composeFiles = walk('composeApp/src/commonMain/kotlin');
let reactFiles = [];
try {
  reactFiles = walk('src');
} catch (e) { }

const allFiles = [...composeFiles, ...reactFiles];

let emptyCount = 0;
let todoCount = 0;
let mockCount = 0;

console.log('\n=========================================');
console.log('🤖 SPATIAL UI AUDITOR (COMPOSE & REACT) 🤖');
console.log('=========================================\n');

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, idx) => {
    if (line.includes('onClick')) {
      // Catch empty Compose onClick={} or empty React onClick={() => {}}
      if (line.match(/onClick\s*=\s*\{\s*\}/) || line.match(/onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}/)) {
        console.log(`❌ [EMPTY] ${file.split('/').pop()}:${idx+1} -> ${line.trim()}`);
        emptyCount++;
      } else if (line.match(/TODO/)) {
        console.log(`⚠️ [TODO] ${file.split('/').pop()}:${idx+1} -> ${line.trim()}`);
        todoCount++;
      } else if (line.match(/println|console\.log|mock|placeholder|dummy/i)) {
        // Exclude legitimate logger lines if they aren't mock (but for this audit we flag them as potential mocks)
        console.log(`⚠️ [MOCK] ${file.split('/').pop()}:${idx+1} -> ${line.trim()}`);
        mockCount++;
      }
    }
  });
});

console.log('\n-----------------------------------------');
console.log('📊 AUDIT SUMMARY');
console.log('-----------------------------------------');
console.log(`Empty Routes: ${emptyCount}`);
console.log(`TODO Routes: ${todoCount}`);
console.log(`Mock/Print Routes: ${mockCount}`);
console.log(`Total Disconnected Buttons: ${emptyCount + todoCount + mockCount}`);
console.log('=========================================\n');
