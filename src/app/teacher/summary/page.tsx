"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import * as XLSX from "xlsx";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type StatItem = {
  totalStudents: number; // จำนวนนักเรียนทั้งหมดจริงในฐานข้อมูล
  checkedTotal: number;  // จำนวนคนที่เช็คชื่อแล้ว
  present: number;       // มา
  absent: number;        // ขาด
  leave: number;         // ลา
};

function DailySummaryContent() {
  const [checkDate, setCheckDate] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>("ทั้งหมด");

  const [overallStats, setOverallStats] = useState<StatItem>({
    totalStudents: 0,
    checkedTotal: 0,
    present: 0,
    absent: 0,
    leave: 0,
  });
  const [gradeStats, setGradeStats] = useState<{ [grade: string]: StatItem }>({});
  const [roomStats, setRoomStats] = useState<{ [room: string]: StatItem }>({});

  const grades = ["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"];

  useEffect(() => {
    setCheckDate(new Date().toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    if (checkDate) {
      fetchSummaryData();
    }
  }, [checkDate]);

  const fetchSummaryData = async () => {
    setLoading(true);

    // 1. ดึงรายชื่อนักเรียนจริงทั้งหมดจากตาราง student_database
    const { data: allStudents, error: studentError } = await supabase
      .from("student_database")
      .select("grade_level, classroom");

    if (studentError) {
      console.error("Error fetching student database:", studentError);
      setLoading(false);
      return;
    }

    // 2. ดึงประวัติการเช็คชื่อตามวันที่เลือกจาก attendance_records
    const { data: recordsData, error: recordError } = await supabase
      .from("attendance_records")
      .select("grade_level, classroom, status")
      .eq("check_date", checkDate);

    if (recordError) {
      console.error("Error fetching attendance records:", recordError);
      setLoading(false);
      return;
    }

    const students = allStudents || [];
    const records = recordsData || [];

    // โครงสร้างเก็บสถิติ
    const overall: StatItem = {
      totalStudents: students.length,
      checkedTotal: 0,
      present: 0,
      absent: 0,
      leave: 0,
    };
    const byGrade: { [grade: string]: StatItem } = {};
    const byRoom: { [room: string]: StatItem } = {};

    grades.forEach((g) => {
      byGrade[g] = { totalStudents: 0, checkedTotal: 0, present: 0, absent: 0, leave: 0 };
    });

    // 3. นับจำนวนนักเรียนจริงทั้งหมด แยกตามระดับชั้นและห้องเรียน
    students.forEach((st) => {
      const g = st.grade_level;
      const r = `${st.grade_level}/${st.classroom}`;

      if (!byGrade[g]) {
        byGrade[g] = { totalStudents: 0, checkedTotal: 0, present: 0, absent: 0, leave: 0 };
      }
      byGrade[g].totalStudents++;

      if (!byRoom[r]) {
        byRoom[r] = { totalStudents: 0, checkedTotal: 0, present: 0, absent: 0, leave: 0 };
      }
      byRoom[r].totalStudents++;
    });

    // 4. นับจำนวน มา/ขาด/ลา จากข้อมูลการเช็คชื่อ
    records.forEach((rec) => {
      const g = rec.grade_level;
      const r = `${rec.grade_level}/${rec.classroom}`;
      const status = rec.status;

      let key: "present" | "absent" | "leave" = "present";
      if (status === "absent" || status === "ขาด") key = "absent";
      else if (status === "leave" || status === "ลา") key = "leave";
      else key = "present";

      overall.checkedTotal++;
      overall[key]++;

      if (byGrade[g]) {
        byGrade[g].checkedTotal++;
        byGrade[g][key]++;
      }

      if (byRoom[r]) {
        byRoom[r].checkedTotal++;
        byRoom[r][key]++;
      }
    });

    setOverallStats(overall);
    setGradeStats(byGrade);
    setRoomStats(byRoom);
    setLoading(false);
  };

  // คำนวณ % การมาเรียนเทียบจากจำนวนนักเรียนทั้งหมดจริง
  const calcPercent = (count: number, total: number) => {
    if (!total) return "0.0%";
    return `${((count / total) * 100).toFixed(1)}%`;
  };

  const exportSummaryExcel = () => {
    const gradeRows = Object.keys(gradeStats).map((g) => ({
      "ระดับชั้น": g,
      "นักเรียนทั้งหมด (คน)": gradeStats[g].totalStudents,
      "มา (คน)": gradeStats[g].present,
      "ขาด (คน)": gradeStats[g].absent,
      "ลา (คน)": gradeStats[g].leave,
      "เช็คชื่อแล้ว (คน)": gradeStats[g].checkedTotal,
      "เปอร์เซ็นต์การมาเรียน": calcPercent(gradeStats[g].present, gradeStats[g].totalStudents),
    }));

    const roomRows = Object.keys(roomStats)
      .sort()
      .map((r) => ({
        "ห้องเรียน": `ห้อง ${r}`,
        "นักเรียนทั้งหมด (คน)": roomStats[r].totalStudents,
        "มา (คน)": roomStats[r].present,
        "ขาด (คน)": roomStats[r].absent,
        "ลา (คน)": roomStats[r].leave,
        "เช็คชื่อแล้ว (คน)": roomStats[r].checkedTotal,
        "เปอร์เซ็นต์การมาเรียน": calcPercent(roomStats[r].present, roomStats[r].totalStudents),
      }));

    const wb = XLSX.utils.book_new();
    const wsGrade = XLSX.utils.json_to_sheet(gradeRows);
    const wsRoom = XLSX.utils.json_to_sheet(roomRows);

    XLSX.utils.book_append_sheet(wb, wsGrade, "สรุปรายระดับชั้น");
    XLSX.utils.book_append_sheet(wb, wsRoom, "สรุปรายห้องเรียน");

    XLSX.writeFile(wb, `รายงานสรุปภาพรวมการมาเรียน_${checkDate}.xlsx`);
  };

  const filteredRooms = Object.keys(roomStats)
    .filter((roomKey) => selectedGradeFilter === "ทั้งหมด" || roomKey.startsWith(selectedGradeFilter))
    .sort();

  return (
    <div className="p-4 md:p-8 font-sans max-w-7xl mx-auto space-y-6">
      {/* ส่วนหัว และ การเลือกวันที่ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/teacher/attendance"
              className="text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition"
            >
              ← กลับหน้าเช็คชื่อ
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">📊 สรุปรายงานการมาเรียนประจำวัน</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">โรงเรียนเชียงคำวิทยาคม</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={checkDate}
            onChange={(e) => setCheckDate(e.target.value)}
            className="border p-2 rounded-md outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium shadow-sm text-sm"
          />
          <button
            onClick={exportSummaryExcel}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm px-4 py-2 rounded-md shadow transition flex items-center gap-1.5"
          >
            📊 ส่งออกสรุป Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl p-12 text-center border text-gray-500">
          กำลังประมวลผลข้อมูลสรุปประจำวันที่ {checkDate}...
        </div>
      ) : (
        <>
          {/* 1. สรุปภาพรวม (Overall Cards) */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-3">📌 1. ภาพรวมทั้งโรงเรียน</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase">นักเรียนทั้งหมด</p>
                <p className="text-2xl font-extrabold text-blue-900 mt-1">
                  {overallStats.totalStudents} <span className="text-sm font-normal text-gray-500">คน</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">เช็คแล้ว {overallStats.checkedTotal} คน</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-emerald-700 uppercase">มาเรียน</p>
                <p className="text-2xl font-extrabold text-emerald-800 mt-1">
                  {overallStats.present} <span className="text-sm font-normal text-emerald-600">คน</span>
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-amber-700 uppercase">ลา</p>
                <p className="text-2xl font-extrabold text-amber-800 mt-1">
                  {overallStats.leave} <span className="text-sm font-normal text-amber-600">คน</span>
                </p>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-rose-700 uppercase">ขาดเรียน</p>
                <p className="text-2xl font-extrabold text-rose-800 mt-1">
                  {overallStats.absent} <span className="text-sm font-normal text-rose-600">คน</span>
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm col-span-2 sm:col-span-1">
                <p className="text-xs font-semibold text-blue-700 uppercase">อัตราการมาเรียน (%)</p>
                <p className="text-2xl font-extrabold text-blue-800 mt-1">
                  {calcPercent(overallStats.present, overallStats.totalStudents)}
                </p>
              </div>
            </div>
          </div>

          {/* 2. สรุปรายระดับชั้น (ม.1 - ม.6) */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-3">🏫 2. สรุปจำแนกตามระดับชั้น</h2>
            <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
              <table className="w-full border-collapse text-left text-sm text-gray-700">
                <thead className="bg-gray-50 border-b font-bold text-gray-700">
                  <tr>
                    <th className="p-3.5">ระดับชั้น</th>
                    <th className="p-3.5 text-center text-blue-900">นักเรียนทั้งหมด (คน)</th>
                    <th className="p-3.5 text-center text-emerald-700">มา (คน)</th>
                    <th className="p-3.5 text-center text-amber-600">ลา (คน)</th>
                    <th className="p-3.5 text-center text-rose-600">ขาด (คน)</th>
                    <th className="p-3.5 text-center">เช็คชื่อแล้ว</th>
                    <th className="p-3.5 text-center">อัตราการมาเรียน (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {grades.map((grade) => {
                    const stat = gradeStats[grade] || { totalStudents: 0, checkedTotal: 0, present: 0, absent: 0, leave: 0 };
                    return (
                      <tr key={grade} className="hover:bg-gray-50 transition">
                        <td className="p-3.5 font-bold text-gray-800">{grade}</td>
                        <td className="p-3.5 text-center font-bold text-blue-900 bg-blue-50/30">{stat.totalStudents}</td>
                        <td className="p-3.5 text-center font-semibold text-emerald-600">{stat.present}</td>
                        <td className="p-3.5 text-center font-semibold text-amber-600">{stat.leave}</td>
                        <td className="p-3.5 text-center font-semibold text-rose-600">{stat.absent}</td>
                        <td className="p-3.5 text-center font-medium text-gray-500">{stat.checkedTotal}</td>
                        <td className="p-3.5 text-center font-bold text-blue-600">
                          {calcPercent(stat.present, stat.totalStudents)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. สรุปรายห้องเรียน */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <h2 className="text-lg font-bold text-gray-800">🚪 3. สรุปจำแนกตามห้องเรียน</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-600">ตัวกรองระดับชั้น:</span>
                <select
                  value={selectedGradeFilter}
                  onChange={(e) => setSelectedGradeFilter(e.target.value)}
                  className="border p-1.5 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                >
                  <option value="ทั้งหมด">แสดงทุกระดับชั้น</option>
                  {grades.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredRooms.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
                <table className="w-full border-collapse text-left text-sm text-gray-700">
                  <thead className="bg-gray-50 border-b font-bold text-gray-700">
                    <tr>
                      <th className="p-3.5">ห้องเรียน</th>
                      <th className="p-3.5 text-center text-blue-900">นักเรียนทั้งหมด (คน)</th>
                      <th className="p-3.5 text-center text-emerald-700">มา (คน)</th>
                      <th className="p-3.5 text-center text-amber-600">ลา (คน)</th>
                      <th className="p-3.5 text-center text-rose-600">ขาด (คน)</th>
                      <th className="p-3.5 text-center">เช็คชื่อแล้ว</th>
                      <th className="p-3.5 text-center">อัตราการมาเรียน (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRooms.map((roomKey) => {
                      const stat = roomStats[roomKey];
                      return (
                        <tr key={roomKey} className="hover:bg-blue-50/50 transition">
                          <td className="p-3.5 font-bold text-gray-800">ห้อง {roomKey}</td>
                          <td className="p-3.5 text-center font-bold text-blue-900 bg-blue-50/30">{stat.totalStudents}</td>
                          <td className="p-3.5 text-center font-semibold text-emerald-600">{stat.present}</td>
                          <td className="p-3.5 text-center font-semibold text-amber-600">{stat.leave}</td>
                          <td className="p-3.5 text-center font-semibold text-rose-600">{stat.absent}</td>
                          <td className="p-3.5 text-center font-medium text-gray-500">{stat.checkedTotal}</td>
                          <td className="p-3.5 text-center font-bold text-blue-600">
                            {calcPercent(stat.present, stat.totalStudents)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-8 text-center border text-gray-400">
                ยังไม่มีข้อมูลนักเรียนในระดับชั้นที่เลือก
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function DailySummaryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">กำลังโหลดหน้ารายงานสรุป...</div>}>
      <DailySummaryContent />
    </Suspense>
  );
}