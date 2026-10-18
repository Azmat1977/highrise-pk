#!/usr/bin/env node
/** Highrise.pk source-security regression gate. No network access required. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];
const fail = (m) => failures.push(m);
const warn = (m) => warnings.push(m);

function read(rel) {
  const p = path.join(root, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git', 'out', 'build', 'coverage'].includes(entry.name)) continue;
      walk(full, out);
    } else out.push(full);
  }
  return out;
}

for (const required of ['package.json', 'next.config.js', 'middleware.ts', 'tsconfig.json', '.gitignore']) {
  if (!exists(required)) fail(`Required project file is missing: ${required}`);
}

const gitignore = read('.gitignore');
if (!/(^|\n)\.env\*\s*($|\n)/m && !/(^|\n)\.env\.local\s*($|\n)/m) fail('.gitignore must exclude environment files.');
if (!/public\/uploads/.test(gitignore)) fail('.gitignore must exclude public/uploads/.');

const publicUploads = path.join(root, 'public', 'uploads');
if (fs.existsSync(publicUploads)) {
  const files = walk(publicUploads).filter((p) => path.basename(p) !== '.gitkeep');
  if (files.length) fail(`public/uploads contains ${files.length} file(s). User/KYC uploads must never ship from Next.js public/.`);
}

const publicFiles = walk(path.join(root, 'public'));
const sensitiveName = /(?:cnic|nic[-_ ]?card|id[-_ ]?card|passport|ownership[-_ ]?(?:proof|document)|registry|sale[-_ ]?deed|kyc)/i;
for (const file of publicFiles) {
  if (sensitiveName.test(path.basename(file)) && /\.(?:pdf|jpe?g|png|webp|docx?)$/i.test(file)) {
    fail(`Potential sensitive document under public/: ${path.relative(root, file)}`);
  }
}

const sourceRoots = ['pages', 'components', 'lib', 'models', 'hooks', 'utils', 'types'];
const sourceFiles = sourceRoots.flatMap((rel) => walk(path.join(root, rel))).filter((f) => /\.(?:[cm]?[jt]sx?)$/i.test(f));
const forbiddenPatterns = [
  [/NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET/g, 'browser-exposed Cloudinary upload preset'],
  [/api\.cloudinary\.com\/v1_1/g, 'direct browser Cloudinary API upload'],
  [/upload_preset\s*[:=]/g, 'Cloudinary unsigned upload preset usage'],
  [/rejectUnauthorized\s*:\s*false/g, 'TLS certificate validation bypass'],
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, 'embedded private key'],
  [/mongodb\+srv:\/\/[^\s:'"`]+:[^\s@'"`]+@/g, 'embedded MongoDB credentials'],
];
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const [rx, label] of forbiddenPatterns) {
    rx.lastIndex = 0;
    if (rx.test(text)) fail(`${label}: ${path.relative(root, file)}`);
  }
}

if (exists('public/robots.txt') && exists('pages/robots.txt.tsx')) fail('Both public/robots.txt and pages/robots.txt.tsx exist. Keep one canonical /robots.txt implementation.');

let pkg;
try { pkg = JSON.parse(read('package.json')); } catch { fail('package.json is invalid JSON.'); pkg = {}; }
const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
const expected = {
  next: '15.5.25',
  'next-auth': '4.24.15',
  react: '18.3.1',
  'react-dom': '18.3.1',
  'highrise-nodemailer': 'npm:nodemailer@9.1.1',
  axios: '1.19.0',
  mongoose: '7.8.11',
  'eslint-config-next': '15.5.22',
  eslint: '9.39.5',
  '@types/react': '18.3.31',
  '@types/react-dom': '18.3.7',
};
for (const [name, version] of Object.entries(expected)) {
  if (deps[name] !== version) fail(`package.json must pin ${name} to ${version}; found ${deps[name] ?? 'missing'}.`);
}
for (const banned of ['nodemailer', 'next-cloudinary', '@next-auth/mongodb-adapter', '@tanstack/react-query', 'react-icons', 'swr']) {
  if (deps[banned]) fail(`Unused/retired direct dependency should be removed: ${banned}.`);
}
const tiptapVersions = Object.entries(pkg.dependencies ?? {}).filter(([name]) => name.startsWith('@tiptap/')).map(([, v]) => v);
if (tiptapVersions.length && new Set(tiptapVersions).size !== 1) fail('Direct @tiptap/* packages must be aligned to one exact version.');

const nextConfig = read('next.config.js');
if (!/poweredByHeader\s*:\s*false/.test(nextConfig)) fail('next.config.js must disable the X-Powered-By header.');
if (/ignoreDuringBuilds\s*:\s*true/.test(nextConfig)) fail('next.config.js must not hide ESLint failures during production builds.');
if (!/Content-Security-Policy/.test(nextConfig)) fail('next.config.js must set Content-Security-Policy.');

const staleLock = exists('package-lock.json');
if (!staleLock) {
  warn('package-lock.json is absent. This is expected in the Batch 2 handoff until you run a clean npm install locally.');
} else {
  try {
    const lock = JSON.parse(read('package-lock.json'));
    const rootPkg = lock.packages?.[''];
    if (!rootPkg) warn('package-lock.json does not expose a root package record; regenerate it locally.');
    else {
      const declared = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
      const lockedRoot = { ...(rootPkg.dependencies ?? {}), ...(rootPkg.devDependencies ?? {}) };
      const mismatches = Object.entries(declared).filter(([name, version]) => lockedRoot[name] !== version);
      if (mismatches.length) fail(`package-lock.json is stale for ${mismatches.length} direct dependency declaration(s). Regenerate it with a clean npm install.`);
    }
  } catch { fail('package-lock.json is invalid JSON.'); }
}

console.log('=== Highrise.pk Source Security Gate ===');
console.log(`Scanned ${sourceFiles.length} source files and ${publicFiles.length} public files.`);
for (const m of warnings) console.warn(`WARN: ${m}`);
for (const m of failures) console.error(`FAIL: ${m}`);
if (failures.length) {
  console.error(`\nSource security gate FAILED with ${failures.length} blocking issue(s).`);
  process.exit(1);
}
console.log(`\nPASS: Source security gate completed with ${warnings.length} warning(s).`);
