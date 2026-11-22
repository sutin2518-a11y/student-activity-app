"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

const PREFIXES = ["นางสาว", "นาย", "นาง", "ดร.", "ว่าที่ร้อยตรี", "ว่าที่ร้อยโท"] as const;
const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600";

function parseDirector(value: string): { prefix: string; name: string } {
  const normalized = value.trim();
  if (!normalized) return { prefix: "นาย", name: "" };
  // Longest first prevents interpreting 'นางสาว' as 'นาง'.
  const prefix = [...PREFIXES].sort((a,b) => b.length - a.length)
    .find((item) => normalized.startsWith(item));
  return prefix
    ? { prefix, name: normalized.slice(prefix.length).trim() }
    : { prefix: "other", name: normalized };
}

export default function SchoolDirectorEditor({
  schoolId, schoolName, currentName, competitionId, canEdit, onSaved,
}: {
  schoolId: string;
  schoolName: string;
  currentName: string;
  competitionId: string;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [prefix, setPrefix] = useState(() => parseDirector(currentName).prefix);
  const [name, setName] = useState(() => parseDirector(currentName).name);
  const [customPrefix, setCustomPrefix] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!editing) {
      const next = parseDirector(currentName);
      setPrefix(next.prefix);
      setName(next.name);
    }
  }, [currentName, editing]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit || busy) return;
    const actualPrefix = prefix === "other" ? customPrefix.trim() : prefix;
    const fullName = `${actualPrefix}${name.trim()}`.trim();
    if (!fullName || fullName.length > 200 || !name.trim()) {
      setError("กรุณากรอกคำนำหน้า ชื่อ และนามสกุลให้ครบ (ไม่เกิน 200 ตัวอักษร)");
      return;
    }
    if (prefix === "other" && !actualPrefix) {
      setError("กรุณาระบุคำนำหน้าหรือยศ");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await supabase.rpc("sports_set_school_director", {
        p_comp: competitionId, p_school: schoolId, p_director_name: fullName,
      });
      if (result.error) throw result.error;
      setEditing(false);
      setMessage("บันทึกชื่อผู้อำนวยการแล้ว");
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ไม่สามารถบันทึกชื่อผู้อำนวยการได้");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-3 border-t border-rose-100 pt-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-slate-700"><strong>ผู้อำนวยการ:</strong> {currentName || "ยังไม่ได้ระบุ"}</p>
        {canEdit && <button type="button" className="font-bold text-red-700 underline underline-offset-2" onClick={() => {setEditing(!editing);setError("");setMessage("");}}>
          {editing ? "ปิด" : "แก้ไขชื่อผู้อำนวยการ"}
        </button>}
      </div>
      {message && <p role="status" className="mt-2 text-emerald-700">{message}</p>}
      {editing && canEdit && (
        <form onSubmit={(event) => void submit(event)} className="mt-3 space-y-2 rounded-xl bg-rose-50 p-3">
          <p className="font-semibold text-red-900">ข้อมูลผู้อำนวยการ {schoolName}</p>
          <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-2">
            <label className="block">คำนำหน้า / ยศ
              <select className={inputClass+" mt-1"} value={prefix} onChange={event=>setPrefix(event.target.value)}>
                {PREFIXES.map(item => <option key={item} value={item}>{item}</option>)}
                <option value="other">อื่น ๆ</option>
              </select>
            </label>
            <label className="block">ชื่อ–นามสกุล (ไม่ต้องพิมพ์คำนำหน้า)
              <input className={inputClass+" mt-1"} value={name} onChange={event=>setName(event.target.value)} required maxLength={190} placeholder="ชื่อ นามสกุล" />
            </label>
          </div>
          {prefix === "other" && <label className="block">ระบุคำนำหน้า / ยศ
            <input className={inputClass+" mt-1"} value={customPrefix} onChange={event=>setCustomPrefix(event.target.value)} maxLength={40} placeholder="เช่น ว่าที่พันตรี" required />
          </label>}
          {error && <p role="alert" className="text-red-700">{error}</p>}
          <button className="rounded-lg bg-red-700 px-4 py-2 font-bold text-white disabled:opacity-50" disabled={busy} type="submit">{busy ? "กำลังบันทึก..." : "บันทึกชื่อผู้อำนวยการ"}</button>
          <p className="text-slate-600">ชื่อที่ใช้พิมพ์ใบสมัครจะถูกบันทึกเป็นหลักฐาน ณ วันที่จัดทำเอกสาร ไม่เปลี่ยนย้อนหลังเมื่อแก้ไขทะเบียนโรงเรียน</p>
        </form>
      )}
    </div>
  );
}
