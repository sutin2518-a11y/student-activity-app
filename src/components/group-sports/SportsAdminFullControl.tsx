"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { allowsRegistrationPhotos } from "@/lib/group-sports/registration-hub";
import AthletePhotoManager from "@/components/group-sports/AthletePhotoManager";

const SLUG = "phayao-secondary-group-sports-2569";
const control = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-red-700";
const button = "rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-sm font-bold text-red-900 hover:bg-rose-50 disabled:opacity-40";

type School = {id:string;name:string};
type Event = {id:string;sport_name:string;event_code:string|null;event_type:string;max_athletes_per_entry:number|null};
type Entry = {id:string;event_id:string;school_id:string;entry_name:string;status:string;updated_at:string;athletes:number};
type Player = {full_name:string;student_code:string|null;grade_level:string|null;gender:string|null;ign:string|null;team_role:string|null;play_position:string|null;birth_date:string|null;jersey_number:number|null;player_role:string|null;player_note:string|null};
type Coach = {name:string;phone:string;manager_name?:string;manager_phone?:string};
type History = {edited_at:string;reason:string;actor:string|null;before_data:Record<string,unknown>;after_data:Record<string,unknown>;revoked:number;issued:number};
type Detail = {id:string;competition_id:string;event_id:string;school_id:string;entry_name:string;status:string;updated_at:string;players:Player[];coaches:Coach[];unrevoked_certificates:number;history:History[]};
type ListResult = {entries:Entry[];events:Event[];schools:School[]};
type SaveResult = {edited_at:string;edit_id:string;revoked_certificates:number;issued_certificates:number};
const blankPlayer = ():Player => ({full_name:"",student_code:"",grade_level:"",gender:"",ign:"",team_role:"ตัวจริง",play_position:"",birth_date:"",jersey_number:null,player_role:"",player_note:""});
const blankCoach = ():Coach => ({name:"",phone:""});
const safeMessage = (error:unknown) => error && typeof error === "object" && "message" in error ? String(error.message) : "ไม่สามารถดำเนินการได้";
const isFootball = (code:string|null|undefined) => ["GS3-FB-13M","GS3-FB-15M","GS3-FB-UM","GS3-FB-UF"].includes(code || "");
const isRov = (code:string|null|undefined) => ["GS3-ES-SM","GS3-ES-SF"].includes(code || "");

export default function SportsAdminFullControl(){
  const [loading,setLoading]=useState(true);
  const [authorized,setAuthorized]=useState(false);
  const [compId,setCompId]=useState("");
  const [data,setData]=useState<ListResult>({entries:[],events:[],schools:[]});
  const [search,setSearch]=useState("");
  const [eventFilter,setEventFilter]=useState("");
  const [schoolFilter,setSchoolFilter]=useState("");
  const [entryId,setEntryId]=useState("");
  const [detail,setDetail]=useState<Detail|null>(null);
  const [entryName,setEntryName]=useState("");
  const [players,setPlayers]=useState<Player[]>([]);
  const [coaches,setCoaches]=useState<Coach[]>([]);
  const [reason,setReason]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const eventMap=useMemo(()=>new Map(data.events.map(e=>[e.id,e])),[data.events]);
  const schoolMap=useMemo(()=>new Map(data.schools.map(s=>[s.id,s])),[data.schools]);
  const event=detail?eventMap.get(detail.event_id):undefined;
  const football=isFootball(event?.event_code);
  const rov=isRov(event?.event_code);

  const loadList=useCallback(async()=>{
    setLoading(true);setError("");
    try {
      const auth=await supabase.auth.getUser();
      if(auth.error || !auth.data.user) throw new Error("กรุณาเข้าสู่ระบบด้วยบัญชี Admin หลักก่อน");
      const comp=await supabase.from("sports_competitions").select("id").eq("slug",SLUG).single();
      if(comp.error || !comp.data) throw new Error("ไม่พบการแข่งขันปี 2569");
      const access=await supabase.rpc("sports_stage3_admin",{p_comp:comp.data.id});
      if(access.error || access.data!==true) throw new Error("บัญชีนี้ไม่มีสิทธิ์ Admin หลักของการแข่งขัน");
      setAuthorized(true);setCompId(comp.data.id);
      const rows=await supabase.rpc("sports_admin_registration_list",{p_comp:comp.data.id});
      if(rows.error) throw rows.error;
      setData(rows.data as ListResult);
      const requested = new URLSearchParams(window.location.search).get("entry");
      if(requested && (rows.data as ListResult).entries.some(item=>item.id===requested)){
        void openEntry(requested);
      }
    }catch(cause){setError(safeMessage(cause));setAuthorized(false);}finally{setLoading(false);}
  },[]);
  useEffect(()=>{void loadList();},[loadList]);

  const visible=useMemo(()=>{
    const needle=search.toLocaleLowerCase().trim();
    return data.entries.filter(x=>(!eventFilter||x.event_id===eventFilter) &&
      (!schoolFilter||x.school_id===schoolFilter) && (!needle ||
      `${x.entry_name} ${eventMap.get(x.event_id)?.sport_name||""} ${schoolMap.get(x.school_id)?.name||""}`.toLocaleLowerCase().includes(needle)));
  },[data.entries,eventFilter,schoolFilter,search,eventMap,schoolMap]);

  async function openEntry(id:string){
    if(!id)return;
    setBusy(true);setEntryId(id);setDetail(null);setError("");setNotice("");setReason("");
    try{
      const r=await supabase.rpc("sports_admin_registration_detail",{p_entry:id});
      if(r.error)throw r.error;
      const d=r.data as Detail;
      setDetail(d);
      setEntryName(d.entry_name);
      setPlayers((d.players||[]).map(p=>({...blankPlayer(),...p})));
      setCoaches((d.coaches||[]).map(c=>({...blankCoach(),...c})));
    }catch(cause){setError(safeMessage(cause));}finally{setBusy(false);}
  }
  function changePlayer(index:number,key:keyof Player,value:string|number|null){
    setPlayers(current=>current.map((p,i)=>i===index?{...p,[key]:value}:p));
  }
  function changeCoach(index:number,key:keyof Coach,value:string){
    setCoaches(current=>current.map((c,i)=>i===index?{...c,[key]:value}:c));
  }
  async function save(){
    if(!detail || busy)return;
    if(reason.trim().length<8){setError("โปรดระบุเหตุผลที่ได้รับแจ้งให้แก้ไขอย่างน้อย 8 ตัวอักษร");return;}
    if(!entryName.trim() || players.some(p=>!p.full_name.trim()) || coaches.some(c=>!c.name.trim()||!/^[+]?\d{9,15}$/.test(c.phone.replace(/[ ()-]/g,"")))){
      setError("โปรดตรวจชื่อทีม/นักกีฬาและชื่อพร้อมเบอร์โทรศัพท์ครูผู้ควบคุมให้ครบ");return;
    }
    if(football && (players.some(p=>!p.birth_date || p.jersey_number===null || p.jersey_number<0 || p.jersey_number>99) ||
      new Set(players.map(p=>p.jersey_number)).size!==players.length)){
      setError("ฟุตบอลต้องระบุวันเกิดและเบอร์เสื้อที่ไม่ซ้ำกันสำหรับทุกคน");return;
    }
    if(rov && (players.length<5 || players.length>7 || players.filter(p=>p.team_role==="หัวหน้าทีม").length!==1 ||
      players.filter(p=>p.team_role==="ตัวจริง").length!==4 || players.some(p=>!p.ign?.trim()))){
      setError("RoV ต้องมีหัวหน้าทีม 1 คน ตัวจริง 4 คน และสำรองไม่เกิน 2 คน พร้อมชื่อในเกม");return;
    }
    const prompt=`ยืนยันแก้ไขใบสมัครนี้ในฐานะ Admin?\n\n${schoolMap.get(detail.school_id)?.name||"โรงเรียน"}\n${event?.sport_name||"กีฬา"}\nนักกีฬา ${players.length} คน, ครูผู้ควบคุม ${coaches.length} คน\n\nเหตุผล: ${reason.trim()}\n\nหากมีเกียรติบัตรเดิม ระบบจะยกเลิกเลขที่/QR เดิมและออกเอกสารชุดใหม่อัตโนมัติ (ไม่ย้อนกลับผลการแข่งขัน)`;
    if(!window.confirm(prompt))return;
    setBusy(true);setError("");setNotice("");
    try{
      const r=await supabase.rpc("sports_admin_update_registration",{
        p_entry:detail.id,p_name:entryName.trim(),p_players:players,p_coaches:coaches,
        p_reason:reason.trim(),p_expected_updated_at:detail.updated_at
      });
      if(r.error)throw r.error;
      const saved=r.data as SaveResult;
      setNotice(`บันทึกการแก้ไขสำเร็จ · ยกเลิกเกียรติบัตร ${saved.revoked_certificates} ฉบับ · ออกฉบับใหม่ ${saved.issued_certificates} ฉบับ`);
      setReason("");
      const [reload,list]=await Promise.all([
        supabase.rpc("sports_admin_registration_detail",{p_entry:detail.id}),
        supabase.rpc("sports_admin_registration_list",{p_comp:compId})
      ]);
      if(reload.error)throw reload.error;
      if(list.error)throw list.error;
      const d=reload.data as Detail;
      setDetail(d);setPlayers((d.players||[]).map(p=>({...blankPlayer(),...p})));
      setCoaches((d.coaches||[]).map(c=>({...blankCoach(),...c})));
      setEntryName(d.entry_name);setData(list.data as ListResult);
    }catch(cause){setError(safeMessage(cause));}finally{setBusy(false);}
  }
  return <main className="min-h-screen bg-slate-100 px-3 py-6 text-slate-900 sm:px-6">
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="rounded-2xl bg-gradient-to-r from-[#850014] to-[#172449] px-5 py-5 text-white shadow">
        <Link href="/group-sports" className="text-sm font-semibold underline">← กลับหน้ากีฬากลุ่ม</Link>
        <p className="mt-4 text-xs font-black tracking-widest text-amber-300">PHULANGKA GAMES 2026 · ADMIN FULL CONTROL</p>
        <h1 className="mt-1 text-2xl font-black">Admin จัดการข้อมูลการแข่งขัน</h1>
        <p className="mt-2 text-sm text-white/90">แก้ไขใบสมัครทุกโรงเรียนตามคำร้องขอ · ไม่เพิ่มขั้นตอนอนุมัติใบสมัครหรือผลการแข่งขัน</p>
      </header>
      {loading && <div className="rounded-xl bg-white p-5">กำลังตรวจสอบสิทธิ์ Admin...</div>}
      {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-900">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm font-semibold text-green-900">{notice}</div>}
      {authorized && <>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-black text-red-900">เข้าจัดการเมนูอื่นในฐานะ Admin</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link className={button} href="/group-sports?section=school_info">ข้อมูลโรงเรียน</Link>
            <Link className={button} href="/group-sports?section=schedule">รายการและโปรแกรมแข่งขัน</Link>
            <Link className={button} href="/group-sports/football">ฟุตบอล</Link>
            <Link className={button} href="/group-sports/esports">E-Sport / RoV</Link>
            <Link className={button} href="/group-sports/officials">มอบหมายกรรมการ</Link>
            <Link className={button} href="/group-sports/results/corrections">แก้ไขผลหลังประกาศ</Link>
            <Link className={button} href="/group-sports/certificates/manage">จัดการเกียรติบัตร</Link>
            <Link className={button} href="/group-sports/reset">ลบใบสมัคร / รีเซต</Link>
          </div>
          <p className="mt-3 text-xs text-slate-600">หน้าจัดการกลางนี้รองรับการแก้ใบสมัครที่บันทึกแล้วทุกประเภทกีฬา ส่วนคะแนนรายแมตช์และข้อมูลเฉพาะกีฬายังใช้หน้าเดิม</p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-red-900">แก้ไขใบสมัครทุกโรงเรียน</h2>
          <p className="mt-1 text-sm text-slate-600">ค้นหาจากโรงเรียน ประเภทกีฬา หรือชื่อทีม แล้วเปิดใบสมัครเพื่อแก้ไขรายชื่อนักกีฬา/ครูผู้ควบคุมและแนบรูป</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <input className={control} aria-label="ค้นหาใบสมัคร" placeholder="ค้นหาชื่อทีม กีฬา หรือโรงเรียน" value={search} onChange={e=>setSearch(e.target.value)}/>
            <select className={control} aria-label="กรองโรงเรียน" value={schoolFilter} onChange={e=>setSchoolFilter(e.target.value)}><option value="">ทุกโรงเรียน</option>{data.schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <select className={control} aria-label="กรองรายการแข่งขัน" value={eventFilter} onChange={e=>setEventFilter(e.target.value)}><option value="">ทุกรายการแข่งขัน</option>{data.events.map(e=><option key={e.id} value={e.id}>{e.sport_name}</option>)}</select>
          </div>
          <p className="mt-3 text-xs text-slate-500">พบ {visible.length} ใบสมัคร</p>
          <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-200">
            {visible.map(row=><button key={row.id} type="button" disabled={busy} onClick={()=>void openEntry(row.id)}
                className={`flex w-full items-center justify-between gap-4 border-b px-4 py-3 text-left text-sm hover:bg-rose-50 ${entryId===row.id?"bg-rose-50 text-red-900":"bg-white"}`}>
              <span className="min-w-0"><strong className="block">{schoolMap.get(row.school_id)?.name||"โรงเรียน"} · {row.entry_name}</strong><span className="block text-xs text-slate-500">{eventMap.get(row.event_id)?.sport_name||"รายการกีฬา"} · นักกีฬา {row.athletes} คน · {row.status}</span></span>
              <span className="shrink-0 font-bold text-red-900">แก้ไข →</span>
            </button>)}
            {!visible.length && <p className="p-4 text-sm text-slate-500">ไม่พบใบสมัครตามเงื่อนไข</p>}
          </div>
        </section>
        {detail && <section className="space-y-4 rounded-2xl border border-rose-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3"><div>
            <h2 className="text-xl font-black text-red-900">แก้ไขข้อมูลใบสมัคร</h2>
            <p className="mt-1 text-sm text-slate-700">{schoolMap.get(detail.school_id)?.name} · {event?.sport_name} · สถานะ {detail.status}</p>
          </div><button type="button" onClick={()=>void openEntry(detail.id)} className={button} disabled={busy}>โหลดข้อมูลล่าสุด</button></div>
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">รายการนี้แก้ไขตามคำร้องขอเท่านั้น หากเปลี่ยนชื่อ/รหัสนักกีฬาหรือลำดับรายชื่อ รูปเดิมจะไม่ถูกนำไปแสดงแทนคนอื่น โปรดแนบรูปใหม่หลังบันทึก หากมีเกียรติบัตรที่ยังไม่ยกเลิก ระบบจะยกเลิก QR เดิมและออกชุดใหม่ในการบันทึกครั้งเดียว</p>
          <div><label className="mb-1 block text-sm font-bold">ชื่อทีม / ชื่อใบสมัคร</label><input className={control} value={entryName} onChange={e=>setEntryName(e.target.value)}/></div>
          <div className="space-y-3"><div className="flex flex-wrap justify-between gap-2"><h3 className="text-lg font-black">นักกีฬา ({players.length} คน)</h3><button type="button" className={button} disabled={busy||players.length>=Math.min(event?.max_athletes_per_entry||200,200)} onClick={()=>setPlayers(x=>[...x,blankPlayer()])}>+ เพิ่มนักกีฬา</button></div>
            {players.map((p,index)=><div className="rounded-xl border border-slate-200 bg-slate-50 p-3" key={index}>
              <div className="mb-3 flex justify-between gap-2"><strong className="text-sm">นักกีฬาคนที่ {index+1}</strong><button disabled={busy||players.length<=1} type="button" className="text-xs font-bold text-red-800 disabled:opacity-40" onClick={()=>setPlayers(x=>x.filter((_,i)=>i!==index))}>ลบรายชื่อ</button></div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-xs font-semibold">ชื่อ-สกุล *<input className={control} value={p.full_name||""} onChange={e=>changePlayer(index,"full_name",e.target.value)}/></label>
                <label className="text-xs font-semibold">รหัสนักเรียน<input className={control} value={p.student_code||""} onChange={e=>changePlayer(index,"student_code",e.target.value)}/></label>
                {!football && <label className="text-xs font-semibold">ชั้นเรียน<input className={control} value={p.grade_level||""} onChange={e=>changePlayer(index,"grade_level",e.target.value)}/></label>}
                {!football && <label className="text-xs font-semibold">เพศ<select className={control} value={p.gender||""} onChange={e=>changePlayer(index,"gender",e.target.value)}><option value="">ไม่ระบุ</option><option value="ชาย">ชาย</option><option value="หญิง">หญิง</option></select></label>}
                {football && <><label className="text-xs font-semibold">วันเดือนปีเกิด *<input type="date" className={control} value={p.birth_date||""} onChange={e=>changePlayer(index,"birth_date",e.target.value)}/></label>
                  <label className="text-xs font-semibold">เบอร์เสื้อ *<input type="number" min="0" max="99" className={control} value={p.jersey_number??""} onChange={e=>changePlayer(index,"jersey_number",e.target.value===""?null:Number(e.target.value))}/></label>
                  <label className="text-xs font-semibold">ตำแหน่งนักกีฬา<input className={control} value={p.player_role||""} onChange={e=>changePlayer(index,"player_role",e.target.value)}/></label>
                  <label className="text-xs font-semibold">หมายเหตุ<input className={control} value={p.player_note||""} onChange={e=>changePlayer(index,"player_note",e.target.value)}/></label></>}
                {rov && <><label className="text-xs font-semibold">ชื่อในเกม (IGN) *<input className={control} value={p.ign||""} onChange={e=>changePlayer(index,"ign",e.target.value)}/></label>
                  <label className="text-xs font-semibold">หน้าที่ในทีม<select className={control} value={p.team_role||"ตัวจริง"} onChange={e=>changePlayer(index,"team_role",e.target.value)}><option value="หัวหน้าทีม">หัวหน้าทีม</option><option value="ตัวจริง">ตัวจริง</option><option value="ตัวสำรอง">ตัวสำรอง</option></select></label>
                  <label className="text-xs font-semibold">ตำแหน่งในเกม<input className={control} value={p.play_position||""} onChange={e=>changePlayer(index,"play_position",e.target.value)}/></label></>}
              </div>
            </div>)}
          </div>
          <div className="space-y-3"><div className="flex justify-between gap-2"><h3 className="text-lg font-black">ครูผู้ควบคุมทีม</h3><button className={button} type="button" disabled={busy||coaches.length>=20} onClick={()=>setCoaches(x=>[...x,blankCoach()])}>+ เพิ่มครู</button></div>
            {coaches.map((c,index)=><div key={index} className="grid items-end gap-2 rounded-xl border bg-slate-50 p-3 md:grid-cols-2">
              <label className="text-xs font-semibold">ชื่อ-สกุลครู *<input className={control} value={c.name||""} onChange={e=>changeCoach(index,"name",e.target.value)}/></label>
              <label className="text-xs font-semibold">เบอร์โทรศัพท์ *<input className={control} value={c.phone||""} onChange={e=>changeCoach(index,"phone",e.target.value)}/></label>
              {football && index===0 && <><label className="text-xs font-semibold">ชื่อผู้จัดการทีม<input className={control} value={c.manager_name||""} onChange={e=>changeCoach(index,"manager_name",e.target.value)}/></label>
              <label className="text-xs font-semibold">เบอร์โทรผู้จัดการทีม<input className={control} value={c.manager_phone||""} onChange={e=>changeCoach(index,"manager_phone",e.target.value)}/></label></>}
              {coaches.length>1 && <button className={button} type="button" disabled={busy} onClick={()=>setCoaches(x=>x.filter((_,i)=>i!==index))}>ลบครูคนนี้</button>}
            </div>)}
          </div>
          <div><label className="mb-1 block text-sm font-bold text-red-900">เหตุผลการแก้ไขจากผู้ร้องขอ *</label><textarea rows={3} className={control} value={reason} onChange={e=>setReason(e.target.value)} placeholder="เช่น กรรมการฟุตบอลแจ้งขอแก้ชื่อนักกีฬาและเบอร์เสื้อ เนื่องจากกรอกผิด"/></div>
          <div className="flex flex-wrap gap-2"><button type="button" disabled={busy||reason.trim().length<8} onClick={()=>void save()} className="rounded-xl bg-red-800 px-5 py-3 font-black text-white hover:bg-red-900 disabled:opacity-40">{busy?"กำลังบันทึก...":"ยืนยันแก้ไขใบสมัคร (Admin)"}</button><button className={button} disabled={busy} type="button" onClick={()=>void openEntry(detail.id)}>ยกเลิกการแก้ไขที่ยังไม่บันทึก</button></div>
          {allowsRegistrationPhotos(event) && <div><h3 className="font-black text-red-900">จัดการรูปนักกีฬา</h3><p className="mb-2 text-xs text-slate-600">หากเปลี่ยนชื่อหรือรหัสนักกีฬา ให้บันทึกข้อมูลก่อนแล้วจึงแนบรูปใหม่ รูปทั้งหมดเก็บใน Supabase Storage แบบ Private</p>
            <AthletePhotoManager key={`${detail.id}:${detail.updated_at}`} entryId={detail.id} athletes={detail.players.map(p=>({full_name:p.full_name,student_code:p.student_code}))}/>
          </div>}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><h3 className="font-black">ประวัติการแก้ไขใบสมัคร ({detail.history.length})</h3>
            {detail.history.map((h,i)=><details className="mt-3 border-t pt-2 text-xs" key={`${i}-${h.edited_at}`}><summary className="cursor-pointer font-semibold">{new Date(h.edited_at).toLocaleString("th-TH")} · {h.actor||"Admin"} · {h.reason}</summary><p className="mt-2">ยกเลิกเกียรติบัตร {h.revoked} ฉบับ · ออกใหม่ {h.issued} ฉบับ</p><pre className="mt-2 max-h-56 overflow-auto rounded bg-white p-2">{JSON.stringify({before:h.before_data,after:h.after_data},null,2)}</pre></details>)}
            {!detail.history.length && <p className="mt-2 text-sm text-slate-500">ยังไม่มีประวัติการแก้ไขผ่านเมนูนี้</p>}
          </div>
        </section>}
      </>}
    </div>
  </main>;
}
