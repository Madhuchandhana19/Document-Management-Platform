const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'backend', 'src', 'test', 'java');

function walk(dir) {
    if (!fs.existsSync(dir)) return [];
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.java')) {
            results.push(file);
        }
    });
    return results;
}

const javaFiles = walk(srcDir);

javaFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Update package declarations
    content = content.replace(/^package\s+com\.dms\.controller;/gm, 'package com.examly.springapp.controller;');
    content = content.replace(/^package\s+com\.dms\.service;/gm, 'package com.examly.springapp.service;');

    // Update imports
    content = content.replace(/import\s+com\.dms\.controller\./g, 'import com.examly.springapp.controller.');
    content = content.replace(/import\s+com\.dms\.service\./g, 'import com.examly.springapp.service.');

    // Since they are now in the same package as the moved services, they don't strictly need imports if we move them, 
    // but wait! We haven't moved the test files themselves yet!
    // Let's just add imports for the services if they aren't there, OR we can move the files.
    // It's safer to just move the test files to the examly package.
    
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated: ' + file);
    }
});

console.log('Done refactoring packages and imports in tests.');
