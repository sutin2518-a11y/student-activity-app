begin;
create or replace function public.sports_registration_excel(p_comp uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  admin_scope boolean := public.sports_stage3_admin(p_comp);
  school_ids uuid[];
begin
  select array(select distinct r.school_id from public.sports_user_roles r
    where r.user_id=auth.uid() and r.is_active and r.role='school_manager'
    and r.school_id is not null and (r.competition_id=p_comp or r.competition_id is null))
    into school_ids;
  if auth.uid() is null or (not coalesce(admin_scope,false) and cardinality(school_ids)=0) then
    raise exception 'ไม่มีสิทธิ์ดาวน์โหลดทะเบียน' using errcode='42501';
  end if;
  return (select jsonb_build_object('exported_at',statement_timestamp(),
    'scope',case when admin_scope then 'ทุกโรงเรียน' else 'โรงเรียนที่ได้รับมอบหมาย' end,
    'entries',coalesce(jsonb_agg(jsonb_build_object(
      'id',en.id,'school',sc.name,'code',ev.event_code,'event',ev.sport_name,
      'team',en.entry_name,'status',en.status,'updated',en.updated_at,
      'phone',tt.phone,'team_name',vf.team_name,'shirt',vf.shirt_color,'shorts',vf.shorts_color,
      'staff',case when jsonb_array_length(st.coaches)>0 then st.coaches else
        jsonb_build_array(jsonb_build_object('name',en.coach_name),jsonb_build_object('name',en.assistant_coach)) end,
      'players',(select coalesce(jsonb_agg(jsonb_build_object(
        'id',a.id,'name',a.full_name,'student',a.student_code,'grade',a.grade_level,
        'gender',a.gender,'ign',a.ign,'role',a.team_role,'position',a.play_position,
        'birth',coalesce(v.birth_date,t.birth_date,x.birth_date,f.birth_date),
        'jersey',coalesce(v.jersey_number,t.jersey_number::text,f.jersey_number::text),
        'player_role',f.player_role,'note',coalesce(v.note,f.player_note),
        'weight',v.weight_kg,'height',v.height_cm)
        order by a.roster_position nulls last,a.full_name,a.id),'[]'::jsonb)
        from public.sports_athletes a
        left join public.sports_football_player_details f on f.entry_id=a.entry_id and f.roster_position=a.roster_position
        left join public.sports_volleyball_player_forms v on v.athlete_id=a.id
        left join public.sports_takraw_player_forms t on t.athlete_id=a.id
        left join public.sports_tt_player_forms x on x.athlete_id=a.id where a.entry_id=en.id)
    ) order by sc.name,ev.sport_name,en.id),'[]'::jsonb))
    from public.sports_entries en join public.sports_schools sc on sc.id=en.school_id
    join public.sports_events ev on ev.id=en.event_id and ev.competition_id=p_comp
    left join public.sports_roster_staff st on st.entry_id=en.id
    left join public.sports_tt_entry_forms tt on tt.entry_id=en.id
    left join public.sports_volleyball_forms vf on vf.entry_id=en.id
    where en.competition_id=p_comp and (admin_scope or en.school_id=any(school_ids)));
end $$;
revoke all on function public.sports_registration_excel(uuid) from public,anon,authenticated;
grant execute on function public.sports_registration_excel(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
