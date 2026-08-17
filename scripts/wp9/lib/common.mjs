import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

export function normalizeRoot(input) {
  return path.resolve(input || process.cwd());
}

export function exists(root, relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

export function read(root, relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

export function readIfExists(root, relativePath) {
  const target = path.join(root, relativePath);
  return fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
}

export function walk(root, relativeDir = '.') {
  const start = path.join(root, relativeDir);
  if (!fs.existsSync(start)) return [];
  const out = [];
  const stack = [start];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (['node_modules', '.next', '.git', 'dist', 'out', 'coverage'].includes(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else out.push(path.relative(root, full).replaceAll('\\', '/'));
    }
  }
  return out.sort();
}

export function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

export function result(id, ok, message, evidence = undefined, severity = 'error') {
  return { id, ok, message, ...(evidence === undefined ? {} : { evidence }), severity };
}

export function summary(results) {
  const passed = results.filter((item) => item.ok).length;
  const failed = results.filter((item) => !item.ok && item.severity !== 'warning').length;
  const warnings = results.filter((item) => !item.ok && item.severity === 'warning').length;
  return { total: results.length, passed, failed, warnings };
}

export function runCommand(command, args, options = {}) {
  const startedAt = new Date();
  const proc = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: { ...process.env, ...(options.env || {}) },
    maxBuffer: 32 * 1024 * 1024,
  });
  return {
    command: [command, ...args].join(' '),
    status: proc.status,
    signal: proc.signal,
    stdout: proc.stdout || '',
    stderr: proc.stderr || '',
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
  };
}

export function parseArgs(argv) {
  const args = { root: process.cwd(), reportDir: null, phase: 'all', skipCanonicalBuild: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--root') args.root = argv[++i];
    else if (token === '--report-dir') args.reportDir = argv[++i];
    else if (token === '--phase') args.phase = argv[++i];
    else if (token === '--skip-canonical-build') args.skipCanonicalBuild = true;
  }
  args.root = normalizeRoot(args.root);
  args.reportDir = path.resolve(args.reportDir || path.join(args.root, 'reports', 'property-wp9'));
  return args;
}

export function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

export function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, 'utf8');
}
