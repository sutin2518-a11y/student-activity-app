"use client";

import React from "react";
import Link from "next/link";

export default function StudentVolunteerPage() {
  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex justify-between items-center">
          <div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
              กิจกรรมเพื่อสังคมฯ
            </span>
            <h1 className="text-2xl font-black text-slate-800 mt-2">บันทึกชั่วโมงจิตอาสา</h1>
            <p className="text-xs text-slate-500">โรงเรียนเชียงคำวิทยาคม</p>
          </div>
          <Link href="/student" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition">
            ← กลับแดชบอร์ด
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
            🌱
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">หน้าระบบจิตอาสาอยู่ระหว่างการเตรียมระบบ</h2>
          <p className="text-slate-500 text-xs max-w-md mx-auto">
            คุณเข้าสู่ระบบจิตอาสาเรียบร้อยแล้ว ในส่วนนี้จะใช้สำหรับยื่นบันทึกกิจกรรมจิตอาสา ตรวจสอบจำนวนชั่วโมงสะสม และส่งเล่มรายงาน
          </p>
        </div>
      </div>
    </div>
  );
}