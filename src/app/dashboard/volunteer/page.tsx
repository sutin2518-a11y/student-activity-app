"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function VolunteerDashboardPage() {
  const [stats, setStats] = useState({
    totalHours: 0,
    totalMinutes: 0,
    totalApprovedRecords: 0,
    totalStudents: 0,
  });
  const [gallery, setGallery] = useState<any[]>([]);
  const [gradeStats, setGradeStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);

    // ดึงรายการที่อนุมัติแล้วทั้งหมด
    const { data: approvedData } = await supabase
      .from("volunteer_records")
      .select("*, profiles(full_name, grade_level, classroom)")
      .eq("status", "APPROVED")
      .order("created_at", { ascending: false });

    if (approvedData) {
      // 1. คำนวณชั่วโมงรวมทั้งโรงเรียน
      const totalMins = approvedData.reduce((sum, r) => sum + (r.hours || 0) * 60 + (r.minutes || 0), 0);
      const uniqueStudents = new Set(approvedData.map((r) => r.student_id)).size;

      setStats({
        totalHours: Math.floor(totalMins / 60),
        totalMinutes: totalMins % 60,
        totalApprovedRecords: approvedData.length,
        totalStudents: uniqueStudents,
      });

      // 2. ดึงรายการที่มีรูปภาพแสดงในแกลเลอรี
      setGallery(approvedData.filter((r) => r.drive_url && r.drive_url.length > 0));

      // 3. สรุปจำแนกตามระดับชั้น (ม.1 - ม.6)
      const grades = ["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"];
      const gSummary = grades.map((g) => {
        const itemInGrade = approvedData.filter((r) => r.profiles?.grade_level === g || r.profiles?.grade_level === g.replace("ม.", ""));
        const mins = itemInGrade.reduce((sum, r) => sum + (r.hours || 0) * 60 + (r.minutes || 0), 0);
        return {
          grade: g,
          totalHours: Math.floor(mins / 60),
          count: itemInGrade.length,
        };
      });

      setGradeStats(gSummary);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">📊 แดชบอร์ดสารสนเทศกิจกรรมเพื่อสังคมและสาธารณประโยชน์</h1>
          <p className="text-xs text-slate-500 mt-1">สรุปสถิติจิตอาสาสะสม และคลังภาพกิจกรรมจิตอาสานักเรียน โรงเรียนเชียงคำวิทยาคม</p>
        </div>

        {/* การ์ดสถิติรวม 4 ช่อง */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-5 rounded-3xl shadow-md">
            <p className="text-xs text-blue-100 font-bold">ชั่วโมงจิตอาสารวมทั้งโรงเรียน</p>
            <p className="text-2xl font-black mt-2">
              {stats.totalHours} <span className="text-xs font-normal">ชม.</span> {stats.totalMinutes} <span className="text-xs font-normal">นาที</span>
            </p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-400 font-bold">จำนวนกิจกรรมที่อนุมัติแล้ว</p>
            <p className="text-2xl font-black text-slate-800 mt-2">{stats.totalApprovedRecords} <span className="text-xs text-slate-400 font-normal">รายการ</span></p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-400 font-bold">นักเรียนที่ผ่านการสะสมชั่วโมง</p>
            <p className="text-2xl font-black text-emerald-600 mt-2">{stats.totalStudents} <span className="text-xs text-slate-400 font-normal">คน</span></p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-400 font-bold">เฉลี่ยต่อกิจกรรม</p>
            <p className="text-2xl font-black text-purple-600 mt-2">
              {stats.totalApprovedRecords > 0 ? (stats.totalHours / stats.totalApprovedRecords).toFixed(1) : 0} <span className="text-xs text-slate-400 font-normal">ชม./กิจกรรม</span>
            </p>
          </div>
        </div>

        {/* สถิติแบ่งตามระดับชั้น ม.1 - ม.6 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 text-base">🏫 สรุปชั่วโมงจิตอาสาจำแนกตามระดับชั้น</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {gradeStats.map((g) => (
              <div key={g.grade} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center space-y-1">
                <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md">{g.grade}</span>
                <p className="text-lg font-black text-slate-800 mt-1">{g.totalHours} <span className="text-[10px] text-slate-400 font-normal">ชม.</span></p>
                <p className="text-[10px] text-slate-400">{g.count} รายการ</p>
              </div>
            ))}
          </div>
        </div>

        {/* 🖼️ แกลเลอรีภาพกิจกรรมจิตอาสา */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 text-base">📸 ภาพกิจกรรมจิตอาสาที่ผ่านการอนุมัติ ({gallery.length})</h2>
          {loading ? (
            <p className="text-xs text-slate-400 text-center py-8">กำลังโหลดคลังภาพกิจกรรม...</p>
          ) : gallery.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">ยังไม่มีภาพกิจกรรมในระบบ</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {gallery.map((item) => (
                <div key={item.id} className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden shadow-sm flex flex-col justify-between">
                  <div className="relative h-44 bg-slate-200">
                    <img src={item.drive_url} alt={item.activity_name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="font-bold text-slate-800 text-xs truncate">{item.activity_name}</p>
                    <p className="text-[11px] text-blue-600 font-bold">
                      {item.profiles?.full_name} (ม.{item.profiles?.grade_level}/{item.profiles?.classroom})
                    </p>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t">
                      <span>📅 {new Date(item.activity_date).toLocaleDateString("th-TH")}</span>
                      <span className="font-bold text-emerald-700">⏱️ {item.hours} ชม. {item.minutes || 0} น.</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}