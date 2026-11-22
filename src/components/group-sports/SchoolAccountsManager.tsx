"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type School = {id:string;name:string;school_code:string|null};
type Account = {id:string;username:string;school_id:string;is_active:boolean;created_at:string};
type ResponseData = {error?:string;message?:string;accounts?:Account[];schools?:School[];account?:Account;one_time_password?:string};

export default function SchoolAccountsManager() {
  const [accounts,setAccounts] = useState<Account[]>([]);
  const [schools,setSchools] = useState<School[]>([]);
  const [selectedSchool,setSelectedSchool] = useState("");
  const [username,setUsername] = useState("");
  const [password,setPassword] = useState("");
  const [generated,setGenerated] = useState<{username:string;schoolName:string;password:string}|null>(null);
  const [notice,setNotice] = useState("");
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  const [loading,setLoading] = useState(true);

  const api = useCallback(async (method:"GET"|"POST"|"PATCH", url:string, payload?:object) => {
    const {data, error:authError} = await supabase.auth.getSession();
    if (authError || !data.session?.access_token) throw new Error("กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลการแข่งขันก่อน");
    const result = await fetch(url,{
      method,headers:{Authorization:`Bearer ${data.session.access_token}`,...(payload?{"Content-Type":"application/json"}:{})},
      body:payload?JSON.stringify(payload):undefined,cache:"no-store",
    });
    const json = (await result.json()) as ResponseData;
    if (!result.ok) throw new Error(json.error || "ไม่สามารถดำเนินการได้");
    return json;
  },[]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api("GET","/api/group-sports/school-accounts");
      setAccounts(data.accounts||[]);setSchools(data.schools||[]);
    } catch (err) { setError(err instanceof Error?err.message:"อ่านข้อมูลไม่สำเร็จ"); }
    finally {setLoading(false);}
  },[api]);
  useEffect(()=>{void load();},[load]);

  async function create(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(busy)return;
    setBusy(true);setError("");setNotice("");setGenerated(null);
    try {
      const created=await api("POST","/api/group-sports/school-accounts",{school_id:selectedSchool,username,password});
      const schoolName=schools.find(s=>s.id===selectedSchool)?.name||"โรงเรียน";
      setGenerated({username:created.account?.username||username,schoolName,password:created.one_time_password||""});
      setPassword("");setSelectedSchool("");setUsername("");setNotice("สร้างบัญชีเรียบร้อย คัดลอกรหัสผ่านเพื่อส่งให้โรงเรียนก่อนปิดหน้านี้");
      await load();
    } catch(err){setError(err instanceof Error?err.message:"สร้างบัญชีไม่สำเร็จ");}
    finally{setBusy(false);}
  }
  async function modify(account:Account,action:"reset_password"|"disable"|"enable") {
    if(busy) return;
    const operation=action==="reset_password"?"รีเซ็ตรหัสผ่าน":action==="disable"?"ปิดใช้งาน":"เปิดใช้งาน";
    if(!window.confirm(`ยืนยัน${operation}บัญชี ${account.username} ?`))return;
    setError("");setNotice("");setGenerated(null);setBusy(true);
    try {
      const data=await api("PATCH",`/api/group-sports/school-accounts/${account.id}`,{action});
      if(data.one_time_password) {
        setGenerated({username:account.username,schoolName:schools.find(s=>s.id===account.school_id)?.name||"โรงเรียน",password:data.one_time_password});
      }
      setNotice(data.message||"ดำเนินการเรียบร้อย");
      await load();
    } catch(err){setError(err instanceof Error?err.message:"ดำเนินการไม่สำเร็จ");}
    finally{setBusy(false);}
  }
  return <section className="space-y-5">
    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-pink-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black text-slate-900">จัดการบัญชีโรงเรียน</h2><p className="mt-1 text-sm text-slate-600">สร้าง Username และรหัสผ่านสำหรับโรงเรียนที่เข้าร่วม โดยไม่ต้องใช้ Gmail</p></div><span className="rounded-full bg-indigo-700 px-3 py-1.5 text-xs font-bold text-white">เฉพาะผู้ดูแล</span></div>
      <p className="mt-3 text-xs text-slate-500">โรงเรียนหนึ่งแห่งมีบัญชีประจำการแข่งขันหนึ่งบัญชี · รหัสผ่านแสดงให้ผู้ดูแลเพียงครั้งเดียว · โรงเรียนจัดการได้เฉพาะข้อมูลตนเอง</p>
    </div>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
    {generated && <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
      <p className="font-bold text-amber-950">ข้อมูลบัญชีที่ต้องส่งให้โรงเรียน (แสดงครั้งเดียว)</p>
      <p className="mt-2 text-sm text-slate-800">{generated.schoolName}</p>
      <p className="mt-2 text-sm">ชื่อผู้ใช้: <strong className="font-mono">{generated.username}</strong></p>
      <p className="mt-1 break-all text-sm">รหัสผ่าน: <strong className="font-mono">{generated.password}</strong></p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white" onClick={()=>void navigator.clipboard.writeText(`ระบบกีฬากลุ่ม\nโรงเรียน: ${generated.schoolName}\nลิงก์: ${window.location.origin}/group-sports/login\nUsername: ${generated.username}\nPassword: ${generated.password}`)}>คัดลอกข้อมูลเข้าระบบ</button>
        <button type="button" className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold" onClick={()=>setGenerated(null)}>ปิดข้อมูลรหัสผ่าน</button>
      </div>
      <p className="mt-2 text-xs text-amber-900">ควรส่งรหัสผ่านทางช่องทางส่วนตัว ไม่ส่งในกลุ่มสาธารณะ หากสูญหายให้กดรีเซ็ตใหม่</p>
    </div>}
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <form onSubmit={create} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-black text-slate-900">สร้างบัญชีโรงเรียน</h3>
        <label className="block text-sm font-bold text-slate-700">โรงเรียนที่เข้าร่วมการแข่งขัน
          <select value={selectedSchool} onChange={e=>setSelectedSchool(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm" required>
            <option value="">เลือกโรงเรียน</option>{schools.filter(s=>!accounts.some(a=>a.school_id===s.id)).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="block text-sm font-bold text-slate-700">Username
          <input value={username} onChange={e=>setUsername(e.target.value.toLowerCase())} placeholder="เช่น py001" minLength={4} maxLength={32} pattern="[a-z][a-z0-9._-]{3,31}" required autoComplete="off" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm" />
        </label>
        <label className="block text-sm font-bold text-slate-700">รหัสผ่านเริ่มต้น (ไม่กรอก = สุ่มรหัสแข็งแรงให้)
          <input value={password} onChange={e=>setPassword(e.target.value)} minLength={12} maxLength={128} autoComplete="new-password" type="password" placeholder="อย่างน้อย 12 ตัวอักษร" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm" />
        </label>
        <button disabled={busy||loading} type="submit" className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50">{busy?"กำลังบันทึก...":"＋ สร้างบัญชีโรงเรียน"}</button>
      </form>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4"><h3 className="font-black text-slate-900">บัญชีที่สร้างแล้ว ({accounts.length})</h3><button type="button" disabled={busy} onClick={()=>void load()} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-blue-700">รีเฟรช</button></div>
        <div className="max-h-[550px] overflow-auto">
          {loading?<p className="p-5 text-sm text-slate-500">กำลังโหลด...</p>:!accounts.length?<p className="p-5 text-sm text-slate-500">ยังไม่มีบัญชีโรงเรียน</p>:<div className="divide-y divide-slate-100">{accounts.map(a=><div key={a.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-bold text-slate-900">{schools.find(s=>s.id===a.school_id)?.name||"โรงเรียน"}</p><p className="mt-1 text-xs text-slate-500">Username: <span className="font-mono font-bold">{a.username}</span></p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${a.is_active?"bg-emerald-100 text-emerald-800":"bg-slate-200 text-slate-600"}`}>{a.is_active?"ใช้งาน":"ปิดใช้งาน"}</span></div>
            <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy||!a.is_active} onClick={()=>void modify(a,"reset_password")} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 disabled:opacity-40">รีเซ็ตรหัสผ่าน</button><button type="button" disabled={busy} onClick={()=>void modify(a,a.is_active?"disable":"enable")} className={`rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40 ${a.is_active?"border-rose-200 bg-rose-50 text-rose-700":"border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{a.is_active?"ปิดบัญชี":"เปิดบัญชี"}</button></div>
          </div>)}</div>}
        </div>
      </div>
    </div>
  </section>;
}
