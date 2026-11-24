import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const rows=JSON.parse(readFileSync(new URL('../src/lib/group-sports/athletics-schedule.json',import.meta.url),'utf8'));
const sql=readFileSync(new URL('../supabase/migrations/202611240047_sports_athletics_v33_31.sql',import.meta.url),'utf8');
const mins=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
test('84 unique schedule numbers exactly per revised PDF',()=>{assert.deepEqual(rows.map(x=>x.no),[...Array.from({length:33},(_,i)=>101+i),...Array.from({length:33},(_,i)=>201+i),...Array.from({length:18},(_,i)=>301+i)]);});
test('33/33/18 and 30 qualifying 54 final',()=>{assert.deepEqual(['2026-12-09','2026-12-10','2026-12-11'].map(d=>rows.filter(x=>x.date===d).length),[33,33,18]);assert.equal(rows.filter(x=>x.round==='คัดเลือก').length,30);assert.equal(rows.filter(x=>x.round==='ชิงชนะเลิศ').length,54);});
test('54 original event codes; 30 paired, all single-round events are finals',()=>{const groups=new Map();for(const r of rows)groups.set(r.code,[...(groups.get(r.code)||[]),r]);assert.equal(groups.size,54);assert.equal([...groups.values()].filter(g=>g.length===2).length,30);for(const g of groups.values())if(g.length===2){assert.equal(g[0].round,'คัดเลือก');assert.equal(g[1].round,'ชิงชนะเลิศ');assert.ok(g[0].date+' '+g[0].start<g[1].date+' '+g[1].start);}assert.deepEqual([...groups.values()].filter(g=>g.length===1&&g[0].round==='คัดเลือก').map(g=>g[0].no),[]);});
test('report exactly 30 minutes before start',()=>{assert.ok(rows.every(x=>mins(x.start)-mins(x.report)===30));});
test('24 relay slots, 14 field slots, 46 track slots',()=>{assert.deepEqual(['track','relay','field'].map(k=>rows.filter(x=>x.kind===k).length),[46,24,14]);});
test('SQL seed and JSON use identical values',()=>{for(const x of rows)assert.ok(sql.includes(`(${x.no},'${x.code}','${x.label}','${x.date}','${x.report}','${x.start}','${x.round}','${x.kind}')`),String(x.no));});
test('SQL contains role separation, private tables, no automatic old registration deletion',()=>{assert.match(sql,/sports_ath_access\(r.event_id,'call'\)/);assert.match(sql,/sports_ath_access\(r.event_id,'field'\)/);assert.match(sql,/revoke all on public.sports_ath_rounds,public.sports_ath_duties,public.sports_ath_people,public.sports_ath_audit/);assert.doesNotMatch(sql,/delete\s+from\s+public\.sports_entries\b/i);});

test('109 is the corrected final; cleanup is scoped to athletics and blocks repeat install',()=>{assert.equal(rows.find(x=>x.no===109).round,'ชิงชนะเลิศ');assert.match(sql,/ss\.competition_id=comp and e\.competition_id=comp and ss\.event_id=e\.id/);assert.match(sql,/e\.event_type='athletics' and e\.event_code like 'GS3-AT-%'/);assert.match(sql,/if already_installed then raise exception/);assert.ok(sql.indexOf('begin;')<sql.indexOf('delete from public.sports_schedule_sessions'));});
