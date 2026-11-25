'use client';
import Link from 'next/link';
import SportRegistrationEmbed from '@/components/group-sports/SportRegistrationEmbed';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {supabase} from '@/lib/supabase';
import {BOX_CODES,BOX_WEIGHTS,BOX_VENUE,weightLabel,weightFits} from '@/lib/group-sports/boxing-config';
type Event={id:string;event_code:string;status:string};
type Entry={id:string;school:string;name:string;eligible:boolean;weight:number|null};
type Draw={published:boolean;award_rule_confirmed:boolean;seed_entries:string[]};
type Bout={id:string;event_id:string;match_no:number;round_name:string;red_entry:string|null;blue_entry:string|null;source_red:number|null;source_blue:number|null;winner_entry:string|null;status:string;scheduled_date:string|null;start_time:string|null;end_time:string|null;decision:string|null;ended_round:number|null;updated_at:string};
type PublicBout={id:string;event_id:string;match_no:number;round_name:string;scheduled_date:string|null;start_time:string|null;end_time:string|null;venue_name:string;status:string;red_school:string;blue_school:string;winner_school:string|null};
type PrivateData={admin:boolean;draw:Draw|null;entries:Entry[];bouts:Bout[];awarded:boolean};
type Placement={rank:number;slot:number;entry_id:string};
type Award={status:string;placements:Placement[]};
const panel='rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-6';
const primary='rounded-xl bg-[#0755ce] px-4 py-2.5 font-bold text-white hover:bg-blue-900 disabled:opacity-40';
const secondary='rounded-xl border border-blue-200 bg-white px-3 py-2 font-bold text-[#123c91] hover:bg-blue-50 disabled:opacity-40';
const input='mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900';
const SLUG='phayao-secondary-group-sports-2569';
function err(e:unknown){return e&&typeof e==='object'&&'message' in e?String(e.message):String(e);}
function time(t:string|null){return t?.slice(0,5)||'รอเวลา';}
function date(d:string|null){return d?new Date(d+'T12:00:00+07:00').toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Bangkok'}):'รอวัน';}
const formUrl = '/docs/boxing/weigh-in-5.pdf';
const program = [
 ['3 ธ.ค.', '07.00–09.00 น.', 'ชั่งน้ำหนักและตรวจร่างกาย'],
 ['3 ธ.ค.', '13.00 น.', 'รอบคัดเลือก'],
 ['5 ธ.ค.', '', 'รอบรองชนะเลิศ'],
 ['6 ธ.ค.', '', 'รอบชิงชนะเลิศ'],
];

function CombinedSchedule({ bouts, events, loading, failed }: {
 bouts: PublicBout[];
 events: Event[];
 loading: boolean;
 failed: boolean;
}) {
 const [day, setDay] = useState('');
 const days = Array.from(new Set(bouts.flatMap(b => b.scheduled_date ? [b.scheduled_date] : []))).sort();
 const rows = bouts.filter(b => !day || b.scheduled_date === day);
 const labels = new Map(events.map(e => [e.id, weightLabel(e.event_code)]));
 return <section className={panel}>
  <h2 className="text-xl font-black">โปรแกรมรวมทุกพิกัด</h2>
  <p className="mt-1 text-sm text-slate-600">{BOX_VENUE} จังหวัดพะเยา</p>
  <ul className="my-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
   {program.map(([dayLabel, hour, stage]) => <li key={stage} className="rounded-xl bg-blue-50 p-3">
    <b>{dayLabel} 2569</b><p>{stage}</p>{hour && <small>{hour}</small>}
   </li>)}
  </ul>
  <label className="block max-w-xs font-bold">วันแข่งขัน
   <select value={day} className={input} onChange={e => setDay(e.target.value)}>
    <option value="">ทุกวัน</option>
    {days.map(d => <option key={d} value={d}>{date(d)}</option>)}
   </select>
  </label>
  <ul className="mt-4 divide-y divide-slate-200">
   {rows.map(b => <li key={b.id} className="grid gap-2 py-3 sm:grid-cols-2">
    <div><b>{date(b.scheduled_date)} · {time(b.start_time)}{b.end_time && '–' + time(b.end_time)}</b>
     <p>{labels.get(b.event_id)} · คู่ {b.match_no} · {b.round_name}</p></div>
    <div><p className="text-red-800">มุมแดง · {b.red_school}</p>
     <p className="text-blue-800">มุมน้ำเงิน · {b.blue_school}</p>
     {b.winner_school && <b className="text-emerald-800">ผู้ชนะ · {b.winner_school}</b>}</div>
   </li>)}
  </ul>
  {!rows.length && <p role="status">{loading ? 'กำลังโหลดคู่แข่งขัน…' : failed ? 'โหลดโปรแกรมไม่สำเร็จ กรุณากดโหลดล่าสุด' : 'ยังไม่มีคู่แข่งขันที่เผยแพร่สำหรับวันที่เลือก'}</p>}
 </section>;
}
export default function BoxingDashboard(){
 const [code,setCode]=useState('GS3-BX-36M'),[tab,setTab]=useState('schedule');
 const [events,setEvents]=useState<Event[]>([]),[isAdmin,setIsAdmin]=useState(false),[assigned,setAssigned]=useState<string[]>([]);
 const [publicBouts,setPublicBouts]=useState<PublicBout[]>([]),[details,setDetails]=useState<PrivateData|null>(null),[award,setAward]=useState<Award|null>(null);
 const [seeds,setSeeds]=useState<string[]>([]),[rule,setRule]=useState(false),[check,setCheck]=useState<Entry|null>(null),[edit,setEdit]=useState<Bout|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const generation=useRef(0);const event=events.find(e=>e.event_code===code);const eventId=event?.id||'';
 const canScore=!!eventId&&(isAdmin||assigned.includes(eventId));const privateView=details!==null&&canScore;
 const eligible=details?.entries.filter(x=>x.eligible)||[];
 const loadBase=useCallback(async()=>{const c=await supabase.from('sports_competitions').select('id').eq('slug',SLUG).single();if(c.error)throw c.error;const auth=await supabase.auth.getUser();const user=auth.data.user;
  const [ev,a,r,p]=await Promise.all([supabase.from('sports_events').select('id,event_code,status').eq('competition_id',c.data.id).in('event_code',BOX_CODES),user?supabase.rpc('sports_stage3_admin',{p_comp:c.data.id}):Promise.resolve({data:false,error:null}),user?supabase.rpc('sports_event_referee_my_events'):Promise.resolve({data:[],error:null}),supabase.rpc('sports_boxing_public',{p_comp:c.data.id})]);
  if(ev.error)throw ev.error;if(p.error)throw p.error;setEvents((ev.data||[]) as Event[]);setIsAdmin(!a.error&&a.data===true);setAssigned(r.error?[]:((r.data||[]) as {id:string}[]).map(x=>x.id));setPublicBouts((p.data||[]) as PublicBout[]);
 },[]);
 const loadPrivate=useCallback(async()=>{const request=++generation.current;if(!canScore||!eventId){setDetails(null);setAward(null);return;}const [r,a]=await Promise.all([supabase.rpc('sports_boxing_private',{p_event:eventId}),supabase.rpc('sports_boxing_awards',{p_event:eventId})]);if(request!==generation.current)return;if(r.error)throw r.error;setDetails(r.data as PrivateData);setAward(a.error?null:a.data as Award);},[canScore,eventId]);
 useEffect(()=>{const params=new URLSearchParams(window.location.search);if(params.get('tab')==='registration')setTab('registration');const query=params.get('code');if(query&&BOX_CODES.includes(query))setCode(query);void loadBase().catch(e=>setError(err(e)+' · ตรวจสอบ Migration 046')).finally(()=>setLoading(false));},[loadBase]);
 useEffect(()=>{setDetails(null);setAward(null);setSeeds([]);setRule(false);setCheck(null);setEdit(null);void loadPrivate().catch(e=>setError(err(e)));return()=>{generation.current++;};},[loadPrivate]);
 useEffect(()=>{if(edit||check||busy)return;const timer=window.setInterval(()=>{if(document.hidden)return;void loadBase().then(loadPrivate).catch(e=>setError(err(e)));},30000);return()=>window.clearInterval(timer);},[loadBase,loadPrivate,edit,check,busy]);
 async function mutate(fn:()=>PromiseLike<{error:unknown}>,msg:string){if(busy)return;setBusy(true);setError('');setNotice('');try{const r=await fn();if(r.error)throw r.error;setEdit(null);setCheck(null);await loadBase();await loadPrivate();setNotice(msg);}catch(e){setError(err(e));}finally{setBusy(false);}}
 function selectCode(c:string){if(c===code)return;setDetails(null);setAward(null);setCode(c);setTab('schedule');setNotice('');setError('');}
 const name=(id:string|null,source?:number|null)=>id?(details?.entries.find(e=>e.id===id)?.school||'ใบสมัคร')+' · '+(details?.entries.find(e=>e.id===id)?.name||'ตรวจสอบรายชื่อ'):source?`ผู้ชนะคู่ ${source}`:'BYE';
 function saveCheck(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!check||!eventId)return;const f=new FormData(e.currentTarget);const w=Number(f.get('weight'));const clear=f.get('clear')==='on';if(clear&&!weightFits(code,w)){setError('น้ำหนักไม่ตรงรุ่น ห้ามรับรอง');return;}if(!window.confirm('บันทึกตามใบตรวจร่างกายที่แพทย์และกรรมการลงนามแล้วเท่านั้น ยืนยัน?'))return;void mutate(()=>supabase.rpc('sports_boxing_check',{p_event:eventId,p_entry:check.id,p_weight:w,p_clear:clear}),'บันทึกการตรวจแล้ว');}
 function saveBout(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!edit||!eventId)return;const f=new FormData(e.currentTarget);if(edit.status==='draft')void mutate(()=>supabase.rpc('sports_boxing_plan',{p_event:eventId,p_match:edit.id,p_expected:edit.updated_at,p_day:String(f.get('day')),p_start:String(f.get('start')),p_end:String(f.get('end'))}),'บันทึกวันเวลาแล้ว');else if(window.confirm('ยืนยันผลตามใบคำตัดสินจริง? เมื่อบันทึกแล้วจะล็อกผลและส่งผู้ชนะเข้ารอบ'))void mutate(()=>supabase.rpc('sports_boxing_score',{p_event:eventId,p_match:edit.id,p_expected:edit.updated_at,p_winner:String(f.get('winner')),p_decision:String(f.get('decision')),p_round:f.get('round')?Number(f.get('round')):null}),'บันทึกผลและส่งผู้ชนะแล้ว');}
 function makeDraw(){if(!eventId||seeds.length!==eligible.length||seeds.length<2||!rule)return;if(!window.confirm('ยืนยันลำดับจับฉลากจริง และรูปแบบอันดับรางวัลตามที่ผู้จัดอนุมัติแล้ว?'))return;void mutate(()=>supabase.rpc('sports_boxing_make_draw',{p_event:eventId,p_seeds:seeds,p_award_rule:rule}),'สร้างสายฉบับร่างแล้ว');}
 const visible=publicBouts.filter(b=>b.event_id===eventId);const bouts=details?.bouts||[];
 return <main className="min-h-screen bg-[#eaf5ed] text-[#07123d]">
 <header className="border-b-4 border-cyan-400 bg-gradient-to-r from-[#07123d] via-[#0755ce] to-[#078de9] px-4 py-6 text-white sm:px-8"><Link href="/group-sports" className="text-sm font-bold underline">← กลับหน้ากีฬากลุ่ม</Link><p className="mt-4 text-xs font-black tracking-widest">PHAYAO GAMES 2026 · BOXING</p><h1 className="mt-1 text-2xl font-black sm:text-4xl">ระบบจัดการแข่งขันมวยสากลสมัครเล่น</h1><p className="mt-2 text-sm text-blue-100">3–6 ธันวาคม 2569 · 26 รายการ · {BOX_VENUE}</p></header>
 <div className="mx-auto max-w-7xl space-y-4 p-3 sm:p-6">
 <div className="grid grid-cols-2 gap-2">{['M','F'].map(g=><button key={g} onClick={()=>selectCode(code.slice(0,-1)+g)} className={`rounded-xl p-3 font-black ${code.endsWith(g)?g==='M'?'bg-blue-700 text-white':'bg-fuchsia-700 text-white':g==='M'?'bg-blue-100 text-blue-900':'bg-fuchsia-100 text-fuchsia-900'}`}>{g==='M'?'ชาย':'หญิง'}</button>)}</div>
 <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">{BOX_WEIGHTS.map((w,i)=>{const c=`GS3-BX-${w}${code.slice(-1)}`;return <button key={w} onClick={()=>selectCode(c)} className={`rounded-xl p-2 text-sm font-bold ${code===c?'bg-violet-700 text-white':'border border-violet-200 bg-white text-violet-900'}`}>{BOX_WEIGHTS[i+1]?`${w} < นน. ≤ ${BOX_WEIGHTS[i+1]}`:`เกิน ${w}`} กก.</button>;})}</div>
 <h2 className="text-xl font-black">{weightLabel(code)}</h2>
 <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[['รุ่นน้ำหนัก',13],['รายการทั้งหมด',26],['คู่ชกในรุ่น',privateView?bouts.filter(b=>b.status!=='bye').length:visible.length],['จบการแข่งขัน',privateView?bouts.filter(b=>b.status==='completed').length:visible.filter(b=>b.status==='completed').length]].map(([k,v],i)=><div key={k} className={`${panel} flex items-center gap-3`}><span className={`rounded-xl px-3 py-2 text-2xl font-black text-white ${['bg-blue-700','bg-emerald-700','bg-violet-700','bg-orange-700'][i]}`}>{v}</span><b className="text-sm">{k}</b></div>)}</div>
 {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-red-900">{error}</p>}{notice&&<p className="rounded-xl bg-emerald-100 p-3 text-emerald-900">{notice}</p>}
 {loading&&<p>กำลังโหลดรายการ...</p>}{!event&&!loading&&<p className={panel}>รายการนี้ยังไม่เปิดแสดงหรือไม่พบข้อมูลในฐานข้อมูล</p>}
 {isAdmin&&event&&<section className={panel}><b>ผู้ดูแล · สถานะ {event.status}</b><div className="mt-2 flex flex-wrap gap-2">{!details?.draw&&<><button className={secondary} disabled={busy||event.status==='registration'} onClick={()=>window.confirm('เปิดรับสมัครรุ่นนี้?')&&void mutate(()=>supabase.from('sports_events').update({status:'registration'}).eq('id',event.id).eq('status',event.status),'เปิดรับสมัครแล้ว')}>เปิดรับสมัคร</button><button className={secondary} disabled={busy||event.status!=='registration'} onClick={()=>window.confirm('ปิดรับสมัครรุ่นนี้?')&&void mutate(()=>supabase.from('sports_events').update({status:'scheduled'}).eq('id',event.id).eq('status',event.status),'ปิดรับสมัครแล้ว')}>ปิดรับสมัคร</button></>}{details?.draw&&!details.draw.published&&<><button className={primary} disabled={busy} onClick={()=>window.confirm('ยืนยันโปรแกรมฉบับร่างทั้งหมด?')&&void mutate(()=>supabase.rpc('sports_boxing_publish',{p_event:eventId}),'เผยแพร่โปรแกรมแล้ว')}>เผยแพร่โปรแกรม</button><button className={secondary} disabled={busy} onClick={()=>window.confirm('ลบเฉพาะสายฉบับร่างรุ่นนี้เพื่อจับฉลากใหม่?')&&void mutate(()=>supabase.rpc('sports_boxing_discard_draft',{p_event:eventId}),'ลบสายฉบับร่างแล้ว')}>ล้างสายฉบับร่าง</button></>}</div></section>}
 <div className="flex flex-wrap gap-2">{[['schedule','โปรแกรม / ผล'],['all','โปรแกรมรวมทุกพิกัด'],['bracket','สายการแข่งขัน'],...(canScore?[['check','ตรวจใบสมัคร / ชั่งน้ำหนัก'],['awards','อันดับรางวัล']]:[]),['registration','ลงทะเบียน'],['rules','ระเบียบ / เอกสาร']].map(([k,label])=><button key={k} onClick={()=>{setTab(k);setEdit(null);setCheck(null);}} className={tab===k?primary:secondary}>{label}</button>)}<button className={secondary} disabled={busy} onClick={()=>void loadBase().then(loadPrivate).catch(e=>setError(err(e)))}>โหลดล่าสุด</button></div>
 {tab==='all'&&<CombinedSchedule bouts={publicBouts} events={events} loading={loading} failed={!!error} />}
 {tab==='check'&&privateView&&<section className={panel}><h2 className="text-xl font-black">ตรวจหลักฐานและชั่งน้ำหนัก</h2><p className="my-2 text-sm text-slate-600">ข้อมูลส่วนตัว · ให้ผู้ดูแลบันทึกจากเอกสารที่แพทย์และกรรมการลงนามจริง ไม่ใช้ระบบนี้ตัดสินสุขภาพแทนแพทย์</p><a href={formUrl} target="_blank" rel="noreferrer" className={secondary+' my-2 inline-block'}>พิมพ์ใบตรวจร่างกายและชั่งน้ำหนัก</a>{details.entries.map(e=><div key={e.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 p-3"><div><b>{e.name}</b><p className="text-sm">{e.school}</p></div><span className={e.eligible?'text-emerald-700':'text-slate-600'}>{e.eligible?'รับรองแล้ว':'ยังไม่รับรอง'}{details.admin&&e.weight!=null?` · ${e.weight} กก.`:''}</span>{details.admin&&!details.draw&&<button className={secondary} onClick={()=>setCheck(e)}>บันทึกผลตรวจ</button>}</div>)}{!details.entries.length&&<p>ยังไม่มีใบสมัครที่ส่งแล้ว</p>}
 {check&&<form key={check.id} onSubmit={saveCheck} className="mt-4 space-y-3 rounded-xl border border-blue-300 p-4"><b>{check.name} · {check.school}</b><label className="block">น้ำหนักจริง (กก.)<input name="weight" type="number" min="0.001" max="300" step="0.001" required defaultValue={check.weight??''} className={input}/></label><label className="flex gap-2"><input name="clear" type="checkbox" defaultChecked={check.eligible}/> รับรองว่ามีใบตรวจร่างกายที่แพทย์ลงนามและผ่านการชั่งน้ำหนักจากกรรมการแล้ว</label><p className="text-xs text-slate-600">ไม่เลือกช่องนี้ = ยังไม่รับรอง ไม่มีการเก็บรายละเอียดสุขภาพหรือรูปใบตรวจในระบบ</p><button className={primary} disabled={busy}>บันทึก</button> <button type="button" className={secondary} onClick={()=>setCheck(null)}>ยกเลิก</button></form>}
 <a href="/docs/boxing/boxing-2569.pdf" target="_blank" rel="noreferrer" className="mt-3 inline-block font-bold text-blue-800 underline">แบบตรวจร่างกายและชั่งน้ำหนัก (หน้า 5)</a></section>}
 {tab==='bracket'&&privateView&&!details.draw&&<section className={panel}><h2 className="text-xl font-black">จับฉลากตามลำดับจริง</h2><p className="my-2 text-sm">เลือกนักกีฬาที่ผ่านตรวจตามลำดับในผังจริง ระบบจะจับช่อง 1 กับช่องครึ่งหลังที่ตรงกัน โดยช่องว่างชนะผ่าน ไม่บันทึกคะแนนสมมติ กรุณาเทียบสายก่อนเผยแพร่</p><p>ผ่านตรวจ {eligible.length} คน · เลือกแล้ว {seeds.length} คน</p>{details.admin&&<><div className="my-3 grid gap-2 sm:grid-cols-2">{eligible.map(e=><button key={e.id} disabled={seeds.includes(e.id)} className={secondary} onClick={()=>setSeeds(old=>[...old,e.id])}>{e.name} · {e.school}</button>)}</div><ol className="space-y-2">{seeds.map((id,i)=><li key={id} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2"><span className="flex-1">{i+1}. {name(id)}</span><button className={secondary} disabled={i===0} onClick={()=>setSeeds(old=>{const next=[...old];[next[i-1],next[i]]=[next[i],next[i-1]];return next;})}>↑</button><button className={secondary} disabled={i===seeds.length-1} onClick={()=>setSeeds(old=>{const next=[...old];[next[i],next[i+1]]=[next[i+1],next[i]];return next;})}>↓</button><button className={secondary} onClick={()=>setSeeds(old=>old.filter(x=>x!==id))}>นำออก</button></li>)}</ol><label className="my-3 flex gap-2"><input type="checkbox" checked={rule} onChange={e=>setRule(e.target.checked)}/> ผู้จัดยืนยันให้ผู้ชนะรอบชิงอันดับ 1 ผู้แพ้รอบชิงอันดับ 2 และผู้แพ้รอบรองที่ได้แข่งขันจริงเป็นอันดับ 3 ร่วม โดยไม่สร้างอันดับที่ไม่มีผู้เข้าแข่งขัน</label><button className={primary} disabled={busy||seeds.length!==eligible.length||seeds.length<2||!rule||event?.status==='registration'} onClick={makeDraw}>สร้างสายฉบับร่าง</button>{eligible.length<2&&<p className="mt-2 text-sm text-slate-600">หากมีผู้สมัคร 0–1 คน ให้ผู้จัดพิจารณาตามระเบียบเพิ่มเติม ไม่สร้างผลอัตโนมัติ</p>}</>}</section>}
 {(tab==='schedule'||tab==='bracket')&&<section className={panel}><h2 className="text-xl font-black">{tab==='bracket'?'สายการแข่งขัน':'โปรแกรม / ผลการแข่งขัน'}</h2><div className="mt-3 space-y-3">{privateView?bouts.map(b=><article key={b.id} className="rounded-xl border border-blue-100 p-3"><div className="flex flex-wrap justify-between gap-2 text-sm"><b>คู่ {b.match_no} · {b.round_name}</b><span>{b.status==='bye'?'ชนะผ่าน (BYE)':b.status==='draft'?'ฉบับร่าง':b.status==='completed'?'จบการแข่งขัน':'รอแข่งขัน'} · {date(b.scheduled_date)} {time(b.start_time)}{b.end_time&&`–${time(b.end_time)}`}</span></div><div className="mt-2 grid grid-cols-2 gap-2"><div className="rounded-xl bg-red-50 p-3 text-red-900"><b>มุมแดง</b><p>{name(b.red_entry,b.source_red)}</p></div><div className="rounded-xl bg-blue-50 p-3 text-blue-900"><b>มุมน้ำเงิน</b><p>{name(b.blue_entry,b.source_blue)}</p></div></div>{b.winner_entry&&<p className="mt-2 font-bold text-emerald-800">ผู้ชนะ: {name(b.winner_entry)}{b.decision&&` · ${b.decision}`}{b.ended_round&&` · ยก ${b.ended_round}`}</p>}{((details.admin&&b.status==='draft')||(b.status==='published'&&b.red_entry&&b.blue_entry))&&<button className={secondary+' mt-2'} disabled={busy} onClick={()=>setEdit(b)}>{b.status==='draft'?'กำหนดวันเวลา':'บันทึกผล'}</button>}</article>):visible.map(b=><article key={b.id} className="rounded-xl border border-blue-100 p-3"><div className="flex flex-wrap justify-between gap-2 text-sm"><b>คู่ {b.match_no} · {b.round_name}</b><span>{date(b.scheduled_date)} {time(b.start_time)}</span></div><div className="mt-2 grid grid-cols-2 gap-2"><div className="rounded-xl bg-red-50 p-3 text-red-900">มุมแดง · {b.red_school}</div><div className="rounded-xl bg-blue-50 p-3 text-blue-900">มุมน้ำเงิน · {b.blue_school}</div></div>{b.winner_school&&<p className="mt-2 font-bold text-emerald-800">ผู้ชนะ: {b.winner_school}</p>}</article>)}</div>{!(privateView?bouts.length:visible.length)&&<p className="mt-3 text-slate-600">ยังไม่มีคู่ชกที่{privateView?'จัดสาย':'เผยแพร่'} · รอการตรวจและจับฉลากจริง</p>}
 {edit&&privateView&&<form key={edit.id} onSubmit={saveBout} className="mt-4 space-y-3 rounded-xl border border-blue-300 p-4"><b>คู่ {edit.match_no} · {edit.round_name}</b>{edit.status==='draft'?<div className="grid gap-2 sm:grid-cols-3"><label>วันแข่งขัน<input type="date" name="day" min="2026-12-03" max="2026-12-06" required defaultValue={edit.scheduled_date||''} className={input}/></label><label>เวลาเริ่ม<input type="time" name="start" required defaultValue={edit.start_time?.slice(0,5)||''} className={input}/></label><label>เวลาสิ้นสุด<input type="time" name="end" required defaultValue={edit.end_time?.slice(0,5)||''} className={input}/></label></div>:<><label className="block">ผู้ชนะ<select name="winner" className={input} required defaultValue=""><option value="">เลือกจากคำตัดสิน</option><option value={edit.red_entry||''}>มุมแดง · {name(edit.red_entry)}</option><option value={edit.blue_entry||''}>มุมน้ำเงิน · {name(edit.blue_entry)}</option></select></label><label className="block">คำตัดสินตามใบผลการแข่งขัน<input name="decision" maxLength={120} required placeholder="กรอกตามกรรมการผู้ตัดสิน" className={input}/></label><label className="block">ยกที่จบ (ถ้ามี)<select name="round" className={input}><option value="">ไม่ระบุ</option>{[1,2,3].map(n=><option key={n} value={n}>{n}</option>)}</select></label></>}<button className={primary} disabled={busy}>บันทึก</button> <button className={secondary} type="button" onClick={()=>setEdit(null)}>ยกเลิก</button></form>}</section>}
 {tab==='awards'&&privateView&&<section className={panel}><h2 className="text-xl font-black">อันดับรางวัล / เกียรติบัตร</h2>{details.awarded?<p className="mt-3 font-bold text-emerald-800">ประกาศผลแล้ว · ใช้เมนูพิมพ์เกียรติบัตรเดิม</p>:award?.status==='ready'?<><div className="my-3 space-y-2">{award.placements.map(p=><div key={`${p.rank}-${p.slot}`} className="rounded-xl bg-slate-50 p-3"><b>{['','ชนะเลิศ','รองชนะเลิศอันดับ 1','รองชนะเลิศอันดับ 2'][p.rank]}{p.rank===3&&p.slot===2?' (ร่วม)':''}</b><p>{name(p.entry_id)}</p></div>)}</div><button className={primary} disabled={busy} onClick={()=>window.confirm('ยืนยันอันดับจริงเพื่อออกเหรียญและเกียรติบัตร?')&&void mutate(()=>supabase.rpc('sports_cert_submit',{p_event:eventId,p_awards:award.placements}),'ประกาศผลพร้อมเหรียญและเกียรติบัตรแล้ว')}>ยืนยันอันดับและประกาศผล</button></>:<p className="my-3 text-slate-600">ยังไม่พร้อมเสนออันดับ · ตรวจผลทุกคู่ กติการางวัล ข้อมูลใบสมัคร และสิทธิ์บันทึกอันดับ (แม่แอดมินต้องได้รับมอบหมายด้วย)</p>}<p className="mt-3 text-sm text-slate-600">รางวัลถ้วยรวมและนักชกยอดเยี่ยมให้ผู้จัดตัดสินแยก ยังไม่รวมในระบบเหรียญอัตโนมัติ</p></section>}
 {tab==='registration'&&<>
  <section className={panel}>
   <h2 className="text-xl font-black">เอกสารสมัครมวยสากล</h2>
   <p className="my-2 text-sm">โรงเรียนลงทะเบียนรายชื่อนักกีฬาได้โดยไม่ต้องแนบรูป และพิมพ์ใบตรวจร่างกายสำหรับวันชั่งน้ำหนักได้ที่นี่</p>
   <div className="flex flex-wrap gap-2">
    <a className={secondary} href="/docs/boxing/boxing-2569.pdf" target="_blank" rel="noreferrer">เปิดระเบียบและกำหนดการแข่งขัน (5 หน้า)</a>
    <a className={secondary} href={formUrl} target="_blank" rel="noreferrer">พิมพ์ใบตรวจร่างกายและชั่งน้ำหนัก (1 หน้า)</a>
   </div>
  </section>
  <SportRegistrationEmbed sport="boxing" title="มวยสากลสมัครเล่น" />
 </>}
 {tab==='rules'&&<section className={panel}><h2 className="text-xl font-black">กำหนดการ / ระเบียบ</h2><p className="my-3">3 ธ.ค. 07.00–09.00 ชั่งน้ำหนักและตรวจร่างกาย / 13.00 รอบคัดเลือก · 5 ธ.ค. รอบรอง · 6 ธ.ค. รอบชิง · ชก 3 ยก ยกละ 2 นาที พัก 1 นาที</p><p className="my-3 text-slate-600">วันและเวลาแต่ละคู่ให้ผู้จัดยืนยัน · ระบบวางเวทีเดียวเป็นค่าเริ่มต้น · เอกสารระบุวันพุธที่ 3 ธันวาคม แต่วันที่ 3 ธันวาคม 2569 ตรงกับวันพฤหัสบดี ให้ยึดวันที่และยืนยันกับผู้จัด</p><a href="/docs/boxing/boxing-2569.pdf" target="_blank" rel="noreferrer" className={primary+' inline-block'}>เปิด PDF ระเบียบต้นฉบับ</a> <a href={formUrl} target="_blank" rel="noreferrer" className={secondary+' my-2 inline-block'}>พิมพ์ใบตรวจร่างกายและชั่งน้ำหนัก</a></section>}
 </div></main>;
}
