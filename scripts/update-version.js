#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const versionPath = path.join(root, 'version.json');
const { version } = JSON.parse(fs.readFileSync(versionPath, 'utf8'));

console.log(`Updating all files to version ${version}...`);

const updateJsonVersion = (file) => {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) {
    console.log(`⏭ Skipped ${file} (not found)`);
    return;
  }
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  data.version = version;
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
  console.log(`✓ Updated ${file}`);
};

updateJsonVersion('package.json');
updateJsonVersion('manifest.json');
updateJsonVersion('npm-package.json');

const readmePath = path.join(root, 'README.md');
if (fs.existsSync(readmePath)) {
  let readme = fs.readFileSync(readmePath, 'utf8');
  readme = readme.replace(/npm install -g koti@[\d.]+/g, `npm install -g koti@${version}`);
  fs.writeFileSync(readmePath, readme);
  console.log('✓ Updated README.md');
}

console.log(`\n🎉 All files updated to version ${version}!`);
