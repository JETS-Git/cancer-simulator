#!/usr/bin/env node
// Generates the real THIRD-PARTY-NOTICES.txt from the actual installed
// dependency trees in server/ and client/, which have separate package.json
// files. Run via `npm run notices` (see root package.json).
//
// The output lands in client/public/ so Vite copies it into client/dist/ on
// build, and Express serves it statically alongside the built app — the same
// path Notices.jsx fetches at runtime (see client/src/components/Notices.jsx).
//
// This file is not the notice itself. See THIRD-PARTY-NOTICES.md at the repo
// root for why the copyright lines are never hand-written.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'client', 'public');
const outFile = path.join(outDir, 'THIRD-PARTY-NOTICES.txt');

// JSON output, not the default "friendly" template — the template embeds
// each package's absolute install path, which is meaningless once this file
// leaves the machine it was generated on and looks like a leaked filesystem
// layout. We keep only what a notice actually needs: name, license,
// repository, publisher and the licence text itself.
function packages(cwd) {
  const json = execFileSync(
    'npx',
    ['--yes', 'license-checker', '--production', '--json'],
    { cwd, encoding: 'utf8', maxBuffer: 1024 * 1024 * 32 }
  );
  return JSON.parse(json);
}

function formatSection(label, pkgs) {
  const lines = [`${'='.repeat(79)}`, `${label} production dependencies`, `${'='.repeat(79)}`, ''];
  for (const [nameVersion, info] of Object.entries(pkgs).sort()) {
    lines.push(`${nameVersion}`);
    lines.push(`  Licence:    ${info.licenses || 'UNKNOWN'}`);
    if (info.repository) lines.push(`  Repository: ${info.repository}`);
    if (info.publisher) lines.push(`  Publisher:  ${info.publisher}`);
    let licenceText = null;
    if (info.licenseFile && fs.existsSync(info.licenseFile)) {
      try { licenceText = fs.readFileSync(info.licenseFile, 'utf8').trim(); } catch { /* skip */ }
    }
    if (licenceText) {
      lines.push('  ---');
      lines.push(licenceText.split('\n').map(l => `  ${l}`).join('\n'));
      lines.push('  ---');
    }
    lines.push('');
  }
  return lines.join('\n');
}

fs.mkdirSync(outDir, { recursive: true });

const sections = [
  ['server/', formatSection('server/', packages(path.join(root, 'server')))],
  ['client/', formatSection('client/', packages(path.join(root, 'client')))],
];

const header =
  'THIRD-PARTY NOTICES — GENERATED, DO NOT EDIT BY HAND\n' +
  `Generated ${new Date().toISOString()} by scripts/generate-notices.js\n` +
  'Regenerate with `npm run notices` whenever dependencies change.\n' +
  '\n' +
  'See THIRD-PARTY-NOTICES.md at the repository root for context on what this\n' +
  'file is and is not, and when it is actually required.\n\n';

fs.writeFileSync(outFile, header + sections.map(([, text]) => text).join('\n'));
console.log(`Wrote ${outFile}`);
