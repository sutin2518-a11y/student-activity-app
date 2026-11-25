"use client";

import { useEffect, useMemo, useState } from "react";
import { futsalStaffSlots, type FutsalCoach } from "@/lib/group-sports/futsal-staff";
import { downloadAthletePhoto, uploadAthletePhoto, verifyPhotoFile } from "@/lib/group-sports/rov-photos";

/** Pictures of team manager and coaches; uses the same private, per-school Storage RLS. */
export default function FutsalStaffPhotoManager({ entryId, coaches }: {entryId:string;coaches:FutsalCoach[]}) {
  const slots = useMemo(() => futsalStaffSlots(coaches), [coaches]);
  const [photos,setPhotos] = useState<Record<string,string>>({});
  const [revision,setRevision] = useState(0);
  const [loading,setLoading] = useState(true);
  const [uploading,setUploading] = useState<string|null>(null);
  const [message,setMessage] = useState("");
  useEffect(() => {
    let cancelled = false;
    const urls:string[] = [];
    setPhotos({});setLoading(true);
    void (async()=>{
      const list: [string,string][] = [];
      for(let start=0;start<slots.length && !cancelled;start+=6){
        const items=await Promise.all(slots.slice(start,start+6).filter(s=>s.name).map(async s=>{
          const url=await downloadAthletePhoto(entryId,s.photoIndex,s.identity).catch(()=>null);
          if(url){if(cancelled)URL.revokeObjectURL(url);else urls.push(url);}
          return [s.key,url] as const;
        }));
        for(const [key,url] of items)if(url)list.push([key,url]);
      }
      if(!cancelled){setPhotos(Object.fromEntries(list));setLoading(false);}
    })();
    return ()=>{cancelled=true;urls.forEach(url=>URL.revokeObjectURL(url));};
  },[entryId,slots,revision]);
  return <section className="mt-4 rounded-xl border border-rose-200 bg-white p-4">
    <h3 className="font-black text-red-900">รูปถ่ายผู้จัดการทีมและเจ้าหน้าที่</h3>
    <p className="mt-1 text-xs text-slate-600">แนบรูป JPG / PNG / WebP ไม่เกิน 5 MB ต่อคน · รูปจะปรากฏในแผงรูปหน้าแผงรูปฟุตซอล (4 ตำแหน่งแรก) อัตโนมัติ · ต้องบันทึกชื่อเจ้าหน้าที่ก่อนแนบรูป</p>
    {message&&<p role="status" className="mt-2 rounded-lg bg-rose-50 p-2 text-sm font-semibold text-red-800">{message}</p>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:12,marginTop:12}}>
      {slots.map((staff)=><div key={staff.key} className="rounded-lg border border-slate-200 p-2 text-center">
        <div className="mx-auto flex h-28 w-20 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50">
          {photos[staff.key]?<img src={photos[staff.key]} alt={`รูป ${staff.title} ${staff.name}`} className="h-full w-full object-cover"/>:
            <span className="text-xs text-slate-400">{loading?"กำลังโหลด":staff.name?"ยังไม่มีรูป":"ยังไม่ระบุชื่อ"}</span>}
        </div>
        <p className="mt-2 text-xs font-bold">{staff.title}</p>
        <p className="min-h-8 break-words text-xs text-slate-600">{staff.name||"—"}</p>
        <label className={`mt-2 block rounded-md px-2 py-2 text-xs font-bold text-white ${staff.name?"cursor-pointer bg-red-700 hover:bg-red-800":"cursor-not-allowed bg-slate-400"}`}>
          {uploading===staff.key?"กำลังอัปโหลด...":photos[staff.key]?"เปลี่ยนรูป":"แนบรูป"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={`แนบรูป${staff.title} ${staff.name}`} disabled={!staff.name||uploading!==null} onChange={event=>{
            const file=event.currentTarget.files?.[0];event.currentTarget.value="";
            if(!file)return;
            setMessage("");setUploading(staff.key);
            void (async()=>{try{
              verifyPhotoFile(file);
              await uploadAthletePhoto(entryId,staff.photoIndex,staff.identity,file);
              setRevision(v=>v+1);
              setMessage(`บันทึกรูป${staff.title} ${staff.name} เรียบร้อยแล้ว`);
            }catch(e){setMessage(e instanceof Error?e.message:"แนบรูปไม่สำเร็จ");}
            finally{setUploading(null);}})();
          }}/>
        </label>
      </div>)}
    </div>
  </section>;
}
