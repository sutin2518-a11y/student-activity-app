"use client";
import { useEffect, useState } from "react";
import { verifyPhotoFile } from "@/lib/group-sports/rov-photos";

export default function FootballPhotoPicker({file,onChange,label,enabled=true}:{file?:File;onChange:(file?:File)=>void;label:string;enabled?:boolean}){
 const [url,setUrl]=useState(""); const [error,setError]=useState("");
 useEffect(()=>{if(!file){setUrl("");return;}const next=URL.createObjectURL(file);setUrl(next);return()=>URL.revokeObjectURL(next);},[file]);
 return <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-2">
  <div className="flex h-24 w-[76px] shrink-0 items-center justify-center overflow-hidden rounded border border-slate-300 bg-slate-50 text-center text-xs text-slate-500">{url?<img src={url} alt={`ตัวอย่างรูป${label}`} className="h-full w-full object-contain"/>:"รูปถ่าย"}</div>
  <div className="min-w-0 flex-1"><p className="text-xs font-bold">{label}</p><p className="text-xs text-slate-500">JPG / PNG / WebP ไม่เกิน 5 MB · {enabled?"บันทึกพร้อมใบสมัคร":"ระบุชื่อก่อนแนบรูป"}</p>
   <input type="file" accept="image/jpeg,image/png,image/webp" aria-label={label} disabled={!enabled} className="mt-1 block max-w-full text-xs" onChange={e=>{const f=e.currentTarget.files?.[0];e.currentTarget.value="";if(!f)return;try{verifyPhotoFile(f);setError("");onChange(f);}catch(err){setError(err instanceof Error?err.message:"ไฟล์ไม่ถูกต้อง");}}}/>
   {file&&<button type="button" onClick={()=>{onChange(undefined);setError("");}} className="mt-1 text-xs font-bold text-red-800 underline">เอารูปที่เลือกออก</button>}{error&&<p role="alert" className="text-xs text-red-800">{error}</p>}
  </div></div>;
}
