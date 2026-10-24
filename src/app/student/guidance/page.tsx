"use client";

import React from "react";
import Link from "next/link";

export default function StudentGuidancePage() {
  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex justify-between items-center">
          <div>
            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
              งานแนะแนว
            </span>
            <h1 className="text-2xl font-black text-slate-800 mt-2">ข้อมูลการศึกษาต่อและอาชีพ</h1>
            <p className="text-xs text-slate-500">โรงเรียนเชียงคำวิทยาคม</p>
          </div>
          <Link href="/student" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition">
            ← กลับแดชบอร์ด
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
            🧭
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">หน้างานแนะแนวอยู่ระหว่างการเตรียมระบบ</h2>
          <p className="text-slate-500 text-xs max-w-md mx-auto">
            คุณเข้าสู่ระบบงานแนะแนวเรียบร้อยแล้ว ในส่วนนี้จะใช้สำหรับทำแบบประเมินตนเอง ค้นหาทุนการศึกษา และข้อมูล TCAS / การศึกษาต่อ
          </p>
        </div>
      </div>
    </div>
  );
}