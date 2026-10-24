"use client";

import React from "react";
import Link from "next/link";

export default function StudentDashboardPage() {
  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-200">
        <div className="w-16 h-16 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
          🎓
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-1">หน้าหลักนักเรียน</h1>
        <p className="text-slate-500 text-xs mb-6">งานกิจกรรมพัฒนาผู้เรียน โรงเรียนเชียงคำวิทยาคม</p>

        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-semibold mb-6">
          ✅ เข้าสู่ระบบสำเร็จแล้ว
        </div>

        {/* เมนูเชื่อมต่อไปยังส่วนต่างๆ ของนักเรียน */}
        <div className="space-y-3">
          <Link 
            href="/student/uniform" 
            className="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition shadow-md"
          >
            👮 กิจกรรมเครื่องแบบ
          </Link>
          
          <Link 
            href="/" 
            className="block w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition"
          >
            ← กลับหน้าหลักโรงเรียน
          </Link>
        </div>
      </div>
    </div>
  );
}