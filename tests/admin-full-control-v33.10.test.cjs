const assert = require('node:assert/strict');
const {readFileSync,existsSync} = require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const sql=readFileSync(path.join(root,'supabase/migrations/202611230033_sports_admin_full_control_v33_10.sql'),'utf8');
const ui=readFileSync(path.join(root,'src/components/group-sports/SportsAdminFullControl.tsx'),'utf8');
const shell=readFileSync(path.join(root,'src/components/group-sports/GroupSportsDashboard.tsx'),'utf8');
for(const name of ['sports_admin_registration_list','sports_admin_registration_detail','sports_admin_update_registration']){
  assert.ok(sql.includes(`public.${name}`),`${name} missing`);
}
assert.ok(sql.includes('public.sports_stage3_admin'), 'Backend requires admin rights');
assert.ok(sql.includes('p_expected_updated_at'), 'Stale update protection missing');
assert.ok(sql.includes('v_before_players') && sql.includes('v_after_players'), 'Before/after audit missing');
assert.ok(sql.includes('revoked_at=v_now') && sql.includes('admin-edit:'),'Certificate revocation/reissue missing');
assert.ok(sql.includes('sports_football_player_details') && sql.includes('sports_roster_staff'), 'Football / coach mapping missing');
assert.ok(sql.includes('sports_event_results set entry_name'), 'Result entry title sync missing');
assert.ok(sql.includes("on delete restrict") && !sql.includes('entry_id uuid not null references public.sports_entries'), 'Reset history must survive registration deletion');
assert.ok(!sql.includes('sports_register_roster('), 'Do not overwrite standard school registration API');
assert.ok(ui.includes('sports_admin_update_registration') && ui.includes('AthletePhotoManager'), 'Admin roster save / photos missing');
assert.ok(shell.includes('Admin Full Control') && shell.includes('/group-sports/admin?entry='), 'Admin navigation / deep link missing');
assert.ok(existsSync(path.join(root,'src/app/group-sports/admin/page.tsx')));
console.log('v33.10 offline structural checks: PASS (15 checks)');
