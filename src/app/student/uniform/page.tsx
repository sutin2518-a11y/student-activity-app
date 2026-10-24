"use client";

import React, { useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import Swal from "sweetalert2";

// สร้าง Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function StudentUniformSetupPage() {
  const [studentIdCard, setStudentIdCard] = useState("");
  const [studentData, setStudentData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ค่ากิจกรรมที่เลือก/ดึงได้
  const [selectedActivity, setSelectedActivity] = useState<string>("");

  // ค่าระดับย่อยที่เลือก
  const [level1, setLevel1] = useState("");
  const [level2, setLevel2] = useState("");
  const [level3, setLevel3] = useState("");

  // กำหนดชื่อยศ/ระดับย่อย และคำนำหน้าดร็อปดาวน์ตามระเบียบกิจกรรม
  const getLevelConfig = (actName: string = "") => {
    const act = actName.toLowerCase();
    if (act.includes("ลูกเสือ") || act.includes("เนตรนารี")) {
      return {
        l1Name: "กลุ่ม",
        l1Prefix: "กลุ่มที่ ",
        l2Name: "กอง",
        l2Prefix: "กองที่ ",
        l3Name: "หมู่",
        l3Prefix: "หมู่ที่ ",
        hasL3: true,
      };
    }
    if (act.includes("ยุวกาชาด")) {
      return {
        l1Name: "หมู่",
        l1Prefix: "หมู่ที่ ",
        l2Name: "กลุ่ม",
        l2Prefix: "กลุ่มที่ ",
        l3Name: "หน่วย",
        l3Prefix: "หน่วยที่ ",
        hasL3: true,
      };
    }
    if (act.includes("ประโยชน์") || act.includes("บำเพ็ญ")) {
      return {
        l1Name: "หมวด",
        l1Prefix: "หมวดที่ ",
        l2Name: "หมู่",
        l2Prefix: "หมู่ที่ ",
        l3Name: "",
        l3Prefix: "",
        hasL3: false,
      };
    }
    return {
      l1Name: "ระดับ 1",
      l1Prefix: "ระดับ 1 - ",
      l2Name: "ระดับ 2",
      l2Prefix: "ระดับ 2 - ",
      l3Name: "ระดับ 3",
      l3Prefix: "ระดับ 3 - ",
      hasL3: true,
    };
  };

  // สร้างรายการดร็อปดาวน์ตัวเลือก (1 - 10)
  const generateOptions = (prefix: string, currentValue: string) => {
    const list = Array.from({ length: 10 }, (_, i) => `${prefix}${i + 1}`);
    if (currentValue && currentValue !== "EMPTY" && !list.includes(currentValue)) {
      list.push(currentValue);
    }
    return list;
  };

  // ค้นหารายชื่อนักเรียน
  const handleSearchStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentIdCard.trim()) return;

    setLoading(true);
    setStudentData(null);

    const term = studentIdCard.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term);

    let orCondition = `student_id_card.eq.${term},full_name.ilike.%${term}%`;
    if (isUuid) {
      orCondition += `,id.eq.${term}`;
    }

    const { data, error } = await supabase
      .from("uniform_activities")
      .select("*")
      .or(orCondition)
      .maybeSingle();

    if (error) {
      console.error("Error searching student:", error);
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาดในการค้นหา", text: error.message });
      setLoading(false);
      return;
    }

    if (data) {
      setStudentData(data);

      // ดึงชื่อกิจกรรมจาก DB อัตโนมัติ (หากไม่มีให้ตั้งเป็นเนตรนารี)
      const currentAct = data.activity_name && data.activity_name !== "EMPTY" ? data.activity_name : "เนตรนารี";
      setSelectedActivity(currentAct);

      setLevel1(data.level_1 && data.level_1 !== "EMPTY" ? data.level_1 : "");
      setLevel2(data.level_2 && data.level_2 !== "EMPTY" ? data.level_2 : "");
      setLevel3(data.level_3 && data.level_3 !== "EMPTY" ? data.level_3 : "");
    } else {
      Swal.fire({
        icon: "warning",
        title: "ไม่พบข้อมูลนักเรียน",
        text: `ไม่พบรายชื่อกิจกรรมเครื่องแบบที่ตรงกับ "${term}" กรุณาตรวจสอบรหัสอีกครั้ง`,
        confirmButtonColor: "#2563eb",
      });
    }

    setLoading(false);
  };

  // บันทึกข้อมูล
  const handleSaveLevels = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentData) return;

    setSaving(true);
    const config = getLevelConfig(selectedActivity);

    const payload: any = {
      activity_name: selectedActivity,
      level_1: level1 || "EMPTY",
      level_2: level2 || "EMPTY",
      level_3: config.hasL3 ? (level3 || "EMPTY") : "EMPTY",
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("uniform_activities")
      .update(payload)
      .eq("id", studentData.id);

    if (error) {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาดในการบันทึก", text: error.message });
    } else {
      Swal.fire({
        icon: "success",
        title: "บันทึกข้อมูลสำเร็จ! 🎉",
        text: `บันทึกข้อมูลสังกัดกิจกรรม ${selectedActivity} เรียบร้อยแล้ว`,
        confirmButtonColor: "#2563eb",
        customClass: { popup: "rounded-3xl font-sans" },
      });

      setStudentData({
        ...studentData,
        ...payload,
      });
    }

    setSaving(false);
  };

  const hasExistingActivity = studentData?.activity_name && studentData.activity_name !== "EMPTY";
  const config = getLevelConfig(selectedActivity);

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 text-slate-800">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header Bar */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <Link href="/student" className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1">
              <span>←</span> กลับหน้าหลักนักเรียน
            </Link>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-2xl font-bold text-slate-900">📝 จัดการสังกัดกิจกรรมเครื่องแบบ</h1>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-full border border-purple-200">
                สำหรับนักเรียน
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              ดึงข้อมูลกิจกรรมอัตโนมัติ และเลือกระบุสังกัดกลุ่ม กอง หมู่ หมวด ประจำปีการศึกษา
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <span>🔍</span> ค้นหารายชื่อนักเรียน
          </h2>

          <form onSubmit={handleSearchStudent} className="flex gap-2">
            <input
              type="text"
              placeholder="พิมพ์เลขประจำตัวประชาชน / รหัสนักเรียน / ชื่อ-สกุล..."
              value={studentIdCard}
              onChange={(e) => setStudentIdCard(e.target.value)}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
            >
              {loading ? "กำลังค้นหา..." : "ค้นหา"}
            </button>
          </form>
        </div>

        {/* Student Setup Form */}
        {studentData && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            
            {/* Profile Info Header */}
            <div className="p-5 bg-purple-50/60 rounded-2xl border border-purple-100 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-purple-950">{studentData.full_name}</h3>
                  <p className="text-xs text-purple-700 font-bold mt-0.5">
                    ระดับชั้น: ม.{studentData.grade_level}/{studentData.classroom || "-"}
                  </p>
                </div>
                <span className="px-3.5 py-1.5 bg-white text-purple-800 font-black text-xs rounded-xl border border-purple-200 shadow-sm">
                  ⚜️ {selectedActivity}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveLevels} className="space-y-5">
              
              {/* Section 1: แสดงข้อมูลกิจกรรม */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  กิจกรรมเครื่องแบบที่สังกัด
                </label>

                {hasExistingActivity ? (
                  <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 flex justify-between items-center">
                    <span>{selectedActivity}</span>
                    <span className="text-[11px] text-emerald-700 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                      ✓ ดึงข้อมูลจากระบบเรียบร้อย
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <select
                      value={selectedActivity}
                      onChange={(e) => {
                        setSelectedActivity(e.target.value);
                        setLevel1("");
                        setLevel2("");
                        setLevel3("");
                      }}
                      className="w-full px-4 py-2.5 border border-purple-300 rounded-xl text-xs font-bold text-purple-900 bg-purple-50/30 focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="เนตรนารี">เนตรนารี</option>
                      <option value="ยุวกาชาด">ยุวกาชาด</option>
                      <option value="ผู้บำเพ็ญประโยชน์">ผู้บำเพ็ญประโยชน์</option>
                      <option value="ลูกเสือ">ลูกเสือ</option>
                    </select>
                    <p className="text-[11px] text-amber-600 font-medium">
                      ⚠️ ยังไม่พบข้อมูลกิจกรรมในระบบ กรุณาเลือกรายวิชากิจกรรมของคุณ
                    </p>
                  </div>
                )}
              </div>

              {/* Section 2: เลือกสังกัดย่อย */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <span>⚙️</span> เลือกสังกัดย่อย ({selectedActivity})
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Level 1 Select */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {config.l1Name} <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={level1}
                      onChange={(e) => setLevel1(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                    >
                      <option value="">-- เลือก{config.l1Name} --</option>
                      {generateOptions(config.l1Prefix, level1).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Level 2 Select */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {config.l2Name} <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={level2}
                      onChange={(e) => setLevel2(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                    >
                      <option value="">-- เลือก{config.l2Name} --</option>
                      {generateOptions(config.l2Prefix, level2).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Level 3 Select */}
                  {config.hasL3 && (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {config.l3Name} <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={level3}
                        onChange={(e) => setLevel3(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                      >
                        <option value="">-- เลือก{config.l3Name} --</option>
                        {generateOptions(config.l3Prefix, level3).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center gap-2"
                >
                  <span>💾</span>
                  <span>{saving ? "กำลังบันทึกข้อมูล..." : "บันทึกข้อมูลสังกัดกิจกรรม"}</span>
                </button>
              </div>

            </form>

          </div>
        )}

      </div>
    </div>
  );
}