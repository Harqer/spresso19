const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      if (fullPath.includes('Logger.ts')) continue;
      
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      
      if (content.includes('console.warn') || content.includes('console.error')) {
        content = content.replace(/console\.warn\(/g, 'Logger.warn(');
        content = content.replace(/console\.error\(/g, 'Logger.error(');
        changed = true;
      }
      
      if (changed) {
        // Need to add import Logger if it doesn't exist
        if (!content.includes('import Logger')) {
          // Find the relative path to src/lib/Logger
          const relPath = path.relative(path.dirname(fullPath), path.join(__dirname, 'src/lib/Logger'));
          const importStr = `import Logger from "${relPath.startsWith('.') ? relPath : './' + relPath}";\n`;
          content = importStr + content;
        }
        fs.writeFileSync(fullPath, content);
        console.log('Updated ' + fullPath);
      }
    }
  }
}

processDir(path.join(__dirname, 'src'));
