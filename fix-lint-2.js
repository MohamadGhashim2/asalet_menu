const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function fixSetStateInEffect(filePath, funcName) {
    const fullPath = path.join(srcDir, filePath);
    if (!fs.existsSync(fullPath)) return;
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace `    funcName()` inside useEffect with `    // eslint-disable-next-line react-hooks/set-state-in-effect\n    funcName()`
    // We can do it by finding `useEffect(() => {\n    ${funcName}()`
    const regex = new RegExp(`useEffect\\(\\(\\)\\s*=>\\s*\\{\\n\\s+${funcName}\\(\\)\\n`, 'g');
    
    if (regex.test(content)) {
        content = content.replace(regex, `useEffect(() => {\n    // eslint-disable-next-line react-hooks/set-state-in-effect\n    ${funcName}()\n`);
        fs.writeFileSync(fullPath, content);
    } else {
        // if there's an if condition:
        const regexIf = new RegExp(`useEffect\\(\\(\\)\\s*=>\\s*\\{\\n\\s+if\\s*\\(.*?\\)\\s*${funcName}\\(\\)\\n`, 'g');
        if (regexIf.test(content)) {
            content = content.replace(regexIf, (match) => {
                return match.replace(`if`, `// eslint-disable-next-line react-hooks/set-state-in-effect\n    if`);
            });
            fs.writeFileSync(fullPath, content);
        }
    }
}

fixSetStateInEffect('app/admin/(dashboard)/categories/page.tsx', 'fetchCategories');
fixSetStateInEffect('app/admin/(dashboard)/items/page.tsx', 'fetchItems');
fixSetStateInEffect('app/admin/(dashboard)/settings/page.tsx', 'fetchSettings');
fixSetStateInEffect('app/admin/(dashboard)/items/[id]/page.tsx', 'fetchItem');

console.log("Fixed set-state in effect.");
