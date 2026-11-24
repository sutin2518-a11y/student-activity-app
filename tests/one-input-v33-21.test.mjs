import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/202611240038_sports_one_input_v33_21.sql');
const form=read('src/components/group-sports/CertificatesDashboard.tsx');
const field=read('src/app/group-sports/officials/my/page.tsx');
test('verified Google assignment stays event- and competition-scoped; printing not broadened',()=>{
 assert.match(sql,/u.email_confirmed_at is not null/);
 assert.match(sql,/i.provider='google'/);
 for(const table of ['sports_certificate_officials','sports_event_referees'])assert.match(sql,new RegExp(table+" o[\\s\\S]*?o.event_id=e.id and o.competition_id=e.competition_id and o.is_active"));
 assert.doesNotMatch(sql,/create or replace function public.sports_cert_my_documents|create or replace function public.sports_central_cert_documents/);
 assert.match(field,/certificates\/manage\?event=/);
 assert.match(form,/payload.events.some\(e=>e.id===requested\)/);
});
test('only complete unambiguous brackets suggest winners; no automatic publish from scores',()=>{
 assert.match(sql,/sports_football_matches/);assert.match(sql,/sports_esports_matches/);
 assert.match(sql,/v_names\[1\]=any\(v_winners\)/);assert.match(sql,/if v_count<>1 then return/);
 assert.match(form,/onClick=\{\(\)=>\{if\(window.confirm.*setPlacements\(suggestion.placements\)/);
 assert.match(form,/sports_cert_submit",\{p_event:event.id,p_awards:placements\}/);
});
test('transaction locks, checks consistency and preserves audited corrections',()=>{
 assert.match(sql,/pg_advisory_xact_lock\(pg_catalog.hashtext\(p_event::text\),94723\)/);
 assert.match(sql,/if v_status='published'/);
 assert.match(sql,/perform public.sports_cert_issue_internal\(p_event,'award'\);\s*if not coalesce/);
 assert.match(sql,/except all select m.school_id/);
 assert.match(sql,/sports_admin_correct_published_result/);
 assert.match(sql,/p_expected_updated_at/);
 assert.match(sql,/insert into public.sports_result_admin_corrections/);
 assert.equal((sql.match(/as restrictive for/g)||[]).length,6);
});
test('school printing refreshes and rejects revoked or changed documents',()=>{
 assert.match(form,/setInterval\(\(\)=>void refreshDocuments\(\),45_000\)/);
 assert.match(form,/valid.length!==ids.length/);
 assert.match(form,/sports_award_receipt/);
});
