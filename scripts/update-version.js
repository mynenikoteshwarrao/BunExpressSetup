#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read version from centralized location
const versionPath = path.join(__dirname, '..', 'version.json');
const { version } = JSON.parse(fs.readFileSync(versionPath, 'utf8'));

console.log(`Updating all files to version ${version}...`);

// Update npm-package.json
const npmPackagePath = path.join(__dirname, '..', 'npm-package.json');
const npmPackage = JSON.parse(fs.readFileSync(npmPackagePath, 'utf8'));
npmPackage.version = version;
fs.writeFileSync(npmPackagePath, JSON.stringify(npmPackage, null, 2));
console.log('✓ Updated npm-package.json');

// Update README.md
const readmePath = path.join(__dirname, '..', 'README.md');
let readmeContent = fs.readFileSync(readmePath, 'utf8');
readmeContent = readmeContent.replace(/npm install -g koti@[\d.]+/g, `npm install -g koti@${version}`);
fs.writeFileSync(readmePath, readmeContent);
console.log('✓ Updated README.md');

// Update replit.md
const replitMdPath = path.join(__dirname, '..', 'replit.md');
let replitContent = fs.readFileSync(replitMdPath, 'utf8');
replitContent = replitContent.replace(/Version [\d.]+ - Development Release/g, `Version ${version} - Development Release`);
replitContent = replitContent.replace(/Version [\d.]+ - Comprehensive Audit System/g, `Version ${version} - Comprehensive Audit System`);
fs.writeFileSync(replitMdPath, replitContent);
console.log('✓ Updated replit.md');

console.log(`\n🎉 All files updated to version ${version}!`);
console.log('\nNext steps:');
console.log('1. Run: npm run build');
console.log('2. Run: npm publish');