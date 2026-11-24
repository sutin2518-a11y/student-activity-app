import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const nav=read('src/components/group-sports/GroupSportsDashboard.tsx');
const form=read('src/components/group-sports/CertificatesDashboard.tsx');
const officials=read('src/components/group-sports/SportsOfficialsAccessManager.tsx');
const sql=read('supabase/migrations/202611230031_sports_results_instant_publish_v33_8.sql');
test('award ranking and match results have distinct labels and existing route/permissions',()=>{
  assert.match(nav,/key: "matches", label: "ผลการแข่งขัน"/);
  assert.match(nav,/key: "schedule", label: "โปรแกรมแข่งขัน"/);
  assert.match(nav,/\{canManageCertificates && <>\s*<Link href="\/group-sports\/results"/);
  assert.match(nav,/<TrophyIcon[^>]*\/><span>บันทึกอันดับรางวัล<\/span>/);
  assert.match(officials,/<option value="certificate">บันทึกอันดับรางวัลรายการนี้<\/option>/);
  assert.doesNotMatch(nav,/บันทึกผลและประกาศผลทันที \(กรรมการ\)/);
});
test('record form keeps existing scoped RPC and checks response rather than assuming publication',()=>{
  assert.match(form,/mode==="manage"&&screen==="record"&&\(context.role==="official"\|\|context.role==="admin"\)&&event.can_record/);
  assert.match(form,/eventReady&&event\?\.can_record/);
  assert.match(form,/new Set\(placements.map\(p=>p.entry_id\)\).size===placements.length&&!published/);
  assert.match(form,/sports_cert_submit",\{p_event:event.id,p_awards:placements\}/);
  assert.match(form,/status==="published"\?"บันทึกอันดับรางวัลและออกเกียรติบัตรแล้ว"/);
  assert.match(form,/ยืนยันบันทึกอันดับรางวัล/);
  assert.doesNotMatch(form,/sports_cert_review|ส่งผลให้ผู้ดูแลตรวจสอบ/);
  assert.match(sql,/perform public.sports_cert_issue_internal\(p_event,'award'\)/);
});
test('medal styling and event-specific 3/4 slot rules stay intact; loading data is event scoped',()=>{
  assert.match(form,/emptyPlacements\(singleBronze\(event\)\)/);
  assert.match(form,/event.event_type==="athletics" \|\| \["GS3-BB-15M","GS3-BB-15F","GS3-BB-UF"\]/);
  assert.match(form,/อันดับ \{item.rank\}\{item.slot===2\?" ร่วม":""\}/);
  assert.match(form,/border-amber-200 bg-amber-50/);
  assert.match(form,/border-orange-200 bg-orange-50/);
  assert.match(form,/if\(request!==eventRequest.current\)return/);
  assert.match(form,/loadedEventId===event.id/);
  assert.match(form,/disabled=\{busy\|\|published\}/);
  assert.match(sql,/v_expected:=case when v_event.event_type='athletics' then 3 else 4 end/);
});
