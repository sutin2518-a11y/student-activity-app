"use client";

import React from "react";
import Link from "next/link";

export default function StudentDashboardPage() {
  const activityMenus = [
    {
      title: "กิจกรรมชุมนุม",
      desc: "เลือกและลงทะเบียนกิจกรรมชุมนุมประจำภาคเรียน",
      icon: "👥",
      color: "bg-red-600 hover:bg-red-700",
      link: "/dashboard", // 👈 ชี้ไปยัง src/app/dashboard/page.tsx
    },
    {
      title: "กิจกรรมเครื่องแบบ",
      desc: "บันทึกและจัดการสังกัด กลุ่ม/กอง/หมู่/หมวด",
      icon: "🎓",
      color: "bg-blue-600 hover:bg-blue-700",
      link: "/student/uniform", // 👈 ชี้ไปยัง src/app/student/uniform/page.tsx
    },
    {
      title: "กิจกรรมเพื่อสังคมและสาธารณประโยชน์",
      desc: "สรุปสถิติจิตอาสาสะสม และคลังภาพกิจกรรมจิตอาสา",
      icon: "🌱",
      color: "bg-emerald-600 hover:bg-emerald-700",
      link: "/dashboard/volunteer", // 👈 ชี้ไปยัง src/app/dashboard/volunteer/page.tsx
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header แดชบอร์ด */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">
                นักเรียน
              </span>
              <span className="text-xs text-slate-400">โรงเรียนเชียงคำวิทยาคม</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-2">
              ศูนย์รวมกิจกรรมพัฒนาผู้เรียน
            </h1>
          </div>
          <Link
            href="/login"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
          >
            ออกจากระบบ
          </Link>
        </div>

        {/* การ์ดเมนูกิจกรรมทั้ง 3 หมวด */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {activityMenus.map((item, index) => (
            <Link
              key={index}
              href={item.link}
              className={`${item.color} text-white rounded-3xl p-6 shadow-md hover:shadow-lg transition flex flex-col justify-between min-h-[180px]`}
            >
              <div>
                <div className="text-4xl mb-3">{item.icon}</div>
                <h2 className="font-bold text-lg leading-snug mb-1">
                  {item.title}
                </h2>
                <p className="text-xs text-white/80 leading-relaxed">
                  {item.desc}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-end text-xs font-bold pt-2 border-t border-white/20">
                เข้าสู่หน้ากิจกรรม ➔
              </div>
            </Link>
          ))}
        </div>

        {/* ปุ่มกลับหน้าหลักโรงเรียน */}
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