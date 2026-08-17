import fs from 'node:fs';
import path from 'node:path';
import { runCommand, result, summary } from './lib/common.mjs';
import { CANONICAL_BUILD_SCRIPT_PREFERENCES } from './wp9-config.mjs';

function packageScripts(root) {
  try {
    return JSON.parse(fs.readFileSync(`${root}/package.json`, 'utf8')).scripts || {};
  } catch {
    return {};
  }
}

function chooseScript(scripts, preferences) {
  return preferences.find((name) => typeof scripts[name] === 'string') || null;
}

export function runCanonicalQualityGates(root, options = {}) {
  const scripts = packageScripts(root);
  const results = [];
  const commands = [];

  const selected = {
    env: chooseScript(scripts, CANONICAL_BUILD_SCRIPT_PREFERENCES.env),
    security: chooseScript(scripts, CANONICAL_BUILD_SCRIPT_PREFERENCES.security),
    lint: chooseScript(scripts, CANONICAL_BUILD_SCRIPT_PREFERENCES.lint),
    typecheck: chooseScript(scripts, CANONICAL_BUILD_SCRIPT_PREFERENCES.typecheck),
    build: chooseScript(scripts, CANONICAL_BUILD_SCRIPT_PREFERENCES.build),
  };

  if (selected.env) {
    const envArgs = ['run', selected.env];
    if (selected.env === 'verify:env') envArgs.push('--', '--production');
    commands.push(['env', 'npm', envArgs]);
  }
  if (selected.security) commands.push(['security', 'npm', ['run', selected.security]]);
  commands.push(['audit-production', 'npm', ['audit', '--omit=dev', '--audit-level=moderate']]);
  commands.push(['audit-full', 'npm', ['audit', '--audit-level=high']]);
  if (selected.lint) commands.push(['lint', 'npm', ['run', selected.lint]]);

  if (selected.typecheck) commands.push(['typecheck', 'npm', ['run', selected.typecheck]]);
  else commands.push(['typecheck', 'npx', ['tsc', '--noEmit', '--pretty', 'false']]);

  if (selected.build && !options.skipBuild) {
    commands.push(['clean-build', 'node', ['-e', "require('fs').rmSync('.next',{recursive:true,force:true})"]]);
    commands.push(['build', 'npm', ['run', selected.build]]);
  }

  for (const [name, cmd, args] of commands) {
    const run = runCommand(cmd, args, { cwd: root, env: { NODE_ENV: name === 'build' ? 'production' : process.env.NODE_ENV || 'test' } });
    results.push(result(`QUALITY-${name.toUpperCase()}`, run.status === 0, `${name} gate exits successfully`, { command: run.command, status: run.status, signal: run.signal, stdoutTail: run.stdout.slice(-6000), stderrTail: run.stderr.slice(-6000) }));
  }

  if (selected.build && !options.skipBuild) {
    const buildIdPath = path.join(root, '.next', 'BUILD_ID');
    results.push(result(
      'QUALITY-BUILD-ID',
      fs.existsSync(buildIdPath),
      'Clean Next.js production build produced .next/BUILD_ID',
      { buildIdPath },
    ));
  }

  for (const mandatory of ['lint', 'build']) {
    if (!selected[mandatory] && !(mandatory === 'build' && options.skipBuild)) {
      results.push(result(`QUALITY-MISSING-${mandatory.toUpperCase()}`, false, `package.json does not expose a ${mandatory} script required for canonical WP9 certification`, Object.keys(scripts)));
    }
  }

  return { name: 'canonical-quality-gates', results, summary: summary(results) };
}
