#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const out=path.resolve(process.argv[2]||'./wp10-evidence');
const here=path.dirname(new URL(import.meta.url).pathname);
const root=path.resolve(here,'..','..');
const src=path.join(root,'templates','WP10_EVIDENCE_TEMPLATE.json');
if(!fs.existsSync(src)){console.error('BLOCKED: WP10 evidence template missing');process.exit(1);}
fs.mkdirSync(path.join(out,'evidence'),{recursive:true});
const dest=path.join(out,'WP10_EVIDENCE.json');
if(fs.existsSync(dest)){console.error(`BLOCKED: evidence already exists: ${dest}`);process.exit(1);}
fs.copyFileSync(src,dest);
console.log(`PASS: initialized ${dest}`);
