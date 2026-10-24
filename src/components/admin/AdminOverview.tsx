"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface StudentProfile {
  id: string | number;
  student_id_card: string;
  full_name?: string;
  prefix?: string;
  first_name?: string;
  last_name?: string;
  grade_level: string | number;
  classroom: string | number;
  no: string | number;
}

interface OverviewStats {
  totalStudents: number;
  totalJuniorHigh: number;
  uniformEnrolledCount: number;
  uniformMissingCount: number;
  clubEnrolledCount: number;
  clubMissingCount: number;
  totalVolunteerHours: number;
}

// 💡 ฟังก์ชันดึงข้อมูลแบบทะลุ 1,000 แถว พร้อมรองรับการกรอง academic_year (ถ้ามี)
async function fetchAllRows(tableName: string, selectFields = "*", academicYear?: string) {
  let results: any[] = [];
  let from = 0;
  const step = 1000;
  let hasMore = true;

  while (hasMore) {
    let query = supabase.from(tableName).select(selectFields);

    if (academicYear) {
      query = query.eq("academic_year", academicYear);
    }

    const { data, error } = await query.range(from, from + step - 1);

    if (error) {
      console.error(`Error fetching ${tableName}:`, error.message);
      break;
    }

    if (data && data.length > 0) {
      results = [...results, ...data];
      from += step;
      if (data.length < step) hasMore = false;
    } else {
      hasMore = false;
    }
  }

  return results;
}

export default function AdminOverview() {
  const DEFAULT_YEAR = "2569"; // ปีการศึกษาหลักตั้งต้น
  const [selectedYear, setSelectedYear] = useState<string>(DEFAULT_YEAR);
  const [availableYears, setAvailableYears] = useState<string[]>([DEFAULT_YEAR, "2568", "2567"]);

  const [stats, setStats] = useState<OverviewStats>({
    totalStudents: 0,
    totalJuniorHigh: 0,
    uniformEnrolledCount: 0,
    uniformMissingCount: 0,
    clubEnrolledCount: 0,
    clubMissingCount: 0,
    totalVolunteerHours: 0,
  });

  const [missingUniformList, setMissingUniformList] = useState<StudentProfile[]>([]);
  const [missingClubList, setMissingClubList] = useState<StudentProfile[]>([]);
  const [activeModal, setActiveModal] = useState<"UNIFORM" | "CLUB" | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. ดึงปีการศึกษาหลักจากตาราง system_settings (คอลัมน์ academic_year) ตอนโหลดครั้งแรก
  useEffect(() => {
    initAcademicYear();
  }, []);

  // 2. ดึงข้อมูลสถิติใหม่ทุกครั้งที่มีการเปลี่ยนปีการศึกษา (selectedYear)
  useEffect(() => {
    if (selectedYear) {
      fetchDashboardData();
    }
  }, [selectedYear]);

  const initAcademicYear = async () => {
    // อ่านค่าจากคอลัมน์ academic_year ใน system_settings
    const { data: settingData } = await supabase
      .from("system_settings")
      .select("academic_year")
      .limit(1)
      .maybeSingle();

    const activeYear = settingData?.academic_year
      ? String(settingData.academic_year).trim()
      : DEFAULT_YEAR;
    const activeNum = Number(activeYear) || 2569;

    // สร้างรายการปีการศึกษาสำหรับ Dropdown (ปีล่วงหน้า 1 ปี, ปีปัจจุบัน, ย้อนหลัง 2 ปี)
    const yearsList = Array.from(
      new Set([
        String(activeNum + 1),
        String(activeNum),
        String(activeNum - 1),
        String(activeNum - 2),
        "2570",
        "2569",
        "2568",
        "2567",
      ])
    ).sort((a, b) => Number(b) - Number(a));

    setAvailableYears(yearsList);
    setSelectedYear(activeYear);
  };

  const fetchDashboardData = async () => {
    setLoading(true);

    // 1. ดึงข้อมูลนักเรียนทั้งหมดจาก student_database (ยอดหลัก)
    const rawStudents = await fetchAllRows("student_database");

    const allStudents: StudentProfile[] = rawStudents.map((s) => ({
      ...s,
      full_name:
        s.full_name ||
        `${s.prefix || ""}${s.first_name || ""} ${s.last_name || ""}`.trim() ||
        "ไม่ระบุชื่อ",
    }));

    // 2. กรองเฉพาะนักเรียน ม.ต้น (ม.1, ม.2, ม.3)
    const juniorHighStudents = allStudents.filter((s) => {
      const g = String(s.grade_level || "").replace(/\D/g, "");
      return g === "1" || g === "2" || g === "3";
    });

    // 3. ดึงข้อมูลกิจกรรมเครื่องแบบ (ไม่กรอง academic_year เพราะ ม.1-ม.3 ใช้กิจกรรมเดิมยาว 3 ปี)
    // ทำให้ ม.2 และ ม.3 มีข้อมูลสืบทอดจากปีก่อนหน้าทันที ไม่ถูกรีเซ็ต
    const rawUniform = await fetchAllRows("uniform_activities", "*");
    const enrolledUniformSet = new Set<string>();
    rawUniform.forEach((u) => {
      const idCard = String(u.student_id_card || u.student_id || u.student_key || "").trim();
      if (idCard) enrolledUniformSet.add(idCard);
    });

    const enrolledUniformList = juniorHighStudents.filter(
      (s) =>
        enrolledUniformSet.has(String(s.student_id_card || "").trim()) ||
        enrolledUniformSet.has(String(s.id || "").trim())
    );

    const unEnrolledUniform = juniorHighStudents.filter(
      (s) =>
        !enrolledUniformSet.has(String(s.student_id_card || "").trim()) &&
        !enrolledUniformSet.has(String(s.id || "").trim())
    );

    // 4. ดึงข้อมูลกิจกรรมชุมนุมตามปีการศึกษาที่เลือก (selectedYear) - มีการลงใหม่ทุกปี
    const rawClub = await fetchAllRows("club_activities", "*", selectedYear);
    const enrolledClubSet = new Set<string>();
    rawClub.forEach((c) => {
      const idCard = String(c.student_id_card || c.student_id || c.student_key || "").trim();
      if (idCard) enrolledClubSet.add(idCard);
    });

    const enrolledClubList = allStudents.filter(
      (s) =>
        enrolledClubSet.has(String(s.student_id_card || "").trim()) ||
        enrolledClubSet.has(String(s.id || "").trim())
    );

    const unEnrolledClub = allStudents.filter(
      (s) =>
        !enrolledClubSet.has(String(s.student_id_card || "").trim()) &&
        !enrolledClubSet.has(String(s.id || "").trim())
    );

    // 5. ชั่วโมงจิตอาสารวมที่อนุมัติแล้ว
    const { data: volunteerData } = await supabase
      .from("volunteer_records")
      .select("hours")
      .eq("status", "APPROVED");

    const totalHours = (volunteerData || []).reduce((acc, curr) => acc + (curr.hours || 0), 0);

    // สรุปยอดตัวเลขทั้งหมด
    setStats({
      totalStudents: allStudents.length,
      totalJuniorHigh: juniorHighStudents.length,
      uniformEnrolledCount: enrolledUniformList.length,
      uniformMissingCount: unEnrolledUniform.length,
      clubEnrolledCount: enrolledClubList.length,
      clubMissingCount: unEnrolledClub.length,
      totalVolunteerHours: totalHours,
    });

    setMissingUniformList(unEnrolledUniform);
    setMissingClubList(unEnrolledClub);
    setLoading(false);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header สรุปภาพรวม + Dropdown เลือกปีการศึกษา */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900">📊 ภาพรวมการลงทะเบียนกิจกรรม</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            สรุปข้อมูลสถิติประจำปีการศึกษา {selectedYear}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-600">ปีการศึกษา:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                ปีการศึกษา {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400 font-sans">
          กำลังประมวลผลข้อมูลสถิตินักเรียน ปีการศึกษา {selectedYear}...
        </div>
      ) : (
        /* 📊 แถบการ์ดสรุปสถิติสำคัญ */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* นักเรียนทั้งหมด */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl">
              👨‍🎓
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold">นักเรียนทั้งหมด</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                {stats.totalStudents.toLocaleString()} <span className="text-xs font-normal text-slate-500">คน</span>
              </h3>
            </div>
          </div>

          {/* กิจกรรมชุมนุม */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl">
                🧩
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold">ลงชุมนุมแล้ว ({selectedYear})</p>
                <h3 className="text-xl font-bold text-slate-900">
                  {stats.clubEnrolledCount.toLocaleString()} <span className="text-xs text-slate-400 font-normal">/ {stats.totalStudents.toLocaleString()}</span>
                </h3>
              </div>
            </div>
            <button
              onClick={() => setActiveModal("CLUB")}
              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold rounded-xl transition-all text-right"
            >
              ยังไม่มี {stats.clubMissingCount.toLocaleString()} คน <br />
              <span className="underline">🔍 ติดตาม</span>
            </button>
          </div>

          {/* กิจกรรมเครื่องแบบ (สะสม ม.1-ม.3) */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl">
                👔
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold">เครื่องแบบ ม.ต้น (สะสม)</p>
                <h3 className="text-xl font-bold text-slate-900">
                  {stats.uniformEnrolledCount.toLocaleString()} <span className="text-xs text-slate-400 font-normal">/ {stats.totalJuniorHigh.toLocaleString()}</span>
                </h3>
              </div>
            </div>
            <button
              onClick={() => setActiveModal("UNIFORM")}
              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-bold rounded-xl transition-all text-right"
            >
              ยังไม่มี {stats.uniformMissingCount.toLocaleString()} คน <br />
              <span className="underline">🔍 ติดตาม</span>
            </button>
          </div>

          {/* ชั่วโมงจิตอาสารวม */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl">
              🤝
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold">ชั่วโมงจิตอาสารวม</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-0.5">
                {stats.totalVolunteerHours.toLocaleString()} <span className="text-xs font-normal text-slate-500">ชม.</span>
              </h3>
            </div>
          </div>

        </div>
      )}

      {/* 🪟 MODAL ป๊อปอัปแสดงรายชื่อนักเรียนสำหรับติดตาม */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-xl overflow-hidden border border-slate-100">
            
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {activeModal === "UNIFORM"
                    ? "👔 รายชื่อนักเรียน ม.ต้น ที่ยังไม่ได้ลงกิจกรรมเครื่องแบบ"
                    : `🧩 รายชื่อนักเรียนที่ยังไม่ได้ลงทะเบียนชุมนุม (ปี ${selectedYear})`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  พบทั้งหมด{" "}
                  {(activeModal === "UNIFORM" ? missingUniformList : missingClubList).length.toLocaleString()} คน
                </p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 text-sm font-bold transition-all"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-2">
              {(activeModal === "UNIFORM" ? missingUniformList : missingClubList).length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs font-medium">
                  🎉 นักเรียนทุกคนลงทะเบียนครบเรียบร้อยแล้ว
                </div>
              ) : (
                (activeModal === "UNIFORM" ? missingUniformList : missingClubList).map((student, idx) => (
                  <div
                    key={student.id || idx}
                    className="flex justify-between items-center p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 text-xs transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 text-center font-bold text-slate-400">{idx + 1}.</span>
                      <div>
                        <div className="font-bold text-slate-800">{student.full_name}</div>
                        <div className="text-[11px] text-slate-400">
                          รหัสประจำตัว: {student.student_id_card || "-"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-xl">
                      {student.grade_level}/{student.classroom} เลขที่ {student.no}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all"
              >
                ปิดหน้าต่าง
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}