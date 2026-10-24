"use client";

import React, { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";

export default function ImportClubStudentsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ฟังก์ชันอ่านและแปลงไฟล์ CSV เป็น JSON
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsedRows = parseCSV(text);
        setPreviewData(parsedRows);
      } catch (err) {
        console.error("CSV Parse Error:", err);
        Swal.fire({
          icon: "error",
          title: "รูปแบบไฟล์ไม่ถูกต้อง",
          text: "กรุณาตรวจสอบว่าไฟล์เป็นรูปแบบ .csv (UTF-8) หรือไม่",
        });
      } finally {
        setLoading(false);
      }
    };

    reader.readAsText(selectedFile, "UTF-8");
  };

  // Parser แปลงข้อความ CSV เป็น Object โดยรองรับภาษาไทย
  const parseCSV = (csvText: string) => {
    const lines = csvText.split(/\r\n|\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) return [];

    // อ่าน Headers
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));

    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      // ใช้ Regex แยกคอมมาโดยคำนึงถึงเครื่องหมายอัญประกาศ "
      const currentline = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(",");

      if (currentline.length < 2) continue;

      const cleanValues = currentline.map((val) => val.trim().replace(/^"|"$/g, ""));

      // แมปคอลัมน์ A - F ตามโครงสร้าง
      const rowObj = {
        student_id: cleanValues[0] || "",
        full_name: cleanValues[1] || "",
        grade_level: cleanValues[2] || "",
        classroom: cleanValues[3] || "",
        no: cleanValues[4] || "",
        club_name: cleanValues[5] || "",
      };

      if (rowObj.full_name && rowObj.club_name) {
        rows.push(rowObj);
      }
    }

    return rows;
  };

  // ฟังก์ชันบันทึกข้อมูลเข้า Supabase (แบ่งทำเป็น Batch ละ 100 แถว)
  const handleImportToDatabase = async () => {
    if (previewData.length === 0) return;

    setUploading(true);

    try {
      const BATCH_SIZE = 100;
      let totalInserted = 0;

      for (let i = 0; i < previewData.length; i += BATCH_SIZE) {
        const chunk = previewData.slice(i, i + BATCH_SIZE);

        const { error } = await supabase.from("club_activities").insert(chunk);

        if (error) {
          throw new Error(error.message);
        }

        totalInserted += chunk.length;
      }

      Swal.fire({
        icon: "success",
        title: "นำเข้าข้อมูลสำเร็จ! 🎉",
        text: `นำเข้ารายชื่อนักเรียนชุมนุมจำนวน ${totalInserted} คน เรียบร้อยแล้ว`,
        confirmButtonColor: "#2563eb",
        customClass: { popup: "rounded-3xl font-sans" },
      });

      // ล้างค่าหลังจากนำเข้าสำเร็จ
      setFile(null);
      setPreviewData([]);
    } catch (err: any) {
      console.error("Import error:", err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาดในการบันทึก",
        text: err.message || "ไม่สามารถเพิ่มข้อมูลลงฐานข้อมูลได้",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 text-slate-800">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Bar */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <Link href="/teacher/club" className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1">
              <span>←</span> กลับหน้าเช็คชื่อชุมนุม
            </Link>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-2xl font-bold text-slate-900">📦 นำเข้ารายชื่อนักเรียนชุมนุม (CSV)</h1>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-full border border-purple-200">
                สำหรับผู้ดูแลระบบ / ครู
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              อัปโหลดไฟล์ .CSV จาก Google Sheets หรือ Excel เพื่อเพิ่มรายชื่อนักเรียนและชุมนุมเข้าสู่ระบบ
            </p>
          </div>
        </div>

        {/* Upload Box */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <span>📁</span> เลือกไฟล์ CSV รายชื่อนักเรียนชุมนุม (คอลัมน์ A - F)
          </h2>

          <div className="border-2 border-dashed border-purple-200 rounded-2xl p-8 text-center bg-purple-50/20 hover:bg-purple-50/40 transition-all space-y-3">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-file-input"
            />
            <label htmlFor="csv-file-input" className="cursor-pointer inline-flex flex-col items-center justify-center gap-2">
              <span className="text-4xl">📄</span>
              <span className="text-xs font-bold text-purple-700 hover:underline">
                {file ? file.name : "คลิกที่นี่เพื่อเลือกไฟล์ .CSV"}
              </span>
              <span className="text-[11px] text-slate-400">
                รองรับไฟล์ CSV (คอลัมน์: รหัสนักเรียน, ชื่อ-สกุล, ระดับชั้น, ห้อง, เลขที่, ชุมนุมที่สมัคร)
              </span>
            </label>
          </div>
        </div>

        {/* Data Preview Table */}
        {loading ? (
          <p className="text-xs text-center py-8 text-slate-400">กำลังอ่านข้อมูลจากไฟล์ CSV...</p>
        ) : previewData.length > 0 ? (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  🔍 ตัวอย่างข้อมูลที่จะนำเข้า ({previewData.length} รายการ)
                </h3>
                <p className="text-xs text-slate-500">ตรวจสอบความถูกต้องก่อนกดบันทึกเข้าสู่ระบบ</p>
              </div>

              <button
                onClick={handleImportToDatabase}
                disabled={uploading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <span>🚀</span>
                <span>{uploading ? "กำลังนำเข้าข้อมูล..." : `ยืนยันนำเข้า ${previewData.length} รายการ`}</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm max-h-96">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 font-bold text-slate-700 sticky top-0">
                  <tr>
                    <th className="p-3 text-center border-r border-slate-200 w-12">ลำดับ</th>
                    <th className="p-3 border-r border-slate-200">รหัสนักเรียน</th>
                    <th className="p-3 border-r border-slate-200">ชื่อ - สกุล</th>
                    <th className="p-3 text-center border-r border-slate-200">ระดับชั้น</th>
                    <th className="p-3 text-center border-r border-slate-200">ห้อง</th>
                    <th className="p-3 text-center border-r border-slate-200">เลขที่</th>
                    <th className="p-3 border-r border-slate-200">ชุมนุมที่สมัคร</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewData.map((row, idx) => (
                    <tr key={`preview-${idx}`} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center font-bold text-slate-400 border-r border-slate-100">{idx + 1}</td>
                      <td className="p-2.5 font-mono text-slate-600 border-r border-slate-100">{row.student_id}</td>
                      <td className="p-2.5 font-bold text-slate-900 border-r border-slate-100">{row.full_name}</td>
                      <td className="p-2.5 text-center text-slate-600 border-r border-slate-100">{row.grade_level}</td>
                      <td className="p-2.5 text-center text-slate-600 border-r border-slate-100">{row.classroom}</td>
                      <td className="p-2.5 text-center text-slate-600 border-r border-slate-100">{row.no}</td>
                      <td className="p-2.5 font-bold text-purple-700 border-r border-slate-100">{row.club_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

      </div>
    </div>
  );
}