"use client";

import React from "react";
import Link from "next/link";

export default function TeacherPortalHub() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 text-slate-800">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">👨‍🏫 ศูนย์รวมระบบบริการสำหรับคุณครู</h1>
          <p className="text-xs text-slate-500 mt-1">
            เลือกระบบงานที่ต้องการดำเนินการ (กิจกรรมชุมนุม, กิจกรรมในเครื่องแบบ หรืออนุมัติชั่วโมงจิตอาสา)
          </p>
        </div>

        {/* เมนูการ์ด 3 หมวดหมู่หลัก */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: ชุมนุม */}
          <Link
            href="/teacher/club"
            className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-500 transition-all space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-all">
                📌
              </div>
              <h2 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                กิจกรรมชุมนุม (Club)
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                เสนอเปิดชุมนุมใหม่ แก้ไขข้อมูลชุมนุม เช็คชื่อเข้าเรียน และประเมินผลการเรียนกิจกรรมชุมนุม
              </p>
            </div>
            <div className="pt-2 text-xs font-bold text-blue-600 flex items-center gap-1">
              <span>เข้าสู่ระบบชุมนุม</span>
              <span>→</span>
            </div>
          </Link>

          {/* Card 2: เครื่องแบบ */}
          <Link
            href="/teacher/uniform"
            className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-500 transition-all space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-all">
                ⚜️
              </div>
              <h2 className="font-bold text-slate-900 text-base group-hover:text-purple-600 transition-colors">
                กิจกรรมเครื่องแบบ (Uniform)
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                เช็คชื่อและประเมินผล กิจกรรมลูกเสือ เนตรนารี ยุวกาชาด และผู้ทำประโยชน์ ตามกลุ่ม/กองที่รับผิดชอบ
              </p>
            </div>
            <div className="pt-2 text-xs font-bold text-purple-600 flex items-center gap-1">
              <span>เข้าสู่ระบบเครื่องแบบ</span>
              <span>→</span>
            </div>
          </Link>

          {/* Card 3: จิตอาสา */}
          <Link
            href="/teacher/volunteer"
            className="group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-500 transition-all space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-all">
                🤝
              </div>
              <h2 className="font-bold text-slate-900 text-base group-hover:text-emerald-600 transition-colors">
                จิตอาสา (Volunteer)
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                สำหรับครูที่ปรึกษาประจำชั้น ตรวจสอบและกดอนุมัติบันทึกชั่วโมงกิจกรรมจิตอาสาของนักเรียน
              </p>
            </div>
            <div className="pt-2 text-xs font-bold text-emerald-600 flex items-center gap-1">
              <span>เข้าสู่ระบบจิตอาสา</span>
              <span>→</span>
            </div>
          </Link>

        </div>

      </div>
    </div>
  );
}