"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [myEnrollments, setMyEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // System Settings State
  const [regStatus, setRegStatus] = useState<{ isOpen: boolean; message: string }>({ isOpen: true, message: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // 1. ตรวจสอบเวลาเปิด-ปิดลงทะเบียน
    const { data: settings } = await supabase.from("system_settings").select("*").eq("id", 1).single();
    if (settings) {
      const now = new Date();
      const start = settings.registration_start ? new Date(settings.registration_start) : null;
      const end = settings.registration_end ? new Date(settings.registration_end) : null;

      if (start && now < start) {
        setRegStatus({
          isOpen: false,
          message: `⏳ ระบบยังไม่เปิดให้ลงทะเบียน (เปิดวันที่ ${start.toLocaleString("th-TH")})`,
        });
      } else if (end && now > end) {
        setRegStatus({
          isOpen: false,
          message: `⛔ หมดช่วงเวลาลงทะเบียนกิจกรรมแล้ว (ปิดเมื่อ ${end.toLocaleString("th-TH")})`,
        });
      } else {
        setRegStatus({ isOpen: true, message: "🟢 กำลังเปิดรับสมัคร" });
      }
    }

    // 2. ดึงโปรไฟล์และประวัติการลงทะเบียนของนักเรียน
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(prof);

      const { data: enr } = await supabase
        .from("enrollments")
        .select("id, activity_id, activities(id, category, title)")
        .eq("student_id", user.id);

      if (enr) setMyEnrollments(enr);
    }

    // 3. ดึงรายการกิจกรรมทั้งหมด
    const { data: acts } = await supabase.from("activities").select("*").order("id", { ascending: true });
    setActivities(acts || []);
    setLoading(false);
  };

  // ฟังก์ชันสมัคร / ย้ายกิจกรรม
  const handleEnroll = async (targetAct: any) => {
    if (!regStatus.isOpen) {
      Swal.fire({ icon: "error", title: "ไม่สามารถลงทะเบียนได้", text: regStatus.message });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // ตรวจสอบว่าเคยลงทะเบียนในหมวดหมู่นี้ไว้แล้วหรือยัง
    const targetCat = targetAct.category;
    const existingSameCatEnrollment = myEnrollments.find(
      (e: any) => e.activities && e.activities.category === targetCat
    );

    // กรณีที่ 1: เคยลงทะเบียนในหมวดหมู่นี้ไปแล้ว -> ถามว่าต้องการย้ายหรือไม่
    if (existingSameCatEnrollment) {
      const oldTitle = existingSameCatEnrollment.activities.title;
      const catLabel = targetCat === "UNIFORM" ? "เครื่องแบบ" : "ชุมนุม";

      const confirmSwap = await Swal.fire({
        title: `ต้องการสลับ${catLabel}?`,
        html: `คุณได้ลงทะเบียน <b>"${oldTitle}"</b> ไว้แล้ว<br/>ต้องการเปลี่ยนมาเป็น <b>"${targetAct.title}"</b> หรือไม่?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#2563eb",
        cancelButtonColor: "#64748b",
        confirmButtonText: "ใช่, ย้ายกิจกรรม",
        cancelButtonText: "ยกเลิก",
        customClass: { popup: "rounded-3xl font-sans" },
      });

      if (!confirmSwap.isConfirmed) return;

      setProcessingId(targetAct.id);

      // 1.1 ยกเลิกอันเก่า
      const oldActId = existingSameCatEnrollment.activity_id;
      await supabase.from("enrollments").delete().eq("id", existingSameCatEnrollment.id);

      const { data: oldActData } = await supabase.from("activities").select("current_enrolled").eq("id", oldActId).single();
      if (oldActData) {
        await supabase.from("activities").update({ current_enrolled: Math.max(0, oldActData.current_enrolled - 1) }).eq("id", oldActId);
      }

      // 1.2 ลงทะเบียนอันใหม่
      await supabase.from("enrollments").insert([{ student_id: user.id, activity_id: targetAct.id }]);
      await supabase.from("activities").update({ current_enrolled: (targetAct.current_enrolled || 0) + 1 }).eq("id", targetAct.id);

      Swal.fire({
        icon: "success",
        title: "ย้ายกิจกรรมสำเร็จ! 🎉",
        text: `เปลี่ยนมาเข้าร่วม "${targetAct.title}" เรียบร้อยแล้ว`,
        confirmButtonColor: "#2563eb",
        customClass: { popup: "rounded-3xl font-sans" },
      });

      setProcessingId(null);
      fetchData();
      return;
    }

    // กรณีที่ 2: ยังไม่เคยลงทะเบียนในหมวดหมู่นี้ -> ลงทะเบียนใหม่
    setProcessingId(targetAct.id);

    const { error } = await supabase.from("enrollments").insert([{ student_id: user.id, activity_id: targetAct.id }]);
    if (error) {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: error.message });
      setProcessingId(null);
      return;
    }

    await supabase.from("activities").update({ current_enrolled: (targetAct.current_enrolled || 0) + 1 }).eq("id", targetAct.id);

    Swal.fire({
      icon: "success",
      title: "ลงทะเบียนสำเร็จ! 🎉",
      text: `ลงทะเบียนเข้าร่วม "${targetAct.title}" เรียบร้อยแล้ว`,
      confirmButtonColor: "#2563eb",
      customClass: { popup: "rounded-3xl font-sans" },
    });

    setProcessingId(null);
    fetchData();
  };

  // ฟังก์ชันยกเลิกการลงทะเบียน
  const handleUnenroll = async (act: any) => {
    if (!regStatus.isOpen) {
      Swal.fire({ icon: "error", title: "ไม่สามารถทำรายการได้", text: regStatus.message });
      return;
    }

    const confirmResult = await Swal.fire({
      title: "ยืนยันการยกเลิก?",
      text: `คุณต้องการยกเลิกการลงทะเบียนกิจกรรม "${act.title}" ใช่หรือไม่?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ใช่, ยกเลิก",
      cancelButtonText: "กลับ",
      customClass: { popup: "rounded-3xl font-sans" },
    });

    if (!confirmResult.isConfirmed) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setProcessingId(act.id);

    await supabase.from("enrollments").delete().eq("student_id", user.id).eq("activity_id", act.id);
    await supabase.from("activities").update({ current_enrolled: Math.max(0, (act.current_enrolled || 0) - 1) }).eq("id", act.id);

    Swal.fire({ icon: "success", title: "ยกเลิกเรียบร้อย", text: `ยกเลิกการลงทะเบียน "${act.title}" แล้ว` });

    setProcessingId(null);
    fetchData();
  };

  const checkCategoryMatch = (actCategory: string, targetCat: string) => {
    if (targetCat === "ALL") return true;
    if (!actCategory) return false;
    const cat = actCategory.toString().trim().toLowerCase();

    if (targetCat === "CLUB") return cat.includes("club") || cat.includes("ชุมนุม");
    if (targetCat === "UNIFORM") return cat.includes("uniform") || cat.includes("เครื่องแบบ");
    if (targetCat === "GUIDANCE") return cat.includes("guidance") || cat.includes("แนะแนว");
    if (targetCat === "COMMUNITY_SERVICE") return cat.includes("community") || cat.includes("จิตอาสา");
    return false;
  };

  const checkLevelMatch = (targetLevel: string, studentGrade: string) => {
    if (!targetLevel || targetLevel === "ทุกระดับชั้น" || !studentGrade) return true;
    const tLevel = targetLevel.trim();
    const sGrade = studentGrade.trim();

    if (tLevel === sGrade || tLevel.includes(sGrade)) return true;
    const isJunior = sGrade.includes("1") || sGrade.includes("2") || sGrade.includes("3");
    if (isJunior && (tLevel.includes("ต้น") || tLevel.includes("ม.ต้น"))) return true;
    if (!isJunior && (tLevel.includes("ปลาย") || tLevel.includes("ม.ปลาย"))) return true;
    return false;
  };

  const filteredActivities = activities.filter((act) => {
    return checkCategoryMatch(act.category, selectedCategory) && checkLevelMatch(act.target_level, profile?.grade_level || "");
  });

  const myEnrolledActivityIds = myEnrollments.map((e: any) => e.activity_id);

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 text-slate-800">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header & แถบแจ้งสถานะช่วงเวลา */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">📌 ลงทะเบียนกิจกรรมพัฒนาผู้เรียน</h1>
              <p className="text-xs text-slate-500 mt-1">
                {profile && <span className="font-bold text-blue-600">สำหรับ {profile.full_name} ชั้น ม.{profile.grade_level}/{profile.classroom}</span>}
              </p>
            </div>
            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
              regStatus.isOpen ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
            }`}>
              {regStatus.message}
            </span>
          </div>
        </div>

        {/* แถบกรองหมวดหมู่ */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: "ALL", label: "ทั้งหมด" },
            { id: "CLUB", label: "📌 ชุมนุม (เลือกได้ 1)" },
            { id: "UNIFORM", label: "⚜️ เครื่องแบบ (เลือกได้ 1)" },
            { id: "GUIDANCE", label: "🧭 แนะแนว" },
            { id: "COMMUNITY_SERVICE", label: "🤝 จิตอาสา" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === cat.id
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* รายการกิจกรรม */}
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">กำลังโหลดรายการกิจกรรม...</div>
        ) : filteredActivities.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-400 text-sm">
            ไม่พบกิจกรรมสำหรับระดับชั้นของคุณในหมวดหมู่นี้
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredActivities.map((act) => {
              const maxSeats = act.max_seats || 40;
              const currentEnrolled = act.current_enrolled || 0;
              const isFull = currentEnrolled >= maxSeats;
              const isEnrolled = myEnrolledActivityIds.includes(act.id);
              const isProcessing = processingId === act.id;

              return (
                <div key={act.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg">
                        {act.category === "UNIFORM" ? "⚜️ เครื่องแบบ" : act.category === "GUIDANCE" ? "🧭 แนะแนว" : act.category === "COMMUNITY_SERVICE" ? "🤝 จิตอาสา" : "📌 ชุมนุม"}
                      </span>
                      <span className="text-xs font-bold text-slate-500">รับ {act.target_level || "ทุกระดับชั้น"}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-base">{act.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">ครูผู้สอน: {act.teacher_name || "-"} | สถานที่: {act.location || "-"}</p>

                    {/* 🌟 แสดงเงื่อนไข/คุณสมบัติพิเศษ (ถ้ามี) */}
                    {act.requirements && (
                      <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-800 flex items-center gap-1.5 mt-2.5">
                        <span>⚠️</span>
                        <span>เงื่อนไข: {act.requirements}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center border-t pt-3">
                    <span className="text-xs font-bold text-slate-600">
                      ผู้สมัคร: <span className={isFull ? "text-red-600 font-bold" : "text-green-600 font-bold"}>{currentEnrolled}</span> / {maxSeats} คน
                    </span>

                    {isEnrolled ? (
                      <button
                        disabled={!regStatus.isOpen || isProcessing}
                        onClick={() => handleUnenroll(act)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 hover:bg-red-100 hover:text-red-700 transition-all disabled:opacity-50"
                      >
                        {isProcessing ? "กำลังทำรายการ..." : "✅ สมัครแล้ว (ยกเลิก)"}
                      </button>
                    ) : (
                      <button
                        disabled={!regStatus.isOpen || isFull || isProcessing}
                        onClick={() => handleEnroll(act)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all ${
                          !regStatus.isOpen || isFull
                            ? "bg-slate-300 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 shadow-md"
                        }`}
                      >
                        {isProcessing ? "กำลังบันทึก..." : !regStatus.isOpen ? "ปิดรับสมัคร" : isFull ? "เต็มแล้ว" : "ลงทะเบียน"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}