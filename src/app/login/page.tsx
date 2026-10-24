"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: นำโค้ดสำหรับตรวจสอบการล็อกอินมาใส่ที่นี่
    console.log("เข้าสู่ระบบด้วย:", studentId, password);
    alert(`กำลังเข้าสู่ระบบด้วยรหัส: ${studentId}`);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-slate-100 p-4 font-sans overflow-hidden">
      
      {/* 🖼️ ภาพพื้นหลังและเลเยอร์สี */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="/images/banner.jpg" // ใช้รูปแบนเนอร์โรงเรียนเป็นพื้นหลัง
          alt="School Background" 
          fill 
          priority
          className="object-cover opacity-60"
        />
        {/* ไล่สีแดง-ดำทับพื้นหลังให้ดูพรีเมียมและขับให้กล่องล็อกอินเด่นขึ้น */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 to-red-900/80 backdrop-blur-sm"></div>
      </div>

      {/* 📦 กล่องฟอร์มเข้าสู่ระบบ */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all hover:scale-[1.01]">
        
        {/* ส่วนหัวกล่อง (Header) */}
        <div className="bg-red-800 px-6 py-8 text-center relative overflow-hidden">
          {/* ลวดลายตกแต่งด้านหลัง */}
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-5 rounded-full blur-xl"></div>
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-black opacity-10 rounded-full blur-lg"></div>
          
          <div className="relative z-10 w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg border-4 border-red-900/30">
            <span className="text-3xl drop-shadow-sm">🏛️</span>
          </div>
          <h2 className="text-2xl font-black text-white mb-1 drop-shadow-md tracking-wide">เข้าสู่ระบบ</h2>
          <p className="text-red-200 text-xs font-medium">ระบบงานกิจกรรมพัฒนาผู้เรียน<br/>โรงเรียนเชียงคำวิทยาคม</p>
        </div>

        {/* ส่วนกรอกข้อมูล (Form) */}
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            
            {/* ช่องกรอกรหัสนักเรียน */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1" htmlFor="studentId">
                รหัสนักเรียน / ชื่อผู้ใช้งาน
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-red-600 transition-colors">
                  👤
                </span>
                <input 
                  type="text" 
                  id="studentId"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white transition-all text-sm font-medium text-slate-800"
                  placeholder="กรอกรหัสนักเรียน 5 หลัก"
                  required
                />
              </div>
            </div>

            {/* ช่องกรอกรหัสผ่าน */}
            <div>
              <div className="flex justify-between items-center mb-1.5 ml-1 mr-1">
                <label className="block text-sm font-bold text-slate-700" htmlFor="password">
                  รหัสผ่าน
                </label>
                <Link href="#" className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors">
                  ลืมรหัสผ่าน?
                </Link>
              </div>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-red-600 transition-colors">
                  🔒
                </span>
                <input 
                  type="password" 
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white transition-all text-sm font-medium text-slate-800"
                  placeholder="กรอกรหัสผ่าน"
                  required
                />
              </div>
            </div>

            {/* ปุ่ม Submit */}
            <button 
              type="submit" 
              className="w-full py-3.5 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-700/30 transform active:scale-95 transition-all mt-4 text-sm tracking-wide"
            >
              เข้าสู่ระบบ ➔
            </button>
          </form>

          {/* ปุ่มกลับหน้าหลัก */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <Link href="/" className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
              <span>←</span> กลับไปหน้าหลัก
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}