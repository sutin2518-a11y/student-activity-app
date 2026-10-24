"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";

export default function AdminHeader() {
  const [promoting, setPromoting] = useState(false);

  const handlePromoteAcademicYear = async () => {
    const confirmResult = await Swal.fire({
      title: "🚨 ยืนยันการเลื่อนชั้นปีอัตโนมัติ?",
      html: `ระบบจะทำการ:<br/>1. ปรับระดับชั้นนักเรียนขึ้น 1 ชั้น<br/>2. สลับกิจกรรมเครื่องแบบ/ชุมนุมไปชั้นปีใหม่ให้อัตโนมัติ`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d97706",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ใช่, ดำเนินการเลื่อนชั้นปี",
      cancelButtonText: "ยกเลิก",
      customClass: { popup: "rounded-3xl font-sans" },
    });

    if (!confirmResult.isConfirmed) return;

    setPromoting(true);

    try {
      const { data: students } = await supabase.from("profiles").select("*");
      const { data: allActivities } = await supabase.from("activities").select("*");
      const { data: allEnrollments } = await supabase.from("enrollments").select("*, activities(*)");

      if (!students || !allActivities || !allEnrollments) {
        Swal.fire({ icon: "error", title: "ไม่สามารถดึงข้อมูลเพื่อประมวลผลได้" });
        setPromoting(false);
        return;
      }

      const gradeMapping: { [key: string]: string } = {
        "ม.1": "ม.2", "ม.2": "ม.3", "ม.3": "ม.4", "ม.4": "ม.5", "ม.5": "ม.6", "ม.6": "จบการศึกษา",
      };

      let promotedStudentsCount = 0;
      let promotedEnrollmentsCount = 0;

      for (const student of students) {
        const currentGrade = student.grade_level;
        const newGrade = gradeMapping[currentGrade];
        if (!newGrade) continue;

        await supabase.from("profiles").update({ grade_level: newGrade }).eq("id", student.id);
        promotedStudentsCount++;

        const studentEnrollments = allEnrollments.filter((e) => e.student_id === student.id);
        for (const enrollment of studentEnrollments) {
          const oldAct = enrollment.activities;
          if (!oldAct || !oldAct.title) continue;

          const newActTitle = oldAct.title.replace(currentGrade, newGrade);
          const targetNewAct = allActivities.find((a) => a.title === newActTitle);

          if (targetNewAct) {
            await supabase.from("enrollments").update({ activity_id: targetNewAct.id }).eq("id", enrollment.id);
            promotedEnrollmentsCount++;
          }
        }
      }

      for (const act of allActivities) {
        const { count } = await supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("activity_id", act.id);
        await supabase.from("activities").update({ current_enrolled: count || 0 }).eq("id", act.id);
      }

      Swal.fire({
        icon: "success",
        title: "เลื่อนชั้นปีสำเร็จเรียบร้อย! 🎉",
        html: `ปรับชั้นปีนักเรียน: <b>${promotedStudentsCount}</b> คน<br/>ปรับระดับกิจกรรมอัตโนมัติ: <b>${promotedEnrollmentsCount}</b> รายการ`,
        confirmButtonColor: "#2563eb",
        customClass: { popup: "rounded-3xl font-sans" },
      }).then(() => window.location.reload());

    } catch (err: any) {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาดในการประมวลผล", text: err.message });
    }
    setPromoting(false);
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">⚙️ ระบบจัดการกิจกรรม (Admin)</h1>
        <p className="text-xs text-slate-500 mt-1">ตั้งค่าช่วงเวลา นำเข้าข้อมูลกิจกรรม ครูประจำชั้น และเลื่อนชั้นปีอัตโนมัติ</p>
      </div>
      <button
        onClick={handlePromoteAcademicYear}
        disabled={promoting}
        className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-2xl shadow-lg transition-all flex items-center gap-2"
      >
        <span>🔄</span>
        <span>{promoting ? "กำลังเลื่อนชั้นปี..." : "เลื่อนชั้นปี & กิจกรรมอัตโนมัติ"}</span>
      </button>
    </div>
  );
}