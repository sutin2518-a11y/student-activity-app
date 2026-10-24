"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import Papa from "papaparse";

export default function AdminImports() {
  const [importing, setImporting] = useState(false);
  const [teacherCsvFile, setTeacherCsvFile] = useState<File | null>(null);
  const [advisorCsvFile, setAdvisorCsvFile] = useState<File | null>(null);
  const [clubCsvFile, setClubCsvFile] = useState<File | null>(null);
  const [clubStudentCsvFile, setClubStudentCsvFile] = useState<File | null>(null);
  const [uniformCsvFile, setUniformCsvFile] = useState<File | null>(null);
  const [uniformTeacherCsvFile, setUniformTeacherCsvFile] = useState<File | null>(null);

  // ฟังก์ชันช่วย Refresh หน้าเว็บหลังโหลดเสร็จ
  const reloadPage = () => window.location.reload();

  // --- นำเข้าครู ---
  const handleDownloadTeacherTemplate = () => {
    const csvContent = "\uFEFFชื่อ-สกุล,กลุ่มสาระการเรียนรู้\nนางจิณณ์ณิชา บุญวงศ์,ภาษาไทย\nนางสาวรุ่งรัตน์ พลนรัตน์,ภาษาไทย\nนายประการ วงศ์ใหญ่,คณิตศาสตร์";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "เทมเพลต_รายชื่อครู.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleTeacherCSVImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherCsvFile) return Swal.fire({ icon: "warning", title: "กรุณาเลือกไฟล์ CSV" });
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
        if (lines.length <= 1) throw new Error("ไฟล์ CSV ไม่มีข้อมูล");
        
        const newTeachers = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((c) => c.trim().replace(/^"|"$/g, ""));
          if (cols[0]) newTeachers.push({ full_name: cols[0], department: cols[1] || "" });
        }
        
        const { error } = await supabase.from("teachers").insert(newTeachers);
        if (error) throw error;
        Swal.fire({ icon: "success", title: "สำเร็จ!", text: `นำเข้า ${newTeachers.length} รายการ` }).then(reloadPage);
      } catch (err: any) {
        Swal.fire({ icon: "error", title: "ผิดพลาด", text: err.message });
      }
      setImporting(false);
    };
    reader.readAsText(teacherCsvFile, "UTF-8");
  };

  // --- นำเข้าครูที่ปรึกษา ---
  const handleDownloadAdvisorTemplate = () => {
    const csvContent = "\uFEFFGrade,Room,TeacherName,TeacherEmail\n1,1,นางสาวรุ่งรัตน์ พลนรัตน์,rungrat@chiangkham.ac.th";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "เทมเพลต_ครูที่ปรึกษา.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleAdvisorCSVImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advisorCsvFile) return Swal.fire({ icon: "warning", title: "กรุณาเลือกไฟล์" });
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const lines = (event.target?.result as string).replace(/^\uFEFF/, "").split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
        const newAdvisors = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(lines[i].includes(";") ? ";" : ",").map((c) => c.trim().replace(/^"|"$/g, ""));
          if (cols[0] && cols[1]) newAdvisors.push({ grade_level: cols[0], classroom: cols[1], teacher_name: cols[2] || "", teacher_email: cols[3]?.toLowerCase() || "", academic_year: "2569" });
        }
        const { error } = await supabase.from("classroom_advisors").insert(newAdvisors);
        if (error) throw error;
        Swal.fire({ icon: "success", title: "สำเร็จ!", text: `นำเข้า ${newAdvisors.length} รายการ` }).then(reloadPage);
      } catch (err: any) { Swal.fire({ icon: "error", title: "ผิดพลาด", text: err.message }); }
      setImporting(false);
    };
    reader.readAsText(advisorCsvFile, "UTF-8");
  };

  // --- นำเข้าวิชาชุมนุม ---
  const handleDownloadClubTemplate = () => {
    const csvContent = "\uFEFFปีการศึกษา,ชื่อชุมนุม,จำนวนที่รับได้,ครูที่ปรึกษา,สถานที่เรียน,เงื่อนไขรับสมัคร,กลุ่มสาระ,ลักษณะการจัดกิจกรรม\n2569,5 ส.,20,ครูณัฐกานต์,ห้องคหกรรม,ม.ต้น,การงาน,กิจกรรม 5ส";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "เทมเพลต_นำเข้าชุมนุม.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleClubCSVImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubCsvFile) return Swal.fire({ icon: "warning", title: "กรุณาเลือกไฟล์" });
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const lines = (event.target?.result as string).split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
        const newActivities = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((c) => c.trim().replace(/^"|"$/g, ""));
          if (cols[1]) {
            let tl = "ทุกระดับชั้น";
            if (cols[5].includes("ม.ต้น") && !cols[5].includes("ม.ปลาย")) tl = "ม.ต้น";
            else if (cols[5].includes("ม.ปลาย") && !cols[5].includes("ม.ต้น")) tl = "ม.ปลาย";
            newActivities.push({ title: cols[1], category: "CLUB", target_level: tl, requirements: cols[5], max_seats: Number(cols[2]) || 20, current_enrolled: 0, teacher_name: cols[3], location: cols[4], department: cols[6], description: cols[7], academic_year: cols[0] || "2569" });
          }
        }
        const { error } = await supabase.from("activities").insert(newActivities);
        if (error) throw error;
        Swal.fire({ icon: "success", title: "สำเร็จ!", text: `นำเข้า ${newActivities.length} รายการ` }).then(reloadPage);
      } catch (err: any) { Swal.fire({ icon: "error", title: "ผิดพลาด", text: err.message }); }
      setImporting(false);
    };
    reader.readAsText(clubCsvFile, "UTF-8");
  };

  // --- นำเข้านักเรียนชุมนุม ---
  const handleDownloadClubStudentTemplate = () => {
    const csvContent = "\uFEFFรหัสนักเรียน,ชื่อ-สกุล,ระดับชั้น,ห้อง,เลขที่,ชุมนุมที่สมัคร\n35217,เด็กหญิงพิชญธิดา ปัญญา,ม.1,11,21,5 ส.";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "เทมเพลต_นักเรียนชุมนุม.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleClubStudentCSVImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubStudentCsvFile) return Swal.fire({ icon: "warning", title: "กรุณาเลือกไฟล์ CSV" });
    setImporting(true);
    Papa.parse(clubStudentCsvFile, {
      header: false, skipEmptyLines: true,
      complete: async (results) => {
        try {
          const insertData = results.data.slice(1).map((r: any) => ({
            student_id: String(r[0] || "").trim(),
            full_name: String(r[1] || "").trim(),
            grade_level: String(r[2] || "").trim(),
            classroom: String(r[3] || "").trim(),
            no: String(r[4] || "").trim(),
            club_name: String(r[5] || "").trim(),
          })).filter((d: any) => d.full_name && d.club_name);

          if (insertData.length === 0) throw new Error("ไม่พบข้อมูลที่ถูกต้องในไฟล์ CSV");

          const { error } = await supabase.from("club_activities").insert(insertData);
          if (error) throw error;
          Swal.fire({ icon: "success", title: "สำเร็จ!", html: `นำเข้า <b>${insertData.length}</b> รายการ` }).then(reloadPage);
        } catch (err: any) { Swal.fire({ icon: "error", title: "ผิดพลาด", text: err.message }); }
        finally { setImporting(false); }
      }
    });
  };

  // --- นำเข้าเครื่องแบบ ---
  const handleUniformCSVImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uniformCsvFile) return Swal.fire({ icon: "warning", title: "กรุณาเลือกไฟล์ CSV" });
    setImporting(true);
    Papa.parse(uniformCsvFile, {
      header: false, skipEmptyLines: true,
      complete: async (results) => {
        try {
          const insertData = results.data.slice(1).map((r: any) => ({
            student_id_card: String(r[0] || "").trim(), full_name: String(r[1] || "").trim(), activity_name: String(r[2] || "").trim(),
            grade_level: String(r[3] || "").trim(), classroom: String(r[4] || "").trim(), no: String(r[5] || "").trim(),
            gender: String(r[6] || "").trim(), level_1: String(r[7] || "").trim(), level_2: String(r[8] || "").trim(), level_3: String(r[9] || "").trim()
          }));
          const { error } = await supabase.from("uniform_activities").insert(insertData);
          if (error) throw error;
          Swal.fire({ icon: "success", title: "สำเร็จ!", html: `นำเข้า <b>${insertData.length}</b> รายการ` }).then(reloadPage);
        } catch (err: any) { Swal.fire({ icon: "error", title: "ผิดพลาด", text: err.message }); }
        finally { setImporting(false); }
      }
    });
  };

  // --- นำเข้าครูเครื่องแบบ ---
  const handleDownloadUniformTeacherTemplate = () => {
    const csvContent = "\uFEFFเลขที่(ครู),ชื่อ-สกุล (ครู),อาชีพ,ตำแหน่ง,กลุ่มสาระ,กิจกรรมที่สอน,ตำแหน่ง (กิจกรรม),ระดับชั้นสอน,กลุ่ม,ผู้กำกับ/กอง\n1,นายประการ วงศ์ใหญ่,ครู,ครู,คณิตศาสตร์,ลูกเสือ,ผู้กำกับ,ม.1,1,กอง 1";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "เทมเพลต_ครูผู้สอนเครื่องแบบ.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleUniformTeacherCSVImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uniformTeacherCsvFile) return Swal.fire({ icon: "warning", title: "กรุณาเลือกไฟล์" });
    setImporting(true);
    Papa.parse(uniformTeacherCsvFile, {
      header: false, skipEmptyLines: true,
      complete: async (results) => {
        try {
          const insertData = results.data.slice(1).map((r: any) => ({
            teacher_name: String(r[1] || "").trim(), activity_name: String(r[5] || "").trim(), grade_level: String(r[7] || "").trim(),
            group_no: String(r[8] || "").trim(), division_no: String(r[9] || "").trim()
          })).filter((d: any) => d.teacher_name && d.activity_name);
          const { error } = await supabase.from("uniform_teachers").insert(insertData);
          if (error) throw error;
          Swal.fire({ icon: "success", title: "สำเร็จ!", text: `นำเข้า ${insertData.length} รายการ` }).then(reloadPage);
        } catch (err: any) { Swal.fire({ icon: "error", title: "ผิดพลาด", text: err.message }); }
        finally { setImporting(false); }
      }
    });
  };

  return (
    <>
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex justify-between items-center"><h2 className="font-bold text-slate-900 text-sm">👩‍🏫 นำเข้ารายชื่อครู</h2><button type="button" onClick={handleDownloadTeacherTemplate} className="text-[10px] text-blue-600 underline font-bold">โหลดเทมเพลต</button></div>
        <p className="text-[11px] text-slate-500">นำเข้าชื่อครู คอลัมน์ A (ชื่อ) B (กลุ่มสาระ)</p>
        <form onSubmit={handleTeacherCSVImport} className="space-y-2"><input type="file" accept=".csv" onChange={(e) => setTeacherCsvFile(e.target.files?.[0] || null)} className="w-full px-2 py-1 border rounded-xl text-[10px] bg-slate-50"/><button type="submit" disabled={importing} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl">🚀 นำเข้าครู</button></form>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex justify-between items-center"><h2 className="font-bold text-slate-900 text-sm">🏫 ครูที่ปรึกษา</h2><button type="button" onClick={handleDownloadAdvisorTemplate} className="text-[10px] text-blue-600 underline font-bold">โหลดเทมเพลต</button></div>
        <p className="text-[11px] text-slate-500">นำเข้าครูที่ปรึกษา คอลัมน์ A - D</p>
        <form onSubmit={handleAdvisorCSVImport} className="space-y-2"><input type="file" accept=".csv" onChange={(e) => setAdvisorCsvFile(e.target.files?.[0] || null)} className="w-full px-2 py-1 border rounded-xl text-[10px] bg-slate-50"/><button type="submit" disabled={importing} className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl">🚀 นำเข้าครูประจำชั้น</button></form>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex justify-between items-center"><h2 className="font-bold text-slate-900 text-sm">📦 นำเข้าชุมนุม 100+</h2><button type="button" onClick={handleDownloadClubTemplate} className="text-[10px] text-blue-600 underline font-bold">โหลดเทมเพลต</button></div>
        <p className="text-[11px] text-slate-500">นำเข้าวิชาชุมนุมยกชุด คอลัมน์ A - H</p>
        <form onSubmit={handleClubCSVImport} className="space-y-2"><input type="file" accept=".csv" onChange={(e) => setClubCsvFile(e.target.files?.[0] || null)} className="w-full px-2 py-1 border rounded-xl text-[10px] bg-slate-50"/><button type="submit" disabled={importing} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl">🚀 นำเข้าชุมนุม</button></form>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex justify-between items-center"><h2 className="font-bold text-slate-900 text-sm">🧩 นำเข้านักเรียนชุมนุม</h2><button type="button" onClick={handleDownloadClubStudentTemplate} className="text-[10px] text-blue-600 underline font-bold">โหลดเทมเพลต</button></div>
        <p className="text-[11px] text-slate-500">นำเข้ารายชื่อนักเรียนที่เลือกชุมนุม คอลัมน์ A - F</p>
        <form onSubmit={handleClubStudentCSVImport} className="space-y-2"><input type="file" accept=".csv" onChange={(e) => setClubStudentCsvFile(e.target.files?.[0] || null)} className="w-full px-2 py-1 border rounded-xl text-[10px] bg-slate-50"/><button type="submit" disabled={importing} className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl">🚀 นำเข้านักเรียนชุมนุม</button></form>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <h2 className="font-bold text-slate-900 text-sm">📥 นำเข้าเครื่องแบบ</h2>
        <p className="text-[11px] text-slate-500">นำเข้านักเรียนเครื่องแบบเดิม</p>
        <form onSubmit={handleUniformCSVImport} className="space-y-2"><input type="file" accept=".csv" onChange={(e) => setUniformCsvFile(e.target.files?.[0] || null)} className="w-full px-2 py-1 border rounded-xl text-[10px] bg-slate-50"/><button type="submit" disabled={importing} className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl">🚀 นำเข้าเครื่องแบบ</button></form>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex justify-between items-center"><h2 className="font-bold text-slate-900 text-sm">👨‍💼 ครูผู้สอนเครื่องแบบ</h2><button type="button" onClick={handleDownloadUniformTeacherTemplate} className="text-[10px] text-rose-600 underline font-bold">โหลดเทมเพลต</button></div>
        <p className="text-[11px] text-slate-500">นำเข้าผู้กำกับลูกเสือ/เนตรนารี</p>
        <form onSubmit={handleUniformTeacherCSVImport} className="space-y-2"><input type="file" accept=".csv" onChange={(e) => setUniformTeacherCsvFile(e.target.files?.[0] || null)} className="w-full px-2 py-1 border rounded-xl text-[10px] bg-slate-50"/><button type="submit" disabled={importing} className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl">🚀 นำเข้าครูเครื่องแบบ</button></form>
      </div>
    </>
  );
}