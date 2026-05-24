const fs = require('fs');
const path = require('path');

const adminPath = path.join(__dirname, 'src', 'app', 'admin');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(adminPath);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace blue-600 with brand-burgundy
  content = content.replace(/blue-600/g, 'brand-burgundy');
  // Replace hover:blue-700 with hover:brand-burgundy-dark
  content = content.replace(/blue-700/g, 'brand-burgundy-dark');
  // Replace blue-50 with brand-burgundy/10
  content = content.replace(/blue-50/g, 'brand-burgundy/10');
  // Replace blue-500 with brand-gold or brand-burgundy based on context (ring-blue-500)
  content = content.replace(/blue-500/g, 'brand-burgundy');
  // Replace blue-800 with brand-burgundy-dark
  content = content.replace(/blue-800/g, 'brand-burgundy-dark');
  // Replace blue-900 with brand-burgundy-dark
  content = content.replace(/blue-900/g, 'brand-burgundy-dark');

  fs.writeFileSync(file, content, 'utf8');
});

console.log('Colors replaced successfully in admin directory.');
