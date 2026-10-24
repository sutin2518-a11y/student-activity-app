"use client";

import React, { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useUserRole } from "@/hooks/useUserRole";
import Swal from "sweetalert2";
import Papa from "papaparse";

export default function UniformImportClientView() {
  const { profile, loading: authLoading, isStudent } = useUserRole();
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [clearOldData, setClearOldData] = useState(false);
  
  // ใช้ useRef แทน document.getElementById
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🌟 ฟังก์ชันเมื่อเลือกไฟล์
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  // 🌟 ฟังก์ชันอ่านไฟล์ CSV ด้วย PapaParse
  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
      },
      error: (error) => {
        Swal.fire({
          icon: "error",
          title: "อ่านไฟล์ไม่สำเร็จ",
          text: error.message,
        });
      },
    });
  };

  // 🌟 ฟังก์ชันนำเข้าข้อมูลสู่ Supabase
  const handleImport = async () => {
    if (csvData.length === 0) {
      Swal.fire({ icon: "warning", title: "ไม่มีข้อมูล", text: "กรุณาเลือกไฟล์ CSV ก่อน" });
      return;
    }

    const confirm = await Swal.fire({
      title: `ยืนยันการนำเข้าข้อมูล?`,
      text: `พบข้อมูลนักเรียนทั้งหมด ${csvData.length} รายการ`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ใช่, นำเข้าเลย",
      cancelButtonText: "ยกเลิก",
      customClass: { popup: "rounded-3xl font-sans" },
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    Swal.fire({
      title: "กำลังนำเข้าข้อมูล...",
      text: "ระบบกำลังบันทึกข้อมูล กรุณารอสักครู่ (ห้ามปิดหน้านี้)",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
      customClass: { popup: "rounded-3xl font-sans" },
    });

    try {
      // 1. ลบข้อมูลเก่าหากมีการติ๊กเลือก
      if (clearOldData) {
        const { error: deleteErr } = await supabase
          .from("uniform_activities")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");

        if (deleteErr) throw new Error("ไม่สามารถลบข้อมูลเก่าได้: " + deleteErr.message);
      }

      // 2. แมปข้อมูลคอลัมน์จาก CSV ให้ตรงกับ Database
      const mappedData = csvData.map((row: any) => ({
        student_id_card: row["เลขประจำตัว"]?.toString().trim() || "",
        full_name: row["ชื่อ - สกุล"]?.trim() || "",
        activity_name: row["ชื่อกิจกรรม"]?.trim() || "",
        grade_level: row["ระดับชั้น"]?.trim() || "",
        classroom: row["ห้อง"]?.toString().trim() || "",
        no: row["เลขที่"]?.toString().trim() || "",
        gender: row["เพศ"]?.trim() || "",
        level_1: row["ระดับ 1"]?.trim() || "",
        level_2: row["ระดับ 2"]?.trim() || "",
        level_3: row["ระดับ 3"]?.trim() || "",
      }));

      // กรองแถวที่เลขประจำตัวว่างออก
      const validData = mappedData.filter((d) => d.student_id_card !== "");

      // 3. Batch Insert (ส่งข้อมูลทีละ 500 แถว)
      const chunkSize = 500;
      for (let i = 0; i < validData.length; i += chunkSize) {
        const chunk = validData.slice(i, i + chunkSize);
        const { error: insertErr } = await supabase.from("uniform_activities").insert(chunk);
        
        if (insertErr) {
          console.error("Insert Error Chunk:", insertErr);
          throw new Error("เกิดข้อผิดพลาดในการนำเข้าข้อมูล: " + insertErr.message);
        }
      }

      // 4. สำเร็จ
      Swal.fire({
        icon: "success",
        title: "นำเข้าสำเร็จ! 🎉",
        text: `บันทึกข้อมูลนักเรียน ${validData.length} รายการเข้าสู่ระบบเรียบร้อยแล้ว`,
        confirmButtonColor: "#2563eb",
        customClass: { popup: "rounded-3xl font-sans" },
      });
      
      setFile(null);
      setCsvData([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ไม่สามารถนำเข้าข้อมูลได้",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 font-sans">
        กำลังตรวจสอบสิทธิ์การใช้งาน...
      </div>
    );
  }

  if (!profile || isStudent) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4 font-sans">
        <div className="bg-rose-50 border border-rose-100 p-8 rounded-3xl text-center max-w-md">
          <div className="text-4xl mb-3">🚫</div>
          <h2 className="text-base font-bold text-rose-800">ปฏิเสธการเข้าถึง</h2>
          <p className="text-xs text-rose-600 mt-1">
            หน้านี้สำหรับคุณครูและผู้ดูแลระบบเท่านั้น
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 text-slate-800">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span>📥</span>
            <span>นำเข้าข้อมูลกิจกรรมในเครื่องแบบ (CSV)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            อัปโหลดไฟล์รายชื่อนักเรียนและสังกัด (กลุ่ม/กอง/หมู่) สำหรับ ลูกเสือ, เนตรนารี, ยุวกาชาด
          </p>
        </div>

        {/* ส่วนอัปโหลดไฟล์ */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          
          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl">
            <h3 className="text-sm font-bold text-blue-900 mb-2">📌 โครงสร้างหัวคอลัมน์ (Header) ที่ระบบต้องการ:</h3>
            <p className="text-xs text-blue-700 font-mono">
              เลขประจำตัว, ชื่อ - สกุล, ชื่อกิจกรรม, ระดับชั้น, ห้อง, เลขที่, เพศ, ระดับ 1, ระดับ 2, ระดับ 3
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                เลือกไฟล์ CSV ที่บันทึกมาจาก Excel
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all border border-slate-200 rounded-xl p-2 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="clearData"
                checked={clearOldData}
                onChange={(e) => setClearOldData(e.target.checked)}
                className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500 cursor-pointer"
              />
              <label htmlFor="clearData" className="text-xs font-bold text-rose-700 cursor-pointer">
                ลบข้อมูลกิจกรรมในเครื่องแบบเดิมในระบบทิ้งก่อนนำเข้า (แนะนำเมื่อเริ่มเทอมใหม่/ปีการศึกษาใหม่)
              </label>
            </div>
          </div>
        </div>

        {/* ตัวอย่างข้อมูล (Preview) */}
        {csvData.length > 0 && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  👀 ตัวอย่างข้อมูลก่อนนำเข้า
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  พบข้อมูลทั้งหมด <strong className="text-blue-600">{csvData.length}</strong> รายการ (แสดง 5 แถวแรก)
                </p>
              </div>
              
              <button
                onClick={handleImport}
                disabled={loading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <span>💾</span>
                <span>ยืนยันการนำเข้าข้อมูล</span>
              </button>
            </div>

            <div className="overflow-x-auto border rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b">
                    <th className="p-3 border-r">เลขประจำตัว</th>
                    <th className="p-3 border-r">ชื่อ - สกุล</th>
                    <th className="p-3 border-r">กิจกรรม</th>
                    <th className="p-3 border-r text-center">ชั้น/ห้อง</th>
                    <th className="p-3 border-r">ระดับ 1 (กลุ่ม)</th>
                    <th className="p-3 border-r">ระดับ 2 (กอง)</th>
                    <th className="p-3">ระดับ 3 (หมู่)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {csvData.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 border-r font-mono">{row["เลขประจำตัว"] || "-"}</td>
                      <td className="p-3 border-r">{row["ชื่อ - สกุล"] || "-"}</td>
                      <td className="p-3 border-r font-bold text-blue-700">{row["ชื่อกิจกรรม"] || "-"}</td>
                      <td className="p-3 border-r text-center">{row["ระดับชั้น"]}/{row["ห้อง"]}</td>
                      <td className="p-3 border-r">{row["ระดับ 1"] || "-"}</td>
                      <td className="p-3 border-r">{row["ระดับ 2"] || "-"}</td>
                      <td className="p-3">{row["ระดับ 3"] || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {csvData.length > 5 && (
              <p className="text-center text-xs text-slate-400">
                ... และข้อมูลอื่นๆ อีก {csvData.length - 5} รายการ
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}