const fs = require('fs');
const path = require('path');

const dirs = fs.readdirSync(__dirname).filter(f => fs.statSync(f).isDirectory() && (f.endsWith('-service') || f === 'api-gateway'));

for (const dir of dirs) {
    const gitPath = path.join(__dirname, dir, '.git');
    if (fs.existsSync(gitPath)) {
        fs.rmSync(gitPath, { recursive: true, force: true });
        console.log(`Removed corrupt .git from ${dir}`);
    }
}
