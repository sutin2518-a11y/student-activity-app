from pathlib import Path
import json,collections,zipfile,re,sys
root=Path('/mnt/data/build-v32')
source=json.loads((root/'setup/football_2569_verified.json').read_text())
expected={'GS3-FB-13M':9,'GS3-FB-15M':17,'GS3-FB-UM':16,'GS3-FB-UF':9}
assert dict(collections.Counter(m['code'] for m in source['matches']))==expected
assert len(source['matches'])==51
for event_code in expected:
 matches=[m for m in source['matches'] if m['code']==event_code]
 assert len(matches)==len(set(m['number'] for m in matches))
 assert len([m for m in matches if m['stage']=='final'])==1
 assert all(m['date'] and m['time'] and m['venue'] for m in matches)
assert not any(a is not b and (a['date'],a['time'],a['venue'])==(b['date'],b['time'],b['venue']) for a in source['matches'] for b in source['matches'])
sql=(root/'supabase/migrations/202611230026_sports_football_four_categories.sql').read_text()
assert 'begin;' in sql and sql.rstrip().endswith("notify pgrst, 'reload schema';")
assert sql.count('create or replace function public.sports_football_')>=4
assert 'sports_stage3_admin' in sql and 'school_manager' in sql
assert 'ON CONFLICT' not in sql or 'on conflict' in sql
for code in expected: assert code in sql
for p in ['src/components/group-sports/FootballDashboard.tsx','src/app/group-sports/football/page.tsx','src/app/group-sports/football/print/page.tsx','src/lib/group-sports/football-config.ts','src/lib/group-sports/football-roster-excel.ts','public/docs/football/football-u13-boys-and-women.pdf','public/docs/football/football-u15-boys.pdf','public/docs/football/football-open-boys.pdf']:
 assert (root/p).exists(), p
main=(root/'src/components/group-sports/GroupSportsDashboard.tsx').read_text()
assert main.count('href="/group-sports/football"')==2
print('Verified 51 matches; duplicate slots 0; four categories; main nav links; 3 rule documents; 4 football RPCs')
