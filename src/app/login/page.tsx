"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// สร้าง Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("12345678"); // กำหนดค่าเริ่มต้นในฟอร์มเป็น 12345678
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. แปลง Username เป็นอีเมลองค์กร (@chiangkham.ac.th)
      let loginEmail = username.trim();

      if (!loginEmail.includes("@")) {
        loginEmail = `${loginEmail}@chiangkham.ac.th`;
      }

      // 2. ล็อกอินผ่าน Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (authError) throw authError;

      // 3. ดึงข้อมูล Role จากตาราง profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      if (profileError) throw profileError;

      // 4. สลับหน้าไปยัง Path ตามสิทธิ์ใช้งาน (เช่น /student, /teacher, /admin)
      const userRole = profile?.role || "student";
      router.push(`/${userRole}`);

    } catch (error: any) {
      alert("เข้าสู่ระบบไม่สำเร็จ: " + (error.message || "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง"));
    } finally {
      setIsLoading(false);
    }
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

      {/* 📦 กล่องฟอร์มเข้าสู่ระบบ */}
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        
        {/* ส่วนหัวกล่อง */}
        <div className="bg-red-800 px-4 py-6 text-center">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border-2 border-red-900/30">
            <span className="text-2xl">🏛️</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">เข้าสู่ระบบ</h2>
          <p className="text-red-200 text-xs">โรงเรียนเชียงคำวิทยาคม</p>
        </div>

        {/* ส่วนฟอร์มกรอกข้อมูล */}
        <div className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* ช่องกรอกชื่อผู้ใช้งาน/รหัสนักเรียน */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 ml-1" htmlFor="username">
                รหัสนักเรียน / บัญชีผู้ใช้งาน
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 group-focus-within:text-red-600 transition-colors">
                  👤
                </span>
                <input 
                  type="text" 
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white text-sm transition-all"
                  placeholder="เช่น 34833 หรือ ชื่อครู"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 ml-1">*ระบบจะต่อท้าย @chiangkham.ac.th ให้โดยอัตโนมัติ</p>
            </div>

            {/* ช่องกรอกรหัสผ่าน */}
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
                  placeholder="รหัสผ่านตั้งต้น 12345678"
                  required
                />
              </div>
            </div>

            {/* ปุ่มเข้าสู่ระบบ */}
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold rounded-lg shadow-md transition-all mt-2 text-sm disabled:opacity-50"
            >
              {isLoading ? "กำลังตรวจสอบข้อมูล..." : "เข้าสู่ระบบ ➔"}
            </button>
          </form>

          {/* ปุ่มย้อนกลับ */}
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