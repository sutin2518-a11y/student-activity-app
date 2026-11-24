import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/202611240039_sports_practice_v33_22.sql');
const ui=read('src/components/group-sports/SportsPracticeCenter.tsx');
test('sandbox has no live DML and no live storage or publication calls',()=>{
 const targets=[...sql.matchAll(/\b(?:insert\s+into|update|delete\s+from)\s+public\.(\w+)/gi)].map(m=>m[1]);
 assert.ok(targets.length>=6); assert.ok(targets.every(t=>['sports_practice_workspaces','sports_practice_reset_audit'].includes(t)));
 assert.doesNotMatch(sql,/sports_cert_submit\s*\(|sports_admin_reset\s*\(|sports_cert_issue_internal\s*\(/i);
 assert.doesNotMatch(ui,/supabase\.from\(|supabase\.storage\.|sports_cert_submit|sports_admin_reset/);
});
test('authenticated RPC and explicit admin / assigned-event checks',()=>{
 assert.match(sql,/enable row level security/g); assert.match(sql,/revoke all on public\.sports_practice_workspaces,public\.sports_practice_reset_audit from public,anon,authenticated/);
 assert.match(sql,/auth\.uid\(\) is null/); assert.match(sql,/v_admin or public\.sports_cert_can_record\(p_event\)/);
 assert.match(sql,/p_action in \('preview_all','reset_all'\)[\s\S]*?if not v_admin/);
 assert.match(sql,/grant execute on function public\.sports_practice_action\(text,uuid,jsonb,text\) to authenticated/);
});
test('atomic snapshot with distinct placements, revision lock and generated test docs',()=>{
 assert.match(sql,/pg_advisory_xact_lock\(3322,39\)/);assert.match(sql,/p_revision is distinct from v_row\.revision::text/);
 assert.match(sql,/count\(distinct x\)/); assert.match(sql,/jsonb_array_length\(v_state->'rankings'\)>0/);
 assert.match(sql,/'rankings',v_result,'medals',v_medals,'certificates',v_certs/);assert.match(sql,/'test',true/);
 assert.match(ui,/practice-watermark/); assert.match(ui,/ไม่มีเลขทะเบียนจริง \/ QR \/ ลายเซ็น/);
});
test('reset confirmation, stale preview, results-only reset keeps teams, and backup UI',()=>{
 assert.match(sql,/p_revision is distinct from v_token or p_payload->>'confirm' is distinct from 'ลบเฉพาะ TEST'/);
 assert.match(sql,/state=state\|\|jsonb_build_object\('matches','\[\]'::jsonb,'rankings','\[\]'::jsonb,'medals','\[\]'::jsonb,'certificates','\[\]'::jsonb/);
 assert.match(sql,/insert into public\.sports_practice_reset_audit/);assert.match(ui,/ดาวน์โหลดสำรอง JSON/);
 assert.match(read('src/components/group-sports/SportsResetManager.tsx'),/เมนูนี้ลบข้อมูลในตารางจริง/);
});
