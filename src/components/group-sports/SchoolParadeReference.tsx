"use client";

import { useEffect, useState } from "react";

type ParadeReferenceSection = "parade_order" | "parade_map" | "cheer_stands" | "assembly_points";

type ReferenceImage = {
  title: string;
  subtitle: string;
  file: string;
  preview: string;
  alt: string;
  width: number;
  height: number;
  note: string;
};

const paradeOrder: ReferenceImage = {
  title: "ลำดับขบวนพาเหรด ประจำปี 2569",
  subtitle: "รายชื่อและลำดับขบวนของโรงเรียนตามภาพที่คณะผู้จัดส่งมา",
  file: "/images/group-sports/parade-order-2569.png",
  preview: "/images/group-sports/parade-order-2569-preview.webp",
  alt: "โปสเตอร์ลำดับขบวนพาเหรดกีฬากลุ่มโรงเรียนมัธยมศึกษาจังหวัดพะเยา ประจำปี 2569 มีรายชื่อโรงเรียนลำดับที่ 1 ถึง 20",
  width: 1024,
  height: 1536,
  note: "ภาพรายชื่อขบวนที่ 1–20 ตามไฟล์ต้นฉบับ หากมีประกาศปรับลำดับภายหลัง ให้ยึดประกาศฉบับล่าสุดของคณะกรรมการ",
};

const ceremonyMap: ReferenceImage = {
  title: "ผังพิธีเปิดและการจัดพื้นที่ในสนาม",
  subtitle: "แสดงจุดยืนของขบวนพาเหรด ลู่วิ่ง อัฒจันทร์ และตำแหน่งกองเชียร์",
  file: "/images/group-sports/opening-ceremony-and-cheer-stands-2569.png",
  preview: "/images/group-sports/opening-ceremony-and-cheer-stands-2569-preview.webp",
  alt: "แผนผังสนามพิธีเปิดภูลังกาเกมส์ 2569 แสดงลู่วิ่ง จุดตั้งขบวนในสนาม และตำแหน่งอัฒจันทร์กองเชียร์พร้อมชื่อโรงเรียน",
  width: 1495,
  height: 1052,
  note: "ผังเดียวกันแสดงทั้งตำแหน่งขบวนในสนามและสแตนเชียร์ด้านบนของภาพ กรุณาขยายภาพเพื่ออ่านชื่อโรงเรียนและพื้นที่ที่ได้รับจัดสรร",
};

const assemblyLocation: ReferenceImage = {
  title: "สถานที่ตั้งขบวนพาเหรด ประจำปี 2569",
  subtitle: "ภาพถ่ายแผนที่แสดงแนวถนนและจุดกำหนดพื้นที่ตั้งขบวนพาเหรด",
  file: "/images/group-sports/parade-assembly-location-2569.png",
  preview: "/images/group-sports/parade-assembly-location-2569-preview.webp",
  alt: "ภาพสถานที่ตั้งขบวนพาเหรดบริเวณถนนหมายเลข 1148 ในพื้นที่เชียงคำ แสดงแนวถนนและจุดสีเหลืองที่ระบุบนภาพต้นฉบับ",
  width: 1452,
  height: 821,
  note: "ใช้ภาพนี้ตรวจตำแหน่งพื้นที่ตั้งขบวนและแนวถนนก่อนวันงาน จุดสีเหลืองและเส้นระยะทางเป็นข้อมูลตามภาพที่คณะกรรมการส่งมา ภาพนี้ไม่ใช่ลิงก์นำทาง Google Maps",
};

export function hasSchoolParadeReference(section: string): section is ParadeReferenceSection {
  return section === "parade_order" || section === "parade_map" || section === "cheer_stands" || section === "assembly_points";
}

export default function SchoolParadeReference({ section }: { section: ParadeReferenceSection }) {
  const content = section === "parade_order" ? paradeOrder : section === "assembly_points" ? assemblyLocation : ceremonyMap;
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!open) return;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = priorOverflow;
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return <>
    <article className="mb-5 overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-b from-rose-50/70 to-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-100 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <span aria-hidden="true" className="text-xl">🗺️</span>
            <h3 className="text-base font-extrabold text-[#7f1d1d] sm:text-lg">{content.title}</h3>
          </div>
          <p className="text-sm leading-6 text-slate-600">{section === "cheer_stands" ? "ตำแหน่งสแตนเชียร์อยู่บริเวณด้านบนของผังพิธีเปิด" : content.subtitle}</p>
        </div>
        <span className="shrink-0 rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-bold text-rose-800">ภาพประกอบปี 2569</span>
      </div>
      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_245px] lg:items-start">
        <button
          type="button"
          onClick={() => { setZoom(1); setOpen(true); }}
          className="group relative flex min-h-[240px] w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-xl border border-rose-100 bg-white p-2 shadow-inner transition hover:border-rose-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
          aria-label={`ขยายดูภาพเต็ม: ${content.title}`}
        >
          <img src={content.preview} alt={content.alt} width={content.width} height={content.height} loading="lazy" className="mx-auto max-h-[520px] w-auto max-w-full object-contain transition duration-200 group-hover:scale-[1.012]" />
          <span className="absolute bottom-3 right-3 rounded-lg bg-slate-950/75 px-3 py-2 text-xs font-bold text-white shadow">🔍 กดขยายภาพ</span>
        </button>
        <div className="flex flex-col gap-3">
          <p className="text-sm leading-7 text-slate-700">{content.note}</p>
          <button type="button" onClick={() => { setZoom(1); setOpen(true); }} className="rounded-xl bg-[#991b1b] px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#7f1d1d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700">🔍 ดูภาพขนาดใหญ่</button>
          <a href={content.file} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-rose-200 bg-white px-4 py-3 text-center text-sm font-bold text-red-800 transition hover:bg-rose-50">เปิดภาพต้นฉบับในแท็บใหม่ ↗</a>
          <a href={content.file} download className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-50">⬇ ดาวน์โหลดภาพต้นฉบับ</a>
          <p className="text-xs leading-5 text-slate-500">ไฟล์ภาพเปิดได้โดยตรง ไม่ต้องเข้าสู่ Google Maps หรือหน้าเว็บอื่น</p>
        </div>
      </div>
    </article>

    {open && <div
      role="dialog"
      aria-modal="true"
      aria-label={`ขยายภาพ ${content.title}`}
      className="fixed inset-0 z-[250] flex flex-col bg-slate-950/90 p-2 text-white backdrop-blur-sm sm:p-4"
      onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
    >
      <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-900/90 px-3 py-2 shadow-lg">
        <span className="min-w-0 flex-1 truncate text-sm font-bold">{content.title}</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setZoom(z => Math.max(1, Math.round((z - .5) * 10) / 10))} disabled={zoom <= 1} className="rounded-lg border border-white/20 px-3 py-2 text-sm disabled:opacity-40" aria-label="ย่อภาพ">−</button>
          <span className="min-w-[46px] text-center text-xs">{zoom === 1 ? "พอดีจอ" : `${zoom}×`}</span>
          <button type="button" onClick={() => setZoom(z => Math.min(3, Math.round((z + .5) * 10) / 10))} disabled={zoom >= 3} className="rounded-lg border border-white/20 px-3 py-2 text-sm disabled:opacity-40" aria-label="ขยายภาพ">+</button>
          <button type="button" onClick={() => setOpen(false)} className="ml-1 rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-900" aria-label="ปิดภาพขยาย">✕ ปิด</button>
        </div>
      </div>
      <div className="mt-2 flex min-h-0 flex-1 overflow-auto rounded-xl bg-slate-950/60 p-2">
        <img
          src={content.file}
          alt={content.alt}
          width={content.width}
          height={content.height}
          className={zoom === 1 ? "m-auto max-h-full max-w-full object-contain shadow-lg" : "m-auto h-auto max-w-none self-start shadow-lg"}
          style={zoom > 1 ? { width: `${Math.round(content.width * zoom)}px` } : undefined}
        />
      </div>
      <div className="mx-auto mt-2 flex w-full max-w-[1600px] items-center justify-between gap-3 px-2 text-xs text-slate-300">
        <span>ใช้ปุ่ม + เพื่อขยายและเลื่อนดูรายละเอียด · กด Esc เพื่อปิด</span>
        <a href={content.file} target="_blank" rel="noopener noreferrer" className="shrink-0 font-bold text-white underline underline-offset-2">เปิดภาพเต็ม ↗</a>
      </div>
    </div>}
  </>;
}
