"use client";

import React from "react";
import Link from "next/link";

export default function StudentDashboardPage() {
  return (
    <div className="min-h-screen bg-slate-100 font-sans p-4 md:p-8 flex flex-col justify-between">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* ส่วนหัว Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-bold">
                นักเรียน
              </span>
              <span className="text-xs text-slate-400 font-medium">
                โรงเรียนเชียงคำวิทยาคม
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-800 mt-2">
              ศูนย์รวมกิจกรรมพัฒนาผู้เรียน
            </h1>
          </div>
          <Link
            href="/login"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition text-center self-start sm:self-auto"
          >
            ออกจากระบบ
          </Link>
        </div>

        {/* การ์ดเมนูกิจกรรม 3 หมวด (กดคลิกได้ทั้งกล่อง) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* การ์ดที่ 1: ชุมนุม */}
          <Link
            href="/teacher/club"
            className="bg-red-600 hover:bg-red-700 rounded-3xl p-6 text-white shadow-md flex flex-col justify-between h-64 relative overflow-hidden group hover:shadow-xl transition transform hover:-translate-y-1 cursor-pointer"
          >
            <div>
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl mb-4">
                👥
              </div>
              <h2 className="text-xl font-bold mb-1">กิจกรรมชุมนุม</h2>
              <p className="text-xs text-red-100 font-normal">
                เลือกและลงทะเบียนกิจกรรมชุมนุมประจำภาคเรียน
              </p>
            </div>
            <div className="inline-flex items-center justify-end gap-1 text-xs font-bold text-white group-hover:underline mt-auto">
              เข้าสู่หน้ากิจกรรม ➔
            </div>
          </Link>

          {/* การ์ดที่ 2: กิจกรรมเครื่องแบบ */}
          <Link
            href="/student/uniform"
            className="bg-blue-600 hover:bg-blue-700 rounded-3xl p-6 text-white shadow-md flex flex-col justify-between h-64 relative overflow-hidden group hover:shadow-xl transition transform hover:-translate-y-1 cursor-pointer"
          >
            <div>
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl mb-4">
                🎓
              </div>
              <h2 className="text-xl font-bold mb-1">กิจกรรมเครื่องแบบ</h2>
              <p className="text-xs text-blue-100 font-normal">
                บันทึกและจัดการสังกัด กลุ่ม/กอง/หมู่/หมวด
              </p>
            </div>
            <div className="inline-flex items-center justify-end gap-1 text-xs font-bold text-white group-hover:underline mt-auto">
              เข้าสู่หน้ากิจกรรม ➔
            </div>
          </Link>

          {/* การ์ดที่ 3: กิจกรรมเพื่อสังคมฯ */}
          <Link
            href="/student/volunteer"
            className="bg-emerald-600 hover:bg-emerald-700 rounded-3xl p-6 text-white shadow-md flex flex-col justify-between h-64 relative overflow-hidden group hover:shadow-xl transition transform hover:-translate-y-1 cursor-pointer"
          >
            <div>
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl mb-4">
                🌱
              </div>
              <h2 className="text-xl font-bold mb-1">
                กิจกรรมเพื่อสังคมและสาธารณประโยชน์
              </h2>
              <p className="text-xs text-emerald-100 font-normal">
                สรุปสถิติจิตอาสาสะสม และคลังภาพกิจกรรมจิตอาสา
              </p>
            </div>
            <div className="inline-flex items-center justify-end gap-1 text-xs font-bold text-white group-hover:underline mt-auto">
              เข้าสู่หน้ากิจกรรม ➔
            </div>
          </Link>
        </div>

        {/* ปุ่มย้อนกลับ */}
        <div className="text-center pt-4">
          <Link
            href="/"
            className="text-xs font-bold text-slate-500 hover:text-slate-800 transition"
          >
            ← กลับไปหน้าหลักโรงเรียน
          </Link>
        </div>
      </div>
    </div>
  );
}