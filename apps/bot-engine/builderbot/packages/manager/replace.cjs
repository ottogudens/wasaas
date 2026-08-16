const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            // Regex to find import/export from relative paths without .js extension
            // It matches: import { x } from './y' or export { x } from '../y'
            content = content.replace(/(import|export)\s+(.*?\s+from\s+)['"](\.[^'"]+)['"]/g, (match, p1, p2, p3) => {
                if (!p3.endsWith('.js') && !p3.endsWith('.json') && !p3.endsWith('.ts')) {
                    return `${p1} ${p2}'${p3}.js'`;
                }
                return match;
            });
            fs.writeFileSync(fullPath, content);
        }
    }
}

processDir(path.join(__dirname, 'src'));
console.log('Done');
