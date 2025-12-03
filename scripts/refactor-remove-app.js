#!/usr/bin/env node
/**
 * scripts/refactor-remove-app.js
 *
 * Usage:
 *   node scripts/refactor-remove-app.js
 *
 * This script:
 * - Requires a clean git working tree (it will abort if there are uncommitted changes)
 * - Backs up client/src/app -> client/src/.app_backup_<timestamp>
 * - Moves files from client/src/app into canonical client/src/ locations:
 *     app/ManacityApp.* -> client/src/ManacityApp.*
 *     app/layouts/*    -> client/src/layouts/*
 *     app/routes/*     -> client/src/routes/*
 *     app/components/* -> client/src/components/*
 *     app/hooks/*      -> client/src/hooks/*
 *     app/screens/*    -> client/src/pages/*
 *     app/styles/*     -> client/src/styles/*
 *     other files      -> client/src/components/*
 * - If a destination path already exists, moves the existing path to "<path>.legacy.<timestamp>"
 * - Tries `git mv` to preserve history, falls back to fs.rename/copy
 * - Rewrites imports in client/src for:
 *     "@/app/..."  -> "@/..."
 *     "./app/..."  -> "./..."
 *     "../app/..." -> "../..."
 *     "src/app/..." -> "src/..."
 * - Updates client/src/App.tsx to export from './ManacityApp' (instead of './app/ManacityApp')
 * - Runs client validation: npm ci (client), npm run typecheck/build/test
 * - If all validations pass, commits the change.
 *
 * NOTE: the script creates a backup directory and will abort if it finds remaining '/app/' import occurrences --
 * it will print them for manual review. This is a safety step.
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

function exec(cmd, opts = {}) {
  console.log('> ' + cmd);
  return cp.execSync(cmd, Object.assign({ stdio: 'inherit' }, opts));
}

function safeExec(cmd) {
  try {
    exec(cmd);
    return true;
  } catch (e) {
    console.error('Command failed:', cmd);
    console.error(e && e.message ? e.message : e);
    return false;
  }
}

const root = process.cwd();
const clientSrc = path.join(root, 'client', 'src');
const appDir = path.join(clientSrc, 'app');

if (!fs.existsSync(appDir)) {
  console.error('No client/src/app folder found. Aborting.');
  process.exit(1);
}

console.log('Verifying git working tree is clean...');
try {
  const status = cp.execSync('git status --porcelain', { encoding: 'utf8' });
  if (status.trim().length > 0) {
    console.error('Git working tree is not clean. Please commit/stash changes before running this script.');
    console.log(status);
    process.exit(1);
  }
} catch (e) {
  console.error('Unable to query git status. Ensure you run this in a git repo root.');
  process.exit(1);
}

// Create backup
const backupDir = path.join(clientSrc, `.app_backup_${Date.now()}`);
console.log('Creating backup of app folder at:', backupDir);

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
  } else {
    // ensure destination dir exists
    const parent = path.dirname(dest);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
    fs.copyFileSync(src, dest);
  }
}
copyRecursive(appDir, backupDir);

// Helper walk
function walk(dir) {
  let out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const s = fs.statSync(p);
    if (s.isDirectory()) {
      out = out.concat(walk(p));
    } else {
      out.push(p);
    }
  }
  return out;
}

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function mapDestination(filePath) {
  const rel = path.relative(appDir, filePath).replace(/\\/g, '/'); // unify windows
  const lower = rel.toLowerCase();

  // direct app root files
  if (/^manacityapp\.(tsx?|jsx?)$/.test(rel) || /^manacityapp\.(tsx?|jsx?)$/i.test(rel)) {
    return path.join(clientSrc, path.basename(rel));
  }

  if (rel.startsWith('layouts/')) {
    return path.join(clientSrc, 'layouts', rel.slice('layouts/'.length));
  }
  if (rel.startsWith('routes/')) {
    return path.join(clientSrc, 'routes', rel.slice('routes/'.length));
  }
  if (rel.startsWith('components/')) {
    return path.join(clientSrc, 'components', rel.slice('components/'.length));
  }
  if (rel.startsWith('hooks/')) {
    return path.join(clientSrc, 'hooks', rel.slice('hooks/'.length));
  }
  if (rel.startsWith('styles/')) {
    return path.join(clientSrc, 'styles', rel.slice('styles/'.length));
  }
  if (rel.startsWith('screens/')) {
    // map screens -> pages
    return path.join(clientSrc, 'pages', rel.slice('screens/'.length));
  }
  // heuristic: a file named *Screen.* -> pages
  if (/Screen\.(t|j)sx?$/i.test(rel)) {
    return path.join(clientSrc, 'pages', rel);
  }

  // default: components
  return path.join(clientSrc, 'components', rel);
}

// Function to move a file with git mv if possible
function moveFile(src, dest) {
  ensureDir(path.dirname(dest));
  if (fs.existsSync(dest)) {
    const legacy = dest + `.legacy.${Date.now()}`;
    console.log('Destination exists. Moving existing to:', legacy);
    fs.renameSync(dest, legacy);
  }

  // Try git mv first
  try {
    exec(`git mv "${src}" "${dest}"`);
  } catch (e) {
    console.warn('git mv failed for', src, '-> falling back to filesystem move');
    try {
      fs.renameSync(src, dest);
    } catch (err) {
      console.warn('fs.renameSync failed, falling back to copy+unlink', err && err.message);
      fs.copyFileSync(src, dest);
      fs.unlinkSync(src);
    }
  }
}

console.log('Collecting files to move from app folder...');
const appFiles = walk(appDir);

if (appFiles.length === 0) {
  console.log('No files found in client/src/app. Nothing to move.');
  process.exit(0);
}

console.log('Found', appFiles.length, 'files. Moving them now...');
for (const f of appFiles) {
  const dest = mapDestination(f);
  console.log(`Moving: ${path.relative(clientSrc, f)} -> ${path.relative(clientSrc, dest)}`);
  try {
    moveFile(f, dest);
  } catch (e) {
    console.error('Failed to move file:', f, e && e.message ? e.message : e);
    console.error('Aborting. You can inspect the backup at', backupDir);
    process.exit(1);
  }
}

// Attempt to remove (now empty) app directory if it exists
function rmDirRecursiveIfEmpty(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const s = fs.statSync(p);
    if (s.isDirectory()) {
      rmDirRecursiveIfEmpty(p);
    } else {
      // if any file remains, don't remove
      return;
    }
  }
  // check again for nested directories now removed
  const rem = fs.readdirSync(dir);
  if (rem.length === 0) {
    fs.rmdirSync(dir);
  } else {
    // contain only directories that may have become empty
    for (const d of rem) {
      rmDirRecursiveIfEmpty(path.join(dir, d));
    }
    // final try
    try {
      fs.rmdirSync(dir);
    } catch (e) {
      // ignore
    }
  }
}
try {
  // remove app dir even if not empty (we moved files). We keep the backup.
  if (fs.existsSync(appDir)) {
    // only remove if directory exists under client/src/app and we've already moved everything
    // do a best-effort remove:
    fs.rmSync(appDir, { recursive: true, force: true });
    console.log('Removed client/src/app (original removed). Backup retained at', backupDir);
  }
} catch (e) {
  console.warn('Could not fully remove client/src/app. Please check manually.');
}

// Rewrite imports across client/src
console.log('Rewriting imports across client/src ...');

function rewriteImportsInFile(file) {
  const ext = path.extname(file);
  if (!['.ts', '.tsx', '.js', '.jsx', '.mjs'].includes(ext)) return;
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // 1) Alias: "@/app/... " --> "@/..."
  content = content.replace(/(['"`])@\/app\/([^'"`]+)\1/g, (m, q, rest) => `${q}@/${rest}${q}`);

  // 2) Relative imports: "./app/...","../app/...","../../app/..." => "./...","../...","../../..."
  content = content.replace(/(['"`])((?:\.+\/)+)app\/([^'"`]+)\1/g, (m, q, rel, rest) => `${q}${rel}${rest}${q}`);

  // 3) Relative starting with ./app/ or ../app/ without leading dots caught above, but handle "./app/" explicitly:
  content = content.replace(/(['"`])\.\/app\/([^'"`]+)\1/g, (m, q, rest) => `${q}./${rest}${q}`);

  // 4) src/app/... -> src/...
  content = content.replace(/(['"`])src\/app\/([^'"`]+)\1/g, (m, q, rest) => `${q}src/${rest}${q}`);

  // 5) Specific fix for App.tsx re-export pattern (if present): './app/ManacityApp' -> './ManacityApp'
  content = content.replace(/(['"`])\.\/app\/ManacityApp\1/g, (m, q) => `${q}./ManacityApp${q}`);

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Rewrote imports in:', path.relative(clientSrc, file));
  }
}

function allFilesUnder(dir) {
  let out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const s = fs.statSync(p);
    if (s.isDirectory()) out = out.concat(allFilesUnder(p));
    else out.push(p);
  }
  return out;
}

const clientFiles = allFilesUnder(clientSrc);
for (const file of clientFiles) {
  rewriteImportsInFile(file);
}

// Update client/src/App.tsx specifically if it imports from './app/ManacityApp'
const appIndex = path.join(clientSrc, 'App.tsx');
if (fs.existsSync(appIndex)) {
  let txt = fs.readFileSync(appIndex, 'utf8');
  const before = txt;
  txt = txt.replace(/(['"`])\.\/app\/ManacityApp\1/g, (m,q) => `${q}./ManacityApp${q}`);
  txt = txt.replace(/(['"`])@\/app\/ManacityApp\1/g, (m,q) => `${q}@/ManacityApp${q}`);
  if (txt !== before) {
    fs.writeFileSync(appIndex, txt, 'utf8');
    console.log('Updated client/src/App.tsx to import from ./ManacityApp');
  } else {
    console.log('client/src/App.tsx did not need modification or was absent.');
  }
} else {
  console.log('client/src/App.tsx not found (nothing to update there).');
}

// Find remaining '/app/' occurrences
console.log('Searching for any remaining references to "/app/" in client/src ...');
const leftover = [];
for (const file of clientFiles) {
  const ext = path.extname(file);
  if (!['.ts', '.tsx', '.js', '.jsx', '.json'].includes(ext)) continue;
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('/app/')) leftover.push(path.relative(clientSrc, file));
}
if (leftover.length > 0) {
  console.error('Found remaining occurrences of "/app/" in the following files:');
  leftover.forEach(f => console.error('  -', f));
  console.error('Please inspect and fix remaining references manually. Backup of app is at:', backupDir);
  // stop here but do not destroy any changes
  process.exit(2);
}

console.log('No remaining "/app/" occurrences found. Proceeding to client build & tests.');

// Run client validations
const clientCmds = [
  'npm ci --prefix client',
  'npm run typecheck --prefix client',
  'npm run build --prefix client',
  'npm run test --prefix client'
];

let ok = true;
for (const c of clientCmds) {
  console.log('Running:', c);
  try {
    exec(c);
  } catch (e) {
    console.error('Command failed:', c);
    console.error('Error:', e && e.message ? e.message : e);
    ok = false;
    break;
  }
}

if (!ok) {
  console.error('Validation failed. Please inspect errors, fix them, and then run `git add -A && git commit` manually when ready.');
  process.exit(3);
}

// Commit the changes (safe commit)
try {
  exec('git add -A');
  exec('git commit -m "refactor(client): remove src/app and relocate files into src/{components,layouts,routes,pages,hooks,styles}; update imports; keep backup at client/src/.app_backup_*"');
  console.log('Refactor complete and committed. Backup retained at:', backupDir);
} catch (e) {
  console.error('Git commit failed. Please commit changes manually. Backup retained at:', backupDir);
  process.exit(4);
}
