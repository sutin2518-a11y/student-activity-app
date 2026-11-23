"use client";
import Link from "next/link";
import {useParams} from "next/navigation";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
import {certificateAward,certificateNumber} from "@/lib/group-sports/certificates";

type VerifyData = {valid:boolean;id?:number;recipient_name?:string;recipient_type?:string;school_name?:string;event_name?:string;competition_name?:string;kind?:string;rank?:number|null;issued_at?:string};
export default function VerifyCertificateClient(){
  const params=useParams<{token:string}>();
  const token=params.token;
  const [data,setData]=useState<VerifyData|null>(null);
  const [error,setError]=useState("");
  useEffect(()=>{
    if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(token||"")){
      setData({valid:false});return;
    }
    let active=true;
    supabase.rpc("sports_cert_verify",{p_token:token}).then(res=>{
      if(!active)return;
      if(res.error) setError("ไม่สามารถตรวจสอบข้อมูลได้ กรุณาลองอีกครั้ง");
      else setData((res.data||{valid:false}) as VerifyData);
    });
    return ()=>{active=false;};
  },[token]);
  return <main className="min-h-screen bg-[#f4f6f9] px-4 py-16 text-slate-900">
    <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-xl">
      <header className="bg-gradient-to-r from-red-900 to-slate-900 px-6 py-7 text-white">
        <div className="text-xs font-bold tracking-widest text-amber-300">PHULANGKA GAMES 2026</div>
        <h1 className="mt-2 text-2xl font-extrabold">ตรวจสอบเกียรติบัตร</h1>
      </header>
      <div className="space-y-4 px-6 py-7">
        {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
        {!data&&!error&&<p>กำลังตรวจสอบเลขที่เอกสาร...</p>}
        {data&&!data.valid&&<div className="rounded-xl border border-red-200 bg-red-50 p-4 font-bold text-red-900">ไม่พบเกียรติบัตรที่มีผลใช้งานตาม QR Code นี้</div>}
        {data?.valid&&<>
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 font-extrabold text-green-800">✓ เกียรติบัตรได้รับการตรวจสอบจากระบบการแข่งขัน</div>
          <dl className="grid gap-3 text-sm">
            <div><dt className="text-slate-500">เลขที่เอกสาร</dt><dd className="font-bold">{certificateNumber(data.id!)}</dd></div>
            <div><dt className="text-slate-500">ชื่อผู้รับ</dt><dd className="text-lg font-bold">{data.recipient_name}</dd></div>
            <div><dt className="text-slate-500">โรงเรียน</dt><dd>{data.school_name}</dd></div>
            <div><dt className="text-slate-500">รายการแข่งขัน</dt><dd>{data.event_name}</dd></div>
            <div><dt className="text-slate-500">ผลงาน</dt><dd className="font-bold text-red-900">{certificateAward(data.rank??null,data.kind||"")}</dd></div>
            <div><dt className="text-slate-500">ออกเมื่อ</dt><dd>{data.issued_at?new Intl.DateTimeFormat("th-TH",{dateStyle:"long"}).format(new Date(data.issued_at)):"-"}</dd></div>
          </dl>
        </>}
        <Link className="inline-block rounded-xl bg-red-900 px-4 py-2.5 font-bold text-white" href="/group-sports">กลับหน้ากีฬากลุ่ม</Link>
      </div>
    </div>
  </main>;
}
