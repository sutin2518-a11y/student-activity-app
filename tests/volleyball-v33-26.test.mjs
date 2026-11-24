import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {calculateVolleyballScore as score} from '../src/lib/group-sports/volleyball-score.ts';
const d=JSON.parse(fs.readFileSync(new URL('../setup/volleyball_2569_draft.json',import.meta.url),'utf8'));
test('93 fixtures; 51 group teams; unique event + match number',()=>{
 assert.equal(d.fixtures.length,93);assert.equal(Object.values(d.groups).flat(2).length,51);assert.equal(new Set(d.fixtures.map(r=>`${r.event_code}:${r.match_no}`)).size,93);
 assert.deepEqual(Object.fromEntries(Object.keys(d.groups).map(c=>[c,d.fixtures.filter(r=>r.event_code===c).length])),{'GS3-VB-15F':25,'GS3-VB-OF':22,'GS3-VB-15M':15,'GS3-VB-OM':31});
});
test('every round-robin pair occurs once within correct group',()=>{for(const [code,groups] of Object.entries(d.groups)){const expected=groups.flatMap(g=>g.flatMap((a,i)=>g.slice(i+1).map(b=>[a,b].sort().join(':')))).sort();const actual=d.fixtures.filter(r=>r.event_code===code&&r.stage==='group').map(r=>[r.a,r.b].sort().join(':')).sort();assert.deepEqual(actual,expected);}});
test('knockout references remain within same event and precede next round',()=>{for(const r of d.fixtures)for(const s of [r.a,r.b])if(/^W\d+$/.test(s)){const m=d.fixtures.find(x=>x.event_code===r.event_code&&x.match_no===Number(s.slice(1)));assert.ok(m);assert.ok(m.date<r.date);}});
test('all combined page semi/final venues are pending; no seeded published results',()=>{assert.ok(d.fixtures.filter(r=>['semifinal','final'].includes(r.stage)).every(r=>!r.venue&&r.note));assert.ok(d.fixtures.filter(r=>['group','quarter'].includes(r.stage)).every(r=>r.venue));});
test('valid 2–0 and 2–1, deuce and 15-point decider',()=>{assert.equal(score([[25,17],[28,26]],false).totalA,2);assert.equal(score([[25,17],[22,25],[16,14]],false).totalA,2);});
test('valid final 3–0 and 3–2',()=>{assert.equal(score([[25,17],[25,23],[25,19]],true).totalA,3);assert.equal(score([[25,20],[20,25],[25,23],[24,26],[15,12]],true).totalA,3);});
test('reject bad score, missing sets, extra sets and nonintegers',()=>{for(const s of [[[25,24],[25,19]],[[26,15],[25,18]],[[25,18],[18,25]],[[25,18],[25,18],[15,10]],[[25,18],['',25]],[[25,18],[25,18.5]]])assert.throws(()=>score(s,false));});
