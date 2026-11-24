import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../src/lib/group-sports/boxing-config.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {BOX_WEIGHTS,BOX_CODES,weightFits}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const sql=fs.readFileSync(new URL('../supabase/migrations/202611240046_sports_boxing_v33_30.sql',import.meta.url),'utf8');
test('26 existing event codes and 13 weight ranges',()=>{assert.equal(BOX_WEIGHTS.length,13);assert.equal(new Set(BOX_CODES).size,26)});
test('exclusive lower / inclusive upper boundaries, both sexes',()=>{for(let i=0;i<BOX_WEIGHTS.length;i++){for(const g of ['M','F']){const lo=BOX_WEIGHTS[i],hi=BOX_WEIGHTS[i+1],c=`GS3-BX-${lo}${g}`;assert.equal(weightFits(c,lo),false);assert.equal(weightFits(c,lo+.001),true);if(hi){assert.equal(weightFits(c,hi),true);assert.equal(weightFits(c,hi+.001),false)}}}});
test('invalid code and weight rejected',()=>{assert.equal(weightFits('GS3-BX-76M',80),false);assert.equal(weightFits('GS3-BX-36M',NaN),false);assert.equal(weightFits('GS3-BX-36M',Infinity),false)});
// Independent model of SQL seed algorithm. This is not a PostgreSQL execution test.
function simulate(n){let size=2;while(size<n)size*=2;let prev=[];let total=0,byes=0,played=0,bronze=0;const seeds=Array.from({length:n},(_,i)=>i+1);for(let pairs=size/2;pairs>=1;pairs/=2){let next=[];for(let i=0;i<pairs;i++){const a=total===0?seeds[i]:prev[2*i];const b=total===0?seeds[i+pairs]:prev[2*i+1];assert.ok(a);if(!b){assert.equal(total,0);byes++}else{assert.notEqual(a,b);played++;if(pairs===2)bronze++}next.push(a)}total+=pairs;prev=next}return {total,byes,played,bronze,size}}
test('model: knockout for each field size 2–64',()=>{for(let n=2;n<=64;n++){const x=simulate(n);assert.equal(x.played,n-1);assert.equal(x.byes,x.size-n);assert.equal(x.total,x.size-1);assert.equal(x.bronze,Math.min(n-2,2))}});
test('static SQL: private data has no direct grants; public RPC excludes weights',()=>{assert.match(sql,/revoke all on public\.sports_boxing_checks,public\.sports_boxing_draws,public\.sports_boxing_bouts,public\.sports_boxing_audit from public,anon,authenticated/);const block=sql.split('create or replace function public.sports_boxing_public')[1].split('create or replace function')[0];assert.doesNotMatch(block,/weight_kg|athlete_snapshot|full_name|cleared/)});
