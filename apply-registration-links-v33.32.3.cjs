// Run from project root after copying src. Only changes exact registration link anchors.
const fs=require('node:fs'),path=require('node:path');
const base='src/components/group-sports';
const edits=[['VolleyballDashboard.tsx','volleyball'],['TakrawDashboard.tsx','takraw'],['PetanqueDashboard.tsx','petanque'],['TableTennisDashboard.tsx','table-tennis'],['BoxingDashboard.tsx','boxing']];
const pending=[];
function prepare(file,old,next){const full=path.join(base,file),source=fs.readFileSync(full,'utf8');if(source.includes(next)&&!source.includes(old))return;const parts=source.split(old);if(parts.length!==2)throw Error('Unexpected source: '+full+' (expected exactly one anchor). No changes applied.');pending.push([full,parts.join(next)]);}
try{
 for(const [file,sport] of edits)prepare(file,'href="/group-sports?section=registration"',`href="/group-sports?section=registration&sport=${sport}"`);
 prepare('FootballDashboard.tsx','useEffect(()=>{void refresh();},[refresh]);','useEffect(()=>{void refresh();const params=new URLSearchParams(window.location.search);if(params.get("tab")==="registration")setTab("registration");},[refresh]);');
 for(const [file,source] of pending)fs.writeFileSync(file,source);
 console.log(`SUCCESS: ${pending.length} registration links/deep links updated. No SQL, commit or push.`);
}catch(e){console.error('STOP: '+e.message);process.exitCode=1;}
