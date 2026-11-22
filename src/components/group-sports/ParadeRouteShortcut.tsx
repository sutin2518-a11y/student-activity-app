"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Exactly two official parade approaches. The second route stays visible but
 * cannot open Maps until an authorised administrator supplies its URL.
 * Their names/directions are fixed for this sports event; URLs are editable.
 */
const OFFICIAL_ROUTES = [
  { number: 1 as const, name: "เส้นทางที่ 1", description: "อำเภอจุน → จุดท้ายขบวนพาเหรด" },
  { number: 2 as const, name: "เส้นทางที่ 2", description: "อำเภอปง → จุดหัวขบวนพาเหรด" },
];

// Reproduces the provided Jun → two waypoints → end directions as a standard
// Google Maps Directions URL; these are committee-supplied coordinates.
const INITIAL_JUN_ROUTE = "https://www.google.com/maps/dir/?api=1&origin=19.3558861%2C100.1479182&destination=19.530361%2C100.295979&waypoints=19.5194041%2C100.3013921%7C19.524234%2C100.3003952&travelmode=driving";

type RouteNumber = 1 | 2;
type RouteRow = { route_no: RouteNumber; maps_url: string | null };
type RouteLinks = Record<RouteNumber, string>;
const DEFAULT_LINKS: RouteLinks = { 1: INITIAL_JUN_ROUTE, 2: "" };

// Only official Google Maps link hosts. Refuse javascript: and look-alike domains.
function validMapsLink(value: string): string | null {
  if (!value.trim()) return null;
  try {
    const u = new URL(value.trim());
    if (u.protocol !== "https:" || u.username || u.password || u.href.length > 2048) return null;
    const host = u.hostname.toLowerCase();
    const path = u.pathname.toLowerCase();
    const googleMapPath = (host === "www.google.com" || host === "google.com" || host === "www.google.co.th" || host === "google.co.th") && (path === "/maps" || path.startsWith("/maps/"));
    const subdomain = host === "maps.google.com" || host === "maps.google.co.th";
    const short = (host === "maps.app.goo.gl" && path.length > 1) || (host === "goo.gl" && path.startsWith("/maps/"));
    return googleMapPath || subdomain || short ? u.href : null;
  } catch { return null; }
}

export default function ParadeRouteShortcut({ competitionId, canManage }: {
  competitionId: string | null;
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<RouteLinks>(DEFAULT_LINKS);
  const [editNumber, setEditNumber] = useState<RouteNumber | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const container = useRef<HTMLDivElement | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);

  const reload = useCallback(async () => {
    if (!competitionId) return;
    const result = await supabase.from("sports_parade_routes")
      .select("route_no,maps_url")
      .eq("competition_id", competitionId);
    if (result.error) {
      if (canManage) setError("ไม่สามารถโหลด/แก้ไขลิงก์ได้ กรุณารัน SQL Migration 0023 ก่อน");
      return;
    }
    const next = { ...DEFAULT_LINKS };
    for (const row of (result.data ?? []) as RouteRow[]) {
      if (row.route_no === 1 || row.route_no === 2) next[row.route_no] = validMapsLink(row.maps_url ?? "") ?? "";
    }
    setLinks(next);
    setError("");
  }, [competitionId,canManage]);

  useEffect(() => { void reload(); }, [reload]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) {
        setOpen(false); setEditNumber(null);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false); setEditNumber(null); trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);

  const beginEdit = (number: RouteNumber) => {
    setEditNumber(number); setDraft(links[number]); setError(""); setMessage("");
  };

  const saveLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!competitionId || !canManage || !editNumber || busy) return;
    const input = draft.trim();
    const validated = input ? validMapsLink(input) : null;
    if (input && !validated) { setError("กรุณาใช้ลิงก์ HTTPS ของ Google Maps เท่านั้น"); return; }
    if (editNumber === 1 && !validated) { setError("เส้นทางที่ 1 ต้องมีลิงก์นำทาง"); return; }
    setBusy(true);setError("");setMessage("");
    const result = await supabase.from("sports_parade_routes").upsert({
      competition_id: competitionId,
      route_no: editNumber,
      maps_url: validated,
    }, { onConflict: "competition_id,route_no" });
    setBusy(false);
    if (result.error) { setError(`บันทึกลิงก์ไม่สำเร็จ: ${result.error.message}`); return; }
    setLinks(current => ({ ...current, [editNumber]: validated ?? "" }));
    setMessage(validated ? `บันทึกลิงก์เส้นทางที่ ${editNumber} เรียบร้อย` : "ยังไม่กำหนดลิงก์เส้นทางที่ 2");
    setEditNumber(null);
  };

  return (
    <div ref={container} className="relative z-[60] w-full max-w-[340px] text-left sm:w-auto">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="official-parade-route-choices"
        onClick={() => { setOpen(value => !value); setEditNumber(null);setError("");setMessage(""); }}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/80 bg-white px-4 py-3 text-sm font-extrabold text-[#991b1b] shadow-[0_5px_18px_rgba(60,0,12,0.23)] transition-colors hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true" className="h-5 w-5 shrink-0"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15m6-12v15"/><path d="M17 10h.01"/></svg>
        แผนที่และการนำทาง
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={`h-4 w-4 transition-transform duration-200 ${open?"rotate-180":""}`}><path d="m6 9 6 6 6-6"/></svg>
      </button>
      {open && (
        <div id="official-parade-route-choices" role="group" aria-label="เลือกเส้นทางขบวนพาเหรด" className="absolute right-0 top-full z-[70] mt-3 w-[min(354px,calc(100vw-2rem))] rounded-2xl border border-rose-100 bg-white p-3 text-slate-800 shadow-[0_18px_45px_rgba(55,0,18,0.27)]">
          <h2 className="px-1 text-sm font-extrabold text-[#7f1d1d]">เลือกเส้นทางตั้งขบวนพาเหรด</h2>
          <p className="mb-3 mt-1 px-1 text-xs leading-5 text-slate-500">เลือกเส้นทางแล้วเปิด Google Maps ได้ทันที</p>
          <div className="space-y-2">
            {OFFICIAL_ROUTES.map(route => {
              const url = validMapsLink(links[route.number]);
              return (
                <div key={route.number} className="rounded-xl border border-rose-100 bg-[#fff9fa] p-3">
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`${route.name} ${route.description} เปิด Google Maps`} className="group flex min-h-12 items-center justify-between gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-red-700">
                      <span className="min-w-0"><span className="block text-sm font-extrabold text-[#7f1d1d] group-hover:underline">{route.name}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{route.description}</span></span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="h-5 w-5 shrink-0 text-[#991b1b]"><path d="m9 18 6-6-6-6"/></svg>
                    </a>
                  ) : (
                    <div className="flex min-h-12 items-center justify-between gap-3" aria-label={`${route.name} ${route.description} รอเพิ่มลิงก์`}>
                      <span className="min-w-0"><span className="block text-sm font-extrabold text-slate-700">{route.name}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{route.description}</span></span>
                      <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">รอเพิ่มลิงก์</span>
                    </div>
                  )}
                  {canManage && <button type="button" onClick={() => beginEdit(route.number)} className="mt-2 rounded-md px-1 py-1 text-xs font-semibold text-[#991b1b] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700">{url ? "แก้ไขลิงก์" : "เพิ่มลิงก์ Google Maps"}</button>}
                </div>
              );
            })}
          </div>
          {canManage && editNumber && (
            <form onSubmit={saveLink} className="mt-3 space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
              <label className="block text-xs font-bold text-[#7f1d1d]" htmlFor="official-route-url">ลิงก์ Google Maps สำหรับเส้นทางที่ {editNumber}</label>
              <input id="official-route-url" type="url" maxLength={2048} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="https://www.google.com/maps/dir/..." className="w-full rounded-lg border border-rose-200 bg-white p-2.5 text-xs text-slate-800 outline-red-600" />
              {editNumber === 2 && <p className="text-[11px] leading-5 text-slate-500">ยังไม่พร้อมใช้งานสามารถปล่อยว่างไว้ได้ เมื่อมีลิงก์แล้วจึงกลับมาเพิ่ม</p>}
              <div className="flex gap-2"><button type="submit" disabled={busy} className="rounded-lg bg-[#991b1b] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? "กำลังบันทึก..." : "บันทึกลิงก์"}</button><button type="button" disabled={busy} onClick={()=>{setEditNumber(null);setError("");}} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">ยกเลิก</button></div>
            </form>
          )}
          {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-800">{error}</p>}
          {message && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">{message}</p>}
        </div>
      )}
    </div>
  );
}
