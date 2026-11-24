import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync('setup/futsal_2569_verified.json','utf8'));
const sql=readFileSync('supabase/migrations/202611240040_sports_futsal_v33_24.sql','utf8');
const ui=readFileSync('src/components/group-sports/FutsalDashboard.tsx','utf8');
test('official match totals, unique slots, chronological source references',()=>{
 assert.equal(data.matches.length,51);
 assert.equal(new Set(data.matches.map(m=>m.no)).size,51);
 assert.equal(new Set(data.matches.map(m=>m.date+' '+m.time)).size,51);
 for(const [code,count] of Object.entries({'15M':17,UM:22,UF:12})){
  const m=data.matches.filter(x=>x.code===code);assert.equal(m.length,count);assert.equal(m.filter(x=>x.stage==='final').length,1);assert.equal(m.filter(x=>x.stage==='semifinal').length,2);
  for(const x of m) for(const n of [x.a,x.b]) if(n.startsWith('W')) assert.ok(m.some(y=>y.no===+n.slice(1)&&y.no<x.no));
 }
 assert.deepEqual(data.matches.find(m=>m.no===49),{no:49,date:'2026-12-07',time:'15:00',code:'UM',group:null,stage:'final',a:'W43',b:'W44'});
});
test('all group matches are complete round robins with no duplicate teams or fixtures',()=>{
 for(const [code,groups] of Object.entries(data.groups))for(const [idx,group] of groups.entries()){
  const teams=group.split(' ');const fixtures=data.matches.filter(x=>x.code===code&&x.group==='ABCD'[idx]);
  const pairs=new Set(fixtures.map(x=>[x.a,x.b].sort().join(',')));assert.equal(pairs.size,teams.length*(teams.length-1)/2);assert.equal(fixtures.length,pairs.size);
  for(const x of fixtures) assert.ok(teams.includes(x.a)&&teams.includes(x.b)&&x.a!==x.b);
 }
});
test('SQL seeds every source fixture once and has scoped score and roster guards',()=>{
 for(const m of data.matches){assert.ok(sql.includes(`('GS3-FS-${m.code}',${m.no},'${m.date}','${m.time}','${m.stage}',${m.group?`'${m.group}'`:'null'},'${m.a}','${m.b}')`));}
 for(const t of ['sports_futsal_can_score','sports_futsal_slot_ok','sports_award_is_published','94723','p_expected','v_count<10 or v_count>14','2011-01-01','futsal matches RPC only','on conflict(event_id,match_no) do nothing'])assert.ok(sql.includes(t),t);
 assert.match(ui,/sports_futsal_save_match/);assert.match(ui,/sports_futsal_register/);assert.match(ui,/sports_futsal_publish/);
});
test('all central links point to real futsal routes; original PDF available',()=>{
 const dash=readFileSync('src/components/group-sports/GroupSportsDashboard.tsx','utf8');
 assert.match(dash,/isFutsal/);assert.match(dash,/\/group-sports\/futsal/);
 assert.match(readFileSync('src/components/group-sports/SportsScheduleContent.tsx','utf8'),/futsalIds/);
 assert.match(readFileSync('src/app/group-sports/futsal/page.tsx','utf8'),/FutsalDashboard/);
 assert.equal(readFileSync('public/docs/futsal/futsal-2569.pdf').subarray(0,4).toString(),'%PDF');
});
