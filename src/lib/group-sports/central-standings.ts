import { matchSchool } from './football-config';

export type StandingSport = 'FB'|'FS'|'BB'|'VB'|'ST'|'ES';
export type Team = {id:string;school_name:string;group_code:string;seed_order:number};
export type GroupMatch = {id:string;group_code:string|null;stage:string;status:string;team1_name:string;team2_name:string;score1:number|null;score2:number|null;penalty1:number|null;penalty2:number|null;volleyball_forfeit:number|null;takraw_forfeit:number|null};
export type EsGroup = {id:string;group_code:string;sort_order:number};
export type EsTeam = {id:string;group_id:string;school_name:string;seed_order:number};
export type EsMatch = {id:string;group_id:string|null;stage:string;match_status:string;team1_id:string|null;team2_id:string|null;score1:number|null;score2:number|null;duration_minutes:number|null;team1_kills:number|null;team2_kills:number|null};
export type Row = {id:string;school:string;seed:number;played:number;win:number;loss:number;scored:number;conceded:number;points:number;forfeit:number;time:number;timeCount:number;kills:number;killCount:number};
export type StandingGroup = {id:string;label:string;rows:Row[];counted:number;issues:number};
const row=(id:string,school:string,seed:number):Row=>({id,school,seed,played:0,win:0,loss:0,scored:0,conceded:0,points:0,forfeit:0,time:0,timeCount:0,kills:0,killCount:0});
const validScore=(v:unknown):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=0;
function score(a:Row,b:Row,s1:number,s2:number){a.played++;b.played++;a.scored+=s1;a.conceded+=s2;b.scored+=s2;b.conceded+=s1;}
export function groupStandings(sport:Exclude<StandingSport,'ES'>,teams:Team[],matches:GroupMatch[]):StandingGroup[]{
 const codes=[...new Set([...teams.map(t=>t.group_code),...matches.filter(m=>m.stage==='group'&&m.status==='completed').map(m=>m.group_code||'')])].filter(Boolean).sort();
 return codes.map(code=>{
  const rows=teams.filter(t=>t.group_code===code).map(t=>row(t.id,t.school_name,t.seed_order));
  let counted=0,issues=0;
  const sets=sport==='VB'||sport==='ST';
  const find=(name:string)=>{const found=rows.filter(r=>sets?r.school===name:matchSchool(name,r.school));return found.length===1?found[0]:undefined;};
  for(const m of matches){
   if(m.stage!=='group'||m.group_code!==code||m.status!=='completed')continue;
   const a=find(m.team1_name),b=find(m.team2_name),s1=m.score1,s2=m.score2;
   if(!a||!b||a===b||!validScore(s1)||!validScore(s2)){issues++;continue;}
   const penalties=(sport==='FB'||sport==='FS')&&validScore(m.penalty1)&&validScore(m.penalty2)?m.penalty1-m.penalty2:0;
   const win=s1>s2?1:s2>s1?2:penalties>0?1:penalties<0?2:0;
   if(!win){issues++;continue;}
   score(a,b,s1,s2);counted++;
   const w=win===1?a:b,l=win===1?b:a;w.win++;l.loss++;
   w.points+=sport==='FB'||sport==='FS'?3:2;
   if(sets){const f=sport==='VB'?m.volleyball_forfeit:m.takraw_forfeit;if(f===(win===1?2:1))l.forfeit++;else l.points++;}
  }
  rows.sort(sets?(a,b)=>b.points-a.points||b.win-a.win||a.school.localeCompare(b.school,'th'):(a,b)=>b.points-a.points||(b.scored-b.conceded)-(a.scored-a.conceded)||b.scored-a.scored||a.conceded-b.conceded);
  if(counted===0)rows.sort((a,b)=>a.seed-b.seed);
  return {id:code,label:code,rows,counted,issues};
 });
}
export function esportsStandings(groups:EsGroup[],teams:EsTeam[],matches:EsMatch[]):StandingGroup[]{
 return [...groups].sort((a,b)=>a.sort_order-b.sort_order).map(g=>{
  const rows=teams.filter(t=>t.group_id===g.id).map(t=>row(t.id,t.school_name,t.seed_order));const map=new Map(rows.map(r=>[r.id,r]));let counted=0,issues=0;
  for(const m of matches){if(m.stage!=='group'||m.group_id!==g.id||m.match_status!=='completed')continue;
   const a=map.get(m.team1_id||''),b=map.get(m.team2_id||''),s1=m.score1,s2=m.score2;
   if(!a||!b||a===b||!validScore(s1)||!validScore(s2)||Math.max(s1,s2)!==2||Math.min(s1,s2)>1){issues++;continue;}
   score(a,b,s1,s2);counted++;
   if(m.duration_minutes!=null&&Number.isFinite(Number(m.duration_minutes))){a.time+=Number(m.duration_minutes);b.time+=Number(m.duration_minutes);a.timeCount++;b.timeCount++;}
   if(m.team1_kills!=null&&m.team2_kills!=null&&Number.isFinite(Number(m.team1_kills))&&Number.isFinite(Number(m.team2_kills))){a.kills+=Number(m.team1_kills);b.kills+=Number(m.team2_kills);a.killCount++;b.killCount++;}
   const w=s1>s2?a:b,l=s1>s2?b:a;w.win++;l.loss++;w.points+=Math.min(s1,s2)===0?3:2;l.points+=Math.min(s1,s2)===0?0:1;
  }
  const ranked:Row[]=[];const seed=(a:Row,b:Row)=>a.seed-b.seed;
  for(const p of [...new Set(rows.map(r=>r.points))].sort((a,b)=>b-a)){
   const same=rows.filter(r=>r.points===p);
   if(!same.every(r=>r.played>0&&r.timeCount===r.played)){ranked.push(...same.sort(seed));continue;}
   for(const t of [...new Set(same.map(r=>Math.round(r.time*100)))].sort((a,b)=>a-b)){
    const timed=same.filter(r=>Math.round(r.time*100)===t);ranked.push(...timed.sort(timed.every(r=>r.played>0&&r.killCount===r.played)?(a,b)=>b.kills-a.kills||seed(a,b):seed));
   }
  }
  return {id:g.id,label:g.group_code,rows:ranked,counted,issues};
 });
}
