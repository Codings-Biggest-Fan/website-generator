#!/usr/bin/env node
/**
 * MVRT.com CLI Static Website Generator (FRC Team 115)
 * Usage: npm run generate-site
 *
 * Reads ./site-data/mvrt-site.json (or seeds it from src/data/mvrtData.ts if missing)
 * and outputs all 9 static HTML pages + unified assets/css/style.css into ./generated-site/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_MVRT_DATA } from '../src/data/mvrtData.ts';
import { generateAllStaticSiteFiles } from '../src/services/mvrtStaticGenerator.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataPath = path.join(rootDir, 'site-data', 'mvrt-site.json');
const outDir = path.join(rootDir, 'generated-site');

let siteData = DEFAULT_MVRT_DATA;
if (fs.existsSync(dataPath)) {
  siteData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  console.log('Loaded site data from:', path.relative(rootDir, dataPath));
} else {
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify(DEFAULT_MVRT_DATA, null, 2), 'utf8');
  console.log('Created initial site data at:', path.relative(rootDir, dataPath));
}

const files = generateAllStaticSiteFiles(siteData);
for (const file of files) {
  const target = path.join(outDir, file.filename);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, file.content, 'utf8');
  console.log(
    `Generated: ${path.relative(rootDir, target)} (${(
      file.content.length / 1024
    ).toFixed(1)} KB)`
  );
}

console.log(
  `\nSuccessfully generated ${files.length} static site files in ./generated-site/`
);
