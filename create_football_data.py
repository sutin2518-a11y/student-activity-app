import json,re,os
from pathlib import Path
base=Path('/mnt/data/build-v32')
src=json.loads((base/'setup/source_review.json').read_text())
EVENTS={
'GS3-FB-13M':('ฟุตบอล รุ่นอายุไม่เกิน 13 ปี ชาย','โรงเรียนภูซางวิทยาคม','football-u13-boys.pdf','13m'),
'GS3-FB-15M':('ฟุตบอล รุ่นอายุไม่เกิน 15 ปี ชาย','โรงเรียนฝายกวางวิทยาคม','football-u15-boys.pdf','15m'),
'GS3-FB-UM':('ฟุตบอล รุ่นไม่จำกัดอายุ ชาย','โรงเรียนเชียงคำวิทยาคม','football-open-boys.pdf','um'),
'GS3-FB-UF':('ฟุตบอล รุ่นไม่จำกัดอายุ หญิง','โรงเรียนภูซางวิทยาคม','football-u13-boys.pdf','uf'),
}
GROUPS={
'GS3-FB-13M':{'A':['เฉลิมพระเกียรติสมเด็จพระศรีนครินทร์ พะเยา','เชียงคำวิทยาคม','พะเยาพิทยาคม'],'B':['ภูซางวิทยาคม','ปงรัชดาภิเษก','จุนวิทยาคม']},
'GS3-FB-UF':{'A':['ปงรัชดาภิเษก','ภูซางวิทยาคม','ฝายกวางวิทยาคม'],'B':['ปงพัฒนาวิทยาคม','ดอกคำใต้วิทยาคม','ราชประชานุเคราะห์ 24']},
'GS3-FB-15M':{'A':['เชียงคำวิทยาคม','ปงรัชดาภิเษก','ภูซางวิทยาคม'],'B':['ดงเจนวิทยาคม','ราชประชานุเคราะห์ 24','เฉลิมพระเกียรติสมเด็จพระศรีนครินทร์ พะเยา'],'C':['ปงพัฒนาวิทยาคม','พะเยาพิทยาคม','จุนวิทยาคม'],'D':['ดอกคำใต้วิทยาคม','แม่ใจวิทยาคม']},
'GS3-FB-UM':{'A':['จุนวิทยาคม','แม่ใจวิทยาคม','พะเยาพิทยาคม'],'B':['ปงพัฒนาวิทยาคม','ปงรัชดาภิเษก','ภูซางวิทยาคม'],'C':['เฉลิมพระเกียรติสมเด็จพระศรีนครินทร์ พะเยา','ดงเจนวิทยาคม','เชียงคำวิทยาคม']},
}

def normalize(s):
 return re.sub(r'\s|โรงเรียน|ฯ|สมเด็จ|พระศรีนครินทร์|พะเยา$','',s).replace('วิทยคม','วิทยาคม')

def sqlquote(s):return "'"+str(s).replace("'","''")+"'"

def parse_pair(txt):
 match=re.split(r'\s+พบ\s+|\s*[–-]\s*',txt,maxsplit=1)
 return (match[0].strip(),match[1].strip()) if len(match)==2 else (txt,'')

matches=[]
for code in EVENTS:
 rows=[r for r in src['rows'] if r['event_code']==code]
 for row in rows:
  stage='group' if row['round_name']=='รอบแบ่งกลุ่ม' else ('quarter' if '8 ทีม' in row['round_name'] else 'semifinal' if 'รอง' in row['round_name'] else 'final')
  a,b=parse_pair(row['participants'])
  grp=''
  if stage=='group':
   for group,teams in GROUPS[code].items():
    if any(normalize(a) in normalize(team) or normalize(team) in normalize(a) for team in teams):
     if any(normalize(b) in normalize(team) or normalize(team) in normalize(b) for team in teams):
      grp=group;break
   if not grp:
    print('group not found',code,row['session_number'],a,b)
    # manual corrections for abbreviations
    group_map={'GS3-FB-13M':{1:'A',2:'B',5:'A',6:'B',9:'A',10:'B'},'GS3-FB-UF':{3:'A',4:'B',7:'A',8:'B',11:'A',12:'B'},'GS3-FB-15M':{1:'A',2:'B',3:'C',4:'D',5:'C',6:'B',7:'A',8:'A',9:'B',10:'C'},'GS3-FB-UM':{1:'A',2:'B',3:'C',4:'A',5:'B',6:'C',7:'A',8:'B',9:'C'}}
    grp=group_map[code][int(row['session_number'])]
  matches.append({'code':code,'number':int(row['session_number']),'date':row['session_date'],'time':row['start_time'],'stage':stage,'group':grp or None,'a':a,'b':b,'venue':EVENTS[code][1], 'source':row['source_ref'],'description':row['participants']})
assert len(matches)==51
# Store for test and UI reference
(base/'setup/football_2569_verified.json').write_text(json.dumps({'events':EVENTS,'groups':GROUPS,'matches':matches},ensure_ascii=False,indent=2))
# SQL seed groups and matches (not overwrite if already created)
event_vals=',\n'.join('('+','.join(sqlquote(x) for x in [code,meta[0],meta[1]])+')' for code,meta in EVENTS.items())
group_vals=',\n'.join('('+','.join([sqlquote(code),sqlquote(group),str(rank),sqlquote(team)])+')' for code,groups in GROUPS.items() for group,teams in groups.items() for rank,team in enumerate(teams,1))
match_vals=',\n'.join('('+','.join([sqlquote(m['code']),str(m['number']),sqlquote(m['date']),sqlquote(m['time']),sqlquote(m['stage']),sqlquote(m['group']) if m['group'] else 'null',sqlquote(m['a']),sqlquote(m['b']),sqlquote(m['venue']),sqlquote(m['description'])])+')' for m in matches)
(base/'setup/football_seed_fragments.sql').write_text(f'''-- All 51 original fixtures: 9 U13 boys + 17 U15 boys + 16 open boys + 9 open girls.
-- Do not overwrite schedule or results when a migration is retried.
with src(event_code,name,venue_name) as (values
{event_vals}
)
update public.sports_events e set sport_name=src.name,venue_name=src.venue_name,
  max_athletes_per_entry=20, points_win=3, points_draw=0, points_loss=0,
  updated_at=now()
from src where e.event_code=src.event_code and e.competition_id=(select id from public.sports_competitions where slug='phayao-secondary-group-sports-2569');

with src(event_code,group_code,seed_order,school_name) as (values
{group_vals}
)
insert into public.sports_football_group_teams(competition_id,event_id,group_code,seed_order,school_name)
select e.competition_id,e.id,src.group_code,src.seed_order,src.school_name from src join public.sports_events e on e.event_code=src.event_code
join public.sports_competitions c on c.id=e.competition_id and c.slug='phayao-secondary-group-sports-2569'
on conflict(event_id,group_code,school_name) do nothing;

with src(event_code,match_no,scheduled_date,start_time,stage,group_code,team1_name,team2_name,venue_name,source_participants) as (values
{match_vals}
)
insert into public.sports_football_matches(competition_id,event_id,match_no,scheduled_date,start_time,stage,group_code,team1_name,team2_name,venue_name,source_participants)
select e.competition_id,e.id,src.match_no,src.scheduled_date::date,src.start_time::time,src.stage,src.group_code,src.team1_name,src.team2_name,src.venue_name,src.source_participants
from src join public.sports_events e on e.event_code=src.event_code
join public.sports_competitions c on c.id=e.competition_id and c.slug='phayao-secondary-group-sports-2569'
on conflict(event_id,match_no) do nothing;
''')
for code in EVENTS:
 print(code,sum(m['code']==code for m in matches))
