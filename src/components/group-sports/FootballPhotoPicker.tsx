"use client";
import { useEffect, useRef, useState } from "react";
import { verifyPhotoFile } from "@/lib/group-sports/rov-photos";

export default function FootballPhotoPicker({file,onChange,label,enabled=true}:{file?:File;onChange:(file?:File)=>void;label:string;enabled?:boolean}){
 const inputRef=useRef<HTMLInputElement>(null);
 const [url,setUrl]=useState("");
 const [error,setError]=useState("");
 useEffect(()=>{setError("");if(!file){setUrl("");return;}const next=URL.createObjectURL(file);setUrl(next);return()=>URL.revokeObjectURL(next);},[file]);
 return <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3" style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:12}}>
  <div className="rounded border border-slate-300 bg-slate-50 text-slate-500" style={{display:"flex",width:76,height:96,flexShrink:0,alignItems:"center",justifyContent:"center",overflow:"hidden",fontSize:12}}>{url?<img src={url} alt={`ตัวอย่าง${label}`} style={{width:"100%",height:"100%",objectFit:"contain"}} onError={()=>setError("ไม่สามารถแสดงตัวอย่างรูปได้ กรุณาเลือกไฟล์ภาพใหม่")}/>:"รูปถ่าย"}</div>
  <div style={{flex:"1 1 180px",minWidth:0}}><p className="text-sm font-bold">{label}</p><p className="text-xs text-slate-500">JPG / PNG / WebP ไม่เกิน 5 MB · เลือกรูปก่อนกรอกชื่อได้</p>
   <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" aria-label={`เลือกไฟล์${label}`} disabled={!enabled} hidden style={{display:"none"}} onChange={e=>{const f=e.currentTarget.files?.[0];e.currentTarget.value="";if(!f)return;try{verifyPhotoFile(f);setError("");onChange(f);}catch(err){setError(err instanceof Error?err.message:"ไฟล์ไม่ถูกต้อง");}}}/>
   <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:8,marginTop:8}}>
    <button type="button" disabled={!enabled} aria-label={`${file?"เปลี่ยน":"แนบ"}${label}`} onClick={()=>inputRef.current?.click()} className="rounded-lg bg-red-800 px-3 py-2 text-sm font-bold text-white disabled:opacity-50" style={{background:enabled?"#991b1b":"#94a3b8",color:"white",padding:"7px 12px",borderRadius:8,border:0,cursor:enabled?"pointer":"not-allowed"}}>{file?"เปลี่ยนรูป":"+ แนบรูปถ่าย"}</button>
    {file&&<button type="button" disabled={!enabled} onClick={()=>{onChange(undefined);setError("");}} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-red-800">ลบรูปที่เลือก</button>}
   </div>
   {file?<><p className="mt-1 text-xs font-semibold text-emerald-800" style={{overflowWrap:"anywhere"}}>เลือกรูปแล้ว: {file.name} (ยังไม่ส่งเข้าฐานข้อมูล)</p><p className="text-xs text-slate-600">ตรวจว่ารูปตรงกับชื่อในช่องนี้ก่อนส่งใบสมัคร</p></>:<p className="mt-1 text-xs text-slate-500">ยังไม่ได้เลือกรูป</p>}
   {error&&<p role="alert" className="mt-1 text-xs font-bold text-red-800">{error}</p>}
  </div>
 </div>;
}
