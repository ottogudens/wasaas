const fs = require('fs');
const path = require('path');

function processDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.ts') && !fullPath.endsWith('.d.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;
            
            function replacer(match, prefix, importStatement, importPath) {
                if (importPath.endsWith('.js') || importPath.endsWith('.json') || importPath.endsWith('.ts')) {
                    return match;
                }
                
                // Resolve the imported path relative to the current file's directory
                const resolvedPath = path.resolve(dir, importPath);
                
                let isDir = false;
                try {
                    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
                        isDir = true;
                    }
                } catch (e) {}

                modified = true;
                if (isDir) {
                    return `${prefix ? prefix + ' ' : ''}${importStatement}'${importPath}/index.js'`;
                } else {
                    return `${prefix ? prefix + ' ' : ''}${importStatement}'${importPath}.js'`;
                }
            }

            // Regex for: import { x } from './y' OR export { x } from './y'
            content = content.replace(/(import|export)\s+([\s\S]*?\s+from\s+)['"](\.[^'"]+)['"]/g, replacer);
            
            // Regex for: import './y'
            content = content.replace(/import\s+['"](\.[^'"]+)['"]/g, (match, importPath) => {
                return replacer(match, '', 'import ', importPath);
            });
            
            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

const packages = ['bot', 'manager', 'provider-baileys', 'provider-meta', 'provider-voice'];
for (const pkg of packages) {
    console.log(`Processing ${pkg}...`);
    processDir(path.join(__dirname, pkg, 'src'));
}
console.log('Done');
