"use client";

import { useEffect, useRef, useState } from "react";
import type { RegistrationSport } from "@/lib/group-sports/registration-hub";

type SportRegistrationEmbedProps = {
  sport: RegistrationSport;
  title: string;
};

export default function SportRegistrationEmbed({ sport, title }: SportRegistrationEmbedProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [height, setHeight] = useState(960);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== frameRef.current?.contentWindow) return;
      if (!event.data || event.data.type !== "ckw-sport-registration-height") return;

      const nextHeight = Number(event.data.height);
      if (!Number.isFinite(nextHeight)) return;
      setHeight(Math.max(760, Math.min(5600, Math.ceil(nextHeight) + 12)));
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const src = `/group-sports?section=registration&sport=${encodeURIComponent(sport)}&embed=1`;

  return (
    <section className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 bg-blue-50 px-4 py-3 sm:px-5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">PHAYAO GAMES 2026 · REGISTRATION</p>
          <h2 className="mt-1 text-lg font-black text-[#07123d]">ลงทะเบียนนักกีฬา · {title}</h2>
          <p className="mt-1 text-xs text-slate-600">แบบฟอร์มกลางของระบบกีฬากลุ่ม · ข้อมูลใบสมัครและรายชื่อนักกีฬาใช้ฐานข้อมูลเดิม</p>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
          ระบบบันทึกข้อมูลกลาง
        </span>
      </div>
      <iframe
        ref={frameRef}
        key={sport}
        src={src}
        title={`แบบฟอร์มลงทะเบียนนักกีฬา ${title}`}
        loading="eager"
        scrolling="no"
        className="block w-full border-0 bg-[#eaf5ed]"
        style={{ height: `${height}px` }}
      />
    </section>
  );
}
