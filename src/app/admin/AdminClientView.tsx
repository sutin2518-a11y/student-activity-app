"use client";

import React from "react";
import { useUserRole } from "@/hooks/useUserRole";
import AdminOverview from "@/components/admin/AdminOverview";

export default function AdminClientView() {
  const { profile, loading, isStudent } = useUserRole();

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 font-sans">
        กำลังตรวจสอบสิทธิ์การใช้งาน...
      </div>
    );
  }

  // ถ้านักเรียนแอบเข้าหน้าแอดมิน จะถูกปฏิเสธการเข้าถึง
  if (!profile || isStudent) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4 font-sans">
        <div className="bg-rose-50 border border-rose-100 p-8 rounded-3xl text-center max-w-md">
          <div className="text-4xl mb-3">🚫</div>
          <h2 className="text-base font-bold text-rose-800">ปฏิเสธการเข้าถึง</h2>
          <p className="text-xs text-rose-600 mt-1">
            หน้านี้สำหรับคุณครูและผู้ดูแลระบบเท่านั้น
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">ระบบบริหารจัดการกิจกรรม</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ยินดีต้อนรับคุณ {profile.full_name} ({profile.role === "admin" ? "แอดมินระบบ" : "คุณครู"})
          </p>
        </div>
      </div>

      {/* เรียกใช้งาน Dashboard ภาพรวม */}
      <AdminOverview />
    </div>
  );
}