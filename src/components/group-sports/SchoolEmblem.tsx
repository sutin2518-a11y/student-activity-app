"use client";
import { useState } from "react";
import logos from "@/lib/group-sports/school-emblems.json";
const normalize = (s: string) => s.normalize("NFKC").trim().replace(/^โรงเรียน\s*/u, "").replace(/\s+/gu, "").replace(/[๐-๙]/g, x => String("๐๑๒๓๔๕๖๗๘๙".indexOf(x)));
export function schoolEmblemPath(name: string): string | undefined { return Object.prototype.hasOwnProperty.call(logos, normalize(name)) ? (logos as Record<string,string>)[normalize(name)] : undefined; }
function EmblemImage({src,name}:{src?:string;name:string}) {
  const [failed,setFailed]=useState(false);
  return <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white p-1 sm:h-[72px] sm:w-[72px]">
    {src&&!failed?<img src={src} alt={`ตรา${name}`} width={64} height={64} loading="lazy" decoding="async" className="h-full w-full object-contain" onError={()=>setFailed(true)}/>:<span aria-hidden="true" className="text-2xl">🏫</span>}
  </span>;
}
export default function SchoolEmblem({schoolName}:{schoolName:string}) { const src=schoolEmblemPath(schoolName); return <EmblemImage key={src||schoolName} src={src} name={schoolName}/>; }
