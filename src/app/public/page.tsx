"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { getStudentAttendanceSummary } from "@/lib/attendance";

export default function PublicSearchPage() {
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [clubResult, setClubResult] = useState<any>(null);
  const [uniformResult, setUniformResult] = useState<any>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) return;

    setLoading(true);
    setSearched(true);

    // 1. ค้นหาข้อมูลนักเรียน
    const { data: profile } = await supabase
      .from("profiles")
      .select("student_id_card, full_name, grade_level, classroom, no")
      .eq("student_id_card", studentId.trim())
      .maybeSingle();

    if (profile) {
      setStudentInfo(profile);
      // 2. คำนวณผลประเมินกิจกรรม
      const clubData = await getStudentAttendanceSummary(profile.student_id_card, "CLUB");
      const uniformData = await getStudentAttendanceSummary(profile.student_id_card, "UNIFORM");
      setClubResult(clubData);
      setUniformResult(uniformData);
    } else {
      setStudentInfo(null);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 flex flex-col items-center">
      <div className="max-w-xl w-full space-y-6">
        
        {/* หัวข้อหน้าบริการสาธารณะ */}
        <div className="text-center space-y-2">
          <span className="text-4xl">🏫</span>
          <h1 className="text-2xl font-bold text-slate-900">ระบบตรวจสอบกิจกรรมนักเรียน</h1>
          <p className="text-xs text-slate-500">สำหรับผู้ปกครองและนักเรียน ตรวจสอบสิทธิ์และผลการเข้าร่วมกิจกรรม</p>
        </div>

        {/* ช่องค้นหา */}
        <form onSubmit={handleSearch} className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex gap-2">
          <input
            type="text"
            placeholder="กรอกรหัสประจำตัวนักเรียน..."
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl transition-all shadow-sm"
          >
            {loading ? "กำลังค้นหา..." : "🔍 ค้นหา"}
          </button>
        </form>

        {/* แสดงผลการค้นหา */}
        {searched && (
          studentInfo ? (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded-full">
                  ม.{studentInfo.grade_level}/{studentInfo.classroom} เลขที่ {studentInfo.no}
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-2">{studentInfo.full_name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">รหัสประจำตัว: {studentInfo.student_id_card}</p>
              </div>

              {/* ผลการเรียนกิจกรรม */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-slate-50 rounded-2xl text-center space-y-1">
                  <span className="text-xs font-bold text-slate-500">กิจกรรมชุมนุม</span>
                  <div className={`text-2xl font-bold ${clubResult?.status === "ผ" ? "text-emerald-600" : "text-rose-600"}`}>
                    {clubResult?.status || "มผ"}
                  </div>
                  <span className="text-[11px] text-slate-400 block">เข้าเรียน {clubResult?.totalAttended || 0} ครั้ง</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl text-center space-y-1">
                  <span className="text-xs font-bold text-slate-500">กิจกรรมเครื่องแบบ</span>
                  <div className={`text-2xl font-bold ${uniformResult?.status === "ผ" ? "text-emerald-600" : "text-rose-600"}`}>
                    {uniformResult?.status || "มผ"}
                  </div>
                  <span className="text-[11px] text-slate-400 block">เข้าเรียน {uniformResult?.totalAttended || 0} ครั้ง</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center text-xs text-slate-400">
              ❌ ไม่พบข้อมูลนักเรียนรหัสนี้ในระบบ
            </div>
          )
        )}

      </div>
    </div>
  );
}