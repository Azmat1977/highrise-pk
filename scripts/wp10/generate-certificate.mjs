#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const ev=process.argv[2], out=process.argv[3];
if(!ev||!out){console.error('Usage: node generate-certificate.mjs <evidence.json> <certificate.md>');process.exit(2);}
const here=path.dirname(new URL(import.meta.url).pathname);
const check=spawnSync(process.execPath,[path.join(here,'validate-evidence.mjs'),ev],{stdio:'inherit'});
if(check.status!==0){console.error('BLOCKED: certificate not generated');process.exit(1);}
const d=JSON.parse(fs.readFileSync(path.resolve(ev),'utf8'));
const pass=d.results.filter(x=>x.status==='PASS').length;
const na=d.results.filter(x=>x.status==='NA_WITH_JUSTIFICATION').length;
const body=`# HIGHRISE SECTION 01 — PROPERTY — CERTIFIED FOR VERIFIED CORE LAUNCH

- WP9 automated certification: PASS
- WP10 manual/browser/API certification: PASS
- WP10 PASS cases: ${pass}
- WP10 justified N/A cases: ${na}
- WP10 total cases: ${d.results.length}
- Source fingerprint/commit: ${d.execution.gitCommitOrSourceFingerprint}
- Tested base URL: ${d.execution.baseUrl}
- WP9 evidence: ${d.execution.wp9ReportPath}
- WP10 completed: ${d.execution.completedAt||'recorded in evidence file'}

This certificate applies only to the tested source fingerprint/environment. Material Property/auth/authorization/lifecycle/storage/routing/dependency changes require appropriate regression review.
`;
fs.writeFileSync(path.resolve(out),body,'utf8');
console.log(`PASS: certificate generated at ${path.resolve(out)}`);
