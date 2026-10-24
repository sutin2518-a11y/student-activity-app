"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`กำลังเข้าสู่ระบบด้วยรหัส: ${studentId}`);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-slate-100 p-4 font-sans overflow-hidden">
      
      {/* 🖼️ ภาพพื้นหลัง */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="/images/banner.jpg" 
          alt="School Background" 
          fill 
          priority
          className="object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 to-red-900/80 backdrop-blur-sm"></div>
      </div>

      {/* 📦 กล่องฟอร์มเข้าสู่ระบบ (ปรับขนาดเล็กลงเป็น max-w-sm) */}
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        
        {/* ส่วนหัวกล่อง */}
        <div className="bg-red-800 px-4 py-6 text-center">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border-2 border-red-900/30">
            <span className="text-2xl">🏛️</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">เข้าสู่ระบบ</h2>
          <p className="text-red-200 text-xs">โรงเรียนเชียงคำวิทยาคม</p>
        </div>

        {/* ส่วนกรอกข้อมูล */}
        <div className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* รหัสนักเรียน */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 ml-1" htmlFor="studentId">
                รหัสนักเรียน / ชื่อผู้ใช้งาน
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 group-focus-within:text-red-600 transition-colors">
                  👤
                </span>
                <input 
                  type="text" 
                  id="studentId"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white text-sm transition-all"
                  placeholder="รหัส 5 หลัก"
                  required
                />
              </div>
            </div>

            {/* รหัสผ่าน */}
            <div>
              <div className="flex justify-between items-center mb-1 ml-1 mr-1">
                <label className="block text-xs font-bold text-slate-700" htmlFor="password">
                  รหัสผ่าน
                </label>
                <Link href="#" className="text-[10px] font-semibold text-blue-600 hover:underline">
                  ลืมรหัสผ่าน?
                </Link>
              </div>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 group-focus-within:text-red-600 transition-colors">
                  🔒
                </span>
                <input 
                  type="password" 
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white text-sm transition-all"
                  placeholder="กรอกรหัสผ่าน"
                  required
                />
              </div>
            </div>

            {/* ปุ่ม Submit */}
            <button 
              type="submit" 
              className="w-full py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold rounded-lg shadow-md transition-all mt-2 text-sm"
            >
              เข้าสู่ระบบ ➔
            </button>
          </form>

          {/* ปุ่มกลับหน้าหลัก */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <Link href="/" className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-800">
              ← กลับไปหน้าหลัก
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}