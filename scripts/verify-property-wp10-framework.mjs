#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const required=[
'docs/WP10_README_FIRST.md','docs/WP10_BUILD_STATUS.md',
'docs/WP10_MANUAL_CERTIFICATION.md','docs/WP10_WINDOWS_RUNBOOK.md',
'docs/WP10_API_ABUSE_PRIVACY.md','docs/WP10_BROWSER_DEVICE_MATRIX.md',
'templates/WP10_TEST_MATRIX.json','templates/WP10_TEST_MATRIX.csv','templates/WP10_EVIDENCE_TEMPLATE.json',
'scripts/wp10/init-evidence.mjs','scripts/wp10/validate-evidence.mjs','scripts/wp10/generate-certificate.mjs',
'scripts/run-property-wp10.ps1'
];
let passed=0;
for(const rel of required){
 if(fs.existsSync(path.join(root,rel))){console.log(`PASS: ${rel}`);passed++;}
 else {console.error(`FAIL: missing ${rel}`);process.exitCode=1;}
}
const m=JSON.parse(fs.readFileSync(path.join(root,'templates/WP10_TEST_MATRIX.json'),'utf8'));
if(m.testCount===m.tests.length&&m.tests.length>=100){console.log(`PASS: matrix integrity (${m.tests.length})`);passed++;}else{console.error('FAIL: matrix integrity');process.exitCode=1;}
if(new Set(m.tests.map(x=>x.id)).size===m.tests.length){console.log('PASS: unique IDs');passed++;}else{console.error('FAIL: duplicate IDs');process.exitCode=1;}
if(new Set(m.tests.map(x=>x.category)).size===8){console.log('PASS: 8 certification categories');passed++;}else{console.error('FAIL: category coverage');process.exitCode=1;}
console.log(`WP10 framework self-test: ${passed}/${required.length+3}`);
if(process.exitCode)process.exit(process.exitCode);
