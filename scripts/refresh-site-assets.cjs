'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const directory = path.resolve(__dirname, '../dist');
const index = path.join(directory, 'index.html');
const original = fs.readFileSync(index, 'utf8');
let assets = 0;
const updated = original.replace(/\b(src|href)="([^"?]+\.(?:css|js))(?:\?[^\"]*)?"/g, (reference, attribute, filename) => {
  const asset = path.resolve(directory, filename);
  if (!asset.startsWith(directory + path.sep) || !fs.existsSync(asset)) return reference;
  const version = crypto.createHash('sha256').update(fs.readFileSync(asset)).digest('hex').slice(0, 12);
  assets++;
  return attribute + '="' + filename + '?v=' + version + '"';
});
if (process.argv.includes('--check')) {
  if (updated !== original) {
    console.error('Asset versions are stale. Run node scripts/refresh-site-assets.cjs before publishing.');
    process.exitCode = 1;
  } else console.log(assets + ' local script and stylesheet versions match their contents.');
} else {
  if (updated !== original) fs.writeFileSync(index, updated);
  console.log(assets + ' local script and stylesheet versions refreshed.');
}
