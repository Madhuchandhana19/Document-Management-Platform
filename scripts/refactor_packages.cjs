const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'backend', 'src', 'main', 'java');

function walk(dir) {
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

    if (file.endsWith('DmsApplication.java')) {
        content = content.replace(
            /@SpringBootApplication/g, 
            '@SpringBootApplication(scanBasePackages = {"com.dms", "com.examly.springapp"})'
        );
    }

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated: ' + file);
    }
});

console.log('Done refactoring packages and imports.');
