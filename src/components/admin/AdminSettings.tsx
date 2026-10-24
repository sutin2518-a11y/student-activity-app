"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";

export default function AdminSettings() {
  const [regStart, setRegStart] = useState("");
  const [regEnd, setRegEnd] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data: settings } = await supabase.from("system_settings").select("*").eq("id", 1).maybeSingle();
      if (settings) {
        if (settings.registration_start) setRegStart(formatForInput(settings.registration_start));
        if (settings.registration_end) setRegEnd(formatForInput(settings.registration_end));
      }
    };
    fetchSettings();
  }, []);

  const formatForInput = (isoStr: string) => {
    const d = new Date(isoStr);
    const z = (n: number) => (n < 10 ? "0" + n : n);
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);

    const { error } = await supabase.from("system_settings").upsert({
      id: 1,
      registration_start: new Date(regStart).toISOString(),
      registration_end: new Date(regEnd).toISOString(),
    });

    if (error) {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: error.message });
    } else {
      Swal.fire({
        icon: "success",
        title: "บันทึกเวลาเรียบร้อย! ⏰",
        text: "อัปเดตช่วงเวลาลงทะเบียนของระบบเรียบร้อยแล้ว",
        confirmButtonColor: "#2563eb",
        customClass: { popup: "rounded-3xl font-sans" },
      });
    }
    setSavingSettings(false);
  };

  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
      <h2 className="font-bold text-slate-900 text-sm">⏰ เวลาลงทะเบียน</h2>
      <form onSubmit={handleSaveSettings} className="space-y-2">
        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">เริ่มต้น</label>
          <input
            type="datetime-local"
            required
            value={regStart}
            onChange={(e) => setRegStart(e.target.value)}
            className="w-full px-2.5 py-1.5 border rounded-xl text-[11px]"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">สิ้นสุด</label>
          <input
            type="datetime-local"
            required
            value={regEnd}
            onChange={(e) => setRegEnd(e.target.value)}
            className="w-full px-2.5 py-1.5 border rounded-xl text-[11px]"
          />
        </div>
        <button
          type="submit"
          disabled={savingSettings}
          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all"
        >
          บันทึกเวลา
        </button>
      </form>
    </div>
  );
}