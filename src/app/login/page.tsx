"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("12345678");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const cleanUser = username.trim();
    const loginEmail = cleanUser.includes("@") ? cleanUser : `${cleanUser}@chiangkham.ac.th`;

    try {
      // 1. ลองเข้าสู่ระบบด้วย Auth ปกติก่อน
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (!signInError && authData.user) {
        // ดึง Role จากตาราง profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", authData.user.id)
          .single();

        const role = profile?.role || "student";
        router.push(`/${role}`);
        return;
      }

      // 2. หากยังไม่มีบัญชีใน Auth -> ตรวจสอบในตาราง student_database
      const { data: student } = await supabase
        .from("student_database")
        .select("*")
        .eq("student_id_card", cleanUser)
        .maybeSingle();

      if (student) {
        // สร้างบัญชีลง Auth
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: loginEmail,
          password: password,
        });

        if (signUpError) throw signUpError;

        if (signUpData.user) {
          // เพิ่มข้อมูลลงตาราง profiles ทันที
          await supabase.from("profiles").upsert({
            id: signUpData.user.id,
            full_name: student.full_name,
            role: "student",
            student_id_card: student.student_id_card,
            grade_level: student.grade_level,
            classroom: student.classroom,
          });

          router.push("/student");
          return;
        }
      }

      // 3. หากไม่เจอนักเรียน -> ตรวจสอบในตาราง teachers
      const { data: teacher } = await supabase
        .from("teachers")
        .select("*")
        .ilike("full_name", `%${cleanUser}%`)
        .maybeSingle();

      if (teacher) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: loginEmail,
          password: password,
        });

        if (signUpError) throw signUpError;

        if (signUpData.user) {
          await supabase.from("profiles").upsert({
            id: signUpData.user.id,
            full_name: teacher.full_name,
            role: "teacher",
            grade_level: teacher.grade_level,
            classroom: teacher.classroom,
          });

          router.push("/teacher");
          return;
        }
      }

      // 4. ไม่พบข้อมูลในระบบ
      throw new Error("ไม่พบข้อมูลนักเรียน/ครูในฐานข้อมูลโรงเรียน หรือรหัสผ่านไม่ถูกต้อง");

    } catch (error: any) {
      alert("เข้าสู่ระบบไม่สำเร็จ: " + (error.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ"));
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
        <div className="bg-red-800 px-4 py-6 text-center">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border-2 border-red-900/30">
            <span className="text-2xl">🏛️</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">เข้าสู่ระบบ</h2>
          <p className="text-red-200 text-xs">โรงเรียนเชียงคำวิทยาคม</p>
        </div>

        <div className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
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
                  placeholder="รหัสนักเรียน 5 หลัก หรือชื่อครู"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 ml-1">*ระบบจะต่อท้าย @chiangkham.ac.th ให้โดยอัตโนมัติ</p>
            </div>

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

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold rounded-lg shadow-md transition-all mt-2 text-sm disabled:opacity-50"
            >
              {isLoading ? "กำลังตรวจสอบข้อมูล..." : "เข้าสู่ระบบ ➔"}
            </button>
          </form>

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