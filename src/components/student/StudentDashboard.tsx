"use client";

import React, { useEffect, useState } from "react";
import { getStudentAttendanceSummary } from "@/lib/attendance";

interface StudentDashboardProps {
  studentIdCard: string;
  studentName: string;
}

export default function StudentDashboard({ studentIdCard }: StudentDashboardProps) {
  const [clubSummary, setClubSummary] = useState<any>(null);
  const [uniformSummary, setUniformSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studentIdCard) {
      loadSummaries();
    }
  }, [studentIdCard]);

  const loadSummaries = async () => {
    setLoading(true);
    const clubData = await getStudentAttendanceSummary(studentIdCard, "CLUB");
    const uniformData = await getStudentAttendanceSummary(studentIdCard, "UNIFORM");

    setClubSummary(clubData);
    setUniformSummary(uniformData);
    setLoading(false);
  };

  if (loading) {
    return <div className="p-4 text-center text-xs text-slate-400 font-sans">กำลังโหลดสรุปกิจกรรม...</div>;
  }

  return (
    <div className="space-y-4 font-sans">
      <h2 className="text-base font-bold text-slate-900">📌 ภาพรวมกิจกรรมของฉัน</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* การ์ดชุมนุม */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold text-xs rounded-full">
              🧩 กิจกรรมชุมนุม
            </span>
            <span className={`px-3 py-1 font-bold text-xs rounded-full ${
              clubSummary?.status === "ผ" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
            }`}>
              ผลประเมิน: {clubSummary?.status || "มผ"}
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600 pt-1">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>มาเรียนจริง</span>
              <span className="font-bold text-slate-800">{clubSummary?.actualPresentCount || 0} ครั้ง</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>สิทธิ์วันหยุดพิเศษ/โรงเรียนงดเรียน</span>
              <span className="font-bold text-blue-600">+{clubSummary?.freePresentCount || 0} ครั้ง</span>
            </div>
            <div className="flex justify-between py-1.5 font-bold text-xs text-slate-900">
              <span>รวมวันเช็คชื่อสะสม</span>
              <span className="text-blue-600">{clubSummary?.totalAttended || 0} / 18 ครั้ง</span>
            </div>
          </div>
        </div>

        {/* การ์ดเครื่องแบบ */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="px-3 py-1 bg-purple-50 text-purple-700 font-bold text-xs rounded-full">
              👔 กิจกรรมเครื่องแบบ
            </span>
            <span className={`px-3 py-1 font-bold text-xs rounded-full ${
              uniformSummary?.status === "ผ" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
            }`}>
              ผลประเมิน: {uniformSummary?.status || "มผ"}
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600 pt-1">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>มาเรียนจริง</span>
              <span className="font-bold text-slate-800">{uniformSummary?.actualPresentCount || 0} ครั้ง</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>สิทธิ์วันหยุดพิเศษ/โรงเรียนงดเรียน</span>
              <span className="font-bold text-purple-600">+{uniformSummary?.freePresentCount || 0} ครั้ง</span>
            </div>
            <div className="flex justify-between py-1.5 font-bold text-xs text-slate-900">
              <span>รวมวันเช็คชื่อสะสม</span>
              <span className="text-purple-600">{uniformSummary?.totalAttended || 0} / 18 ครั้ง</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}