import { promises as fs } from 'fs';
import path from 'path';
const cwd = process.cwd();
const binDir = path.join(cwd, 'node_modules', '.bin');

async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function ensureFile(file, content, mode) {
  if (await fileExists(file)) {
    return;
  }
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content, { mode });
}

const shebang = '#!/usr/bin/env node\n';
const stub = `${shebang}` +
`console.warn('[patch-package stub] "patch-package" is not installed; skipping patch application.');\n` +
'process.exit(0);\n';

await ensureFile(path.join(binDir, 'patch-package'), stub, 0o755);

if (process.platform === 'win32') {
  const cmdStub = '@ECHO OFF\r\n' +
    'node "%~dp0..\\patch-package" %*\r\n';
  await ensureFile(path.join(binDir, 'patch-package.cmd'), cmdStub);

  const ps1Stub = '$basedir = Split-Path $MyInvocation.MyCommand.Definition -Parent\n' +
    '$exe = Join-Path $basedir "..\\patch-package"\n' +
    'node $exe $args\n';
  await ensureFile(path.join(binDir, 'patch-package.ps1'), ps1Stub);
}
