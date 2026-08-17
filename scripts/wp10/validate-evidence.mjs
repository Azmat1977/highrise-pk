#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const file=process.argv[2];
if(!file){console.error('Usage: node validate-evidence.mjs <WP10_EVIDENCE.json>');process.exit(2);}
const p=path.resolve(file);
if(!fs.existsSync(p)){console.error(`BLOCKED: missing ${p}`);process.exit(1);}
const d=JSON.parse(fs.readFileSync(p,'utf8'));
const problems=[];
const e=d.execution||{};
if(e.wp9Status!=='PASS') problems.push(`WP9 status must be PASS; got ${e.wp9Status??'missing'}`);
if(!e.gitCommitOrSourceFingerprint) problems.push('Source fingerprint/commit missing');
if(!e.baseUrl) problems.push('Base URL missing');
if(!e.wp9ReportPath) problems.push('WP9 report path missing');
const allowed=new Set(['NOT_RUN','PASS','FAIL','BLOCKED','NA_WITH_JUSTIFICATION']);
let pass=0,fail=0,blocked=0,notRun=0,na=0;
for(const r of (d.results||[])){
  if(!allowed.has(r.status)) problems.push(`${r.id}: invalid status ${r.status}`);
  if(r.status==='PASS'){
    pass++;
    if(!String(r.observed||'').trim()) problems.push(`${r.id}: PASS requires observed result`);
    if(!Array.isArray(r.evidencePaths)||r.evidencePaths.length===0) problems.push(`${r.id}: PASS requires evidencePaths`);
  } else if(r.status==='FAIL') fail++;
  else if(r.status==='BLOCKED') blocked++;
  else if(r.status==='NOT_RUN') notRun++;
  else if(r.status==='NA_WITH_JUSTIFICATION'){
    na++;
    if(!String(r.notes||'').trim()) problems.push(`${r.id}: N/A requires justification`);
  }
}
if(fail) problems.push(`${fail} FAIL test(s)`);
if(blocked) problems.push(`${blocked} BLOCKED test(s)`);
if(notRun) problems.push(`${notRun} NOT_RUN test(s)`);
console.log(`WP10 summary: PASS=${pass} FAIL=${fail} BLOCKED=${blocked} NOT_RUN=${notRun} NA=${na} TOTAL=${(d.results||[]).length}`);
if(problems.length){
 console.error('WP10 CERTIFICATION: BLOCKED/FAILED');
 for(const x of problems) console.error(`- ${x}`);
 process.exit(1);
}
console.log('WP10 EVIDENCE VALIDATION: PASS');
