"use client";

import React from "react";
import Link from "next/link";

export default function StudentDashboardPage() {
  const activityMenus = [
    {
      title: "กิจกรรมชุมนุม",
      desc: "เลือกและสมัครเข้าชุมนุมประจำภาคเรียน",
      icon: "👥",
      color: "bg-red-500 hover:bg-red-600",
      link: "/student/club", // หรือ /activities/club ตามที่มีอยู่
    },
    {
      title: "กิจกรรมเครื่องแบบ",
      desc: "เช็กการเข้าแถว บันทึกคะแนนระเบียบวินัย",
      icon: "🎓",
      color: "bg-blue-500 hover:bg-blue-600",
      link: "/student/uniform", // ลิงก์ไปยังไฟล์ที่มีอยู่แล้ว
    },
    {
      title: "กิจกรรมเพื่อสังคมและสาธารณประโยชน์",
      desc: "บันทึกชั่วโมงจิตอาสาและส่งเล่มรายงาน",
      icon: "🌱",
      color: "bg-emerald-500 hover:bg-emerald-600",
      link: "/student/volunteer",
    },
    {
      title: "งานแนะแนว",
      desc: "แบบประเมินตนเองและข้อมูลการศึกษาต่อ",
      icon: "🧭",
      color: "bg-amber-500 hover:bg-amber-600",
      link: "/student/guidance",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header แดชบอร์ด */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">
              นักเรียน
            </span>
            <h1 className="text-2xl font-black text-slate-800 mt-2">
              ระบบกิจกรรมนักเรียน
            </h1>
            <p className="text-xs text-slate-500">
              โรงเรียนเชียงคำวิทยาคม
            </p>
          </div>
          <Link
            href="/login"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
          >
            ออกจากระบบ
          </Link>
        </div>

        {/* การ์ดเมนูกิจกรรมทั้ง 4 หมวด */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {activityMenus.map((item, index) => (
            <Link
              key={index}
              href={item.link}
              className={`${item.color} text-white rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between min-h-[160px]`}
            >
              <div>
                <div className="text-3xl mb-2">{item.icon}</div>
                <h2 className="font-bold text-base leading-tight mb-1">
                  {item.title}
                </h2>
                <p className="text-xs text-white/80 leading-relaxed">
                  {item.desc}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-end text-xs font-bold">
                เข้าใช้งาน ➔
              </div>
            </Link>
          ))}
        </div>

        {/* ปุ่มกลับหน้าหลัก */}
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