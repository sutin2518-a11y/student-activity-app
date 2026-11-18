"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";

export default function StudentVolunteerPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");

  // Form State
  const [activityName, setActivityName] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");

  const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbyh7rvOidqQd93BJ1hcbr2XTpApqBkYc-SG5V0aS76xV1njVdji9mu1vYKN1bRfv_vg/exec";

  useEffect(() => {
    fetchMyRecords();
  }, []);

  const fetchMyRecords = async () => {
    setLoading(true);
    setLoadError("");
    setStudentProfile(null);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("กรุณาเข้าสู่ระบบด้วยบัญชีนักเรียนก่อนใช้งาน");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, grade_level, classroom, full_name")
        .eq("id", user.id)
        .single();
      if (profileError || !profile) throw new Error("ไม่พบข้อมูลนักเรียนที่เชื่อมกับบัญชีนี้");
      if (profile.role !== "student") throw new Error("หน้านี้สำหรับบัญชีนักเรียนเท่านั้น");
      setStudentProfile(profile);

      const { data: history, error: historyError } = await supabase
        .from("volunteer_records")
        .select("id, activity_name, activity_date, hours, minutes, description, drive_url, status, created_at")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });
      if (historyError) throw new Error(`อ่านประวัติจิตอาสาไม่สำเร็จ: ${historyError.message}`);
      setRecords(history ?? []);
    } catch (error) {
      setRecords([]);
      setLoadError(error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลจิตอาสาได้");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const convertBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onload = () => {
        const base64 = (fileReader.result as string).split(",")[1];
        resolve(base64);
      };
      fileReader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("กรุณาเข้าสู่ระบบก่อนบันทึกกิจกรรม");
      // เป็นเพียงการตรวจใน UI: สิทธิ์จริงต้องบังคับด้วย RLS ที่ Supabase
      if (!studentProfile || studentProfile.id !== user.id || studentProfile.role !== "student") {
        throw new Error("ไม่พบข้อมูลนักเรียนที่เข้าสู่ระบบ กรุณาโหลดหน้าใหม่");
      }

      const safeHours = Number(hours);
      const safeMinutes = Number(minutes);
      if (
        !activityName.trim() || !activityDate ||
        !Number.isInteger(safeHours) || !Number.isInteger(safeMinutes) ||
        safeHours < 0 || safeHours > 24 || safeMinutes < 0 || safeMinutes > 59 ||
        (safeHours === 0 && safeMinutes === 0) ||
        safeHours * 60 + safeMinutes > 24 * 60
      ) {
        throw new Error("กรุณากรอกชื่อกิจกรรม วันที่ และเวลาให้ถูกต้อง (ไม่เกิน 24 ชั่วโมง)");
      }

      let uploadedDriveUrl = "";
      if (selectedFile) {
        if (!selectedFile.type.startsWith("image/") || selectedFile.size > 5 * 1024 * 1024) {
          throw new Error("แนบได้เฉพาะไฟล์รูปภาพขนาดไม่เกิน 5 MB");
        }
        try {
          const base64Data = await convertBase64(selectedFile);
          const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify({
              fileData: base64Data,
              fileName: `volunteer_${Date.now()}_${selectedFile.name}`,
              mimeType: selectedFile.type,
            }),
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const result = await response.json();
          if (result?.status !== "success" || typeof result.url !== "string" ||
            !/^https:\/\//.test(result.url)) {
            throw new Error("ปลายทางไม่ยืนยันลิงก์รูปภาพ");
          }
          uploadedDriveUrl = result.url;
        } catch (uploadError) {
          console.error("Volunteer evidence upload failed", uploadError);
          throw new Error("อัปโหลดหลักฐานไม่สำเร็จ จึงยังไม่ได้บันทึกกิจกรรม กรุณาลองอีกครั้ง");
        }
      }

      const { error } = await supabase.from("volunteer_records").insert([{
        student_id: user.id,
        activity_name: activityName.trim(),
        activity_date: activityDate,
        hours: safeHours,
        minutes: safeMinutes,
        drive_url: uploadedDriveUrl,
        description: description.trim(),
        status: "PENDING", // นักเรียนไม่สามารถอนุมัติชั่วโมงของตนเองได้จากหน้าเว็บนี้
      }]);
      if (error) throw new Error(`บันทึกข้อมูลไม่สำเร็จ: ${error.message}`);

      await Swal.fire({
        icon: "success", title: "ส่งกิจกรรมให้ครูตรวจแล้ว",
        text: selectedFile
          ? "บันทึกกิจกรรมและหลักฐานสำเร็จ สถานะรอครูตรวจอนุมัติ"
          : "บันทึกกิจกรรมสำเร็จ สถานะรอครูตรวจอนุมัติ (ไม่ได้แนบรูปภาพ)",
        confirmButtonColor: "#2563eb",
      });
      setActivityName("");
      setActivityDate("");
      setHours(1);
      setMinutes(0);
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setDescription("");
      await fetchMyRecords();
    } catch (error) {
      await Swal.fire({
        icon: "error", title: "บันทึกไม่สำเร็จ",
        text: error instanceof Error ? error.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ",
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // 🌟 คำนวณชั่วโมงรวมที่อนุมัติแล้ว + ประเมินผล ผ/มผ
  const totalApprovedMinutes = records
    .filter((r) => r.status === "APPROVED")
    .reduce((sum, r) => sum + (r.hours || 0) * 60 + (r.minutes || 0), 0);

  const displayHours = Math.floor(totalApprovedMinutes / 60);
  const displayMins = totalApprovedMinutes % 60;

  // ตรวจสอบเกณฑ์: ม.ต้น = 8 ชม. (480 นาที) / ม.ปลาย = 10 ชม. (600 นาที)
  const isJunior = ["ม.1", "ม.2", "ม.3", "1", "2", "3"].includes(
    studentProfile?.grade_level?.trim()
  );
  const requiredHours = isJunior ? 8 : 10;
  const requiredMinutes = requiredHours * 60;
  const isPass = totalApprovedMinutes >= requiredMinutes; // ใช้แสดงความคืบหน้าเบื้องต้นเท่านั้น
  const progressPercent = Math.min(
    100,
    Math.round((totalApprovedMinutes / requiredMinutes) * 100)
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 text-slate-800">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header และการ์ดสรุปผลการประเมิน ผ / มผ */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">🤝 บันทึกชั่วโมงจิตอาสา</h1>
              <p className="text-xs text-slate-500 mt-1">
                ระดับชั้น ม.{studentProfile?.grade_level?.replace(/^ม\./, "")}/{studentProfile?.classroom} | เป้าหมายเบื้องต้น: {requiredHours} ชั่วโมง (รอยืนยันเกณฑ์ประเมิน)
              </p>
            </div>

            {/* ป้ายประเมินผล ผ / มผ */}
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border w-full md:w-auto justify-between md:justify-end">
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase">สะสมอนุมัติ</p>
                <p className="text-lg font-bold text-slate-800">
                  {displayHours} <span className="text-xs font-normal">ชม.</span> {displayMins} <span className="text-xs font-normal">นาที</span>
                </p>
              </div>
              <div
                className={`px-4 py-2 rounded-xl text-center border font-black text-lg shadow-sm ${
                  isPass
                    ? "bg-emerald-500 text-white border-emerald-600"
                    : "bg-rose-500 text-white border-rose-600"
                }`}
              >
                {isPass ? "ถึงเป้า*" : "สะสม*"}
              </div>
            </div>
          </div>

          {/* Progress Bar แสดงเป้าหมาย */}
          <div className="space-y-1.5 pt-2 border-t">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-600">
                ความคืบหน้าสะสมชั่วโมงจิตอาสา ({progressPercent}%)
              </span>
              <span className={isPass ? "text-emerald-600" : "text-amber-600"}>
                {isPass
                  ? "ถึงเป้าหมายชั่วโมงเบื้องต้นแล้ว"
                  : `ยังขาด ${Math.ceil((requiredMinutes - totalApprovedMinutes) / 60)} ชม. ตามเป้าหมายเบื้องต้น`}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border">
              <div
                className={`h-full transition-all duration-500 ${
                  isPass ? "bg-emerald-500" : "bg-amber-500"
                }`}
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
          <p className="text-xs text-amber-700 bg-amber-50 rounded-xl p-3 border border-amber-200">
            * ชั่วโมงที่แสดงเป็นยอดรวมรายการอนุมัติที่มีอยู่ทั้งหมด ยังไม่ใช่ผลประเมิน ผ/มผ อย่างเป็นทางการ
            เพราะฐานข้อมูลเดิมยังไม่มีปีการศึกษาและภาคเรียน กรุณารอการปรับเกณฑ์และแยกภาคเรียนก่อนออกผลประเมิน
          </p>
          {loadError && (
            <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 border border-rose-200">
              {loadError} <a href="/login" className="underline font-semibold">เข้าสู่ระบบ</a>
              <button type="button" onClick={fetchMyRecords} className="ml-3 underline">ลองใหม่</button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* ฟอร์มกรอกกิจกรรม */}
          <div className="md:col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-fit space-y-4">
            <h2 className="font-bold text-slate-900 text-base">＋ บันทึกกิจกรรมใหม่</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อกิจกรรม / งานที่ทำ</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ทำความสะอาดห้องเรียน"
                  value={activityName}
                  onChange={(e) => setActivityName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">วันที่ทำกิจกรรม</label>
                <input
                  type="date"
                  required
                  value={activityDate}
                  onChange={(e) => setActivityDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">จำนวนชั่วโมง</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    required
                    value={hours}
                    onChange={(e) => setHours(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">จำนวนนาที</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    step="5"
                    required
                    value={minutes}
                    onChange={(e) => setMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">📷 แนบรูปภาพกิจกรรม</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-2 py-1.5 border rounded-xl text-xs bg-slate-50 cursor-pointer"
                />
                {previewUrl && (
                  <div className="mt-2 relative">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-xl border border-slate-200"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">รายละเอียดสังเขป</label>
                <textarea
                  rows={2}
                  placeholder="อธิบายสิ่งที่ได้ปฏิบัติ..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || loading || !!loadError || !studentProfile}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                {submitting ? "กำลังบันทึก..." : "ส่งขออนุมัติ"}
              </button>
            </form>
          </div>

          {/* ประวัติการส่งขออนุมัติ */}
          <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-900 text-base">📋 ประวัติการส่งขออนุมัติ</h2>
            {loading ? (
              <p className="text-xs text-slate-400 text-center py-8">กำลังโหลดข้อมูล...</p>
            ) : records.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">ยังไม่มีประวัติการทำกิจกรรมจิตอาสา</p>
            ) : (
              <div className="space-y-3">
                {records.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex justify-between items-center gap-3"
                  >
                    <div className="flex gap-3 items-center">
                      {r.drive_url && (
                        <img
                          src={r.drive_url}
                          alt="Activity"
                          className="w-14 h-14 object-cover rounded-xl border border-slate-200 shrink-0"
                        />
                      )}
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-800 text-sm">{r.activity_name}</p>
                        <p className="text-[11px] text-slate-500">{r.description || "-"}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span>📅 {new Date(r.activity_date).toLocaleDateString("th-TH")}</span>
                          <span>•</span>
                          <span className="font-bold text-emerald-700">
                            ⏱️ {r.hours || 0} ชม. {r.minutes || 0} นาที
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {r.status === "PENDING" && (
                        <span className="px-2.5 py-1 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-lg">
                          ⏳ รอตรวจสอบ
                        </span>
                      )}
                      {r.status === "APPROVED" && (
                        <span className="px-2.5 py-1 text-[10px] font-bold bg-green-100 text-green-700 rounded-lg">
                          ✅ อนุมัติ
                        </span>
                      )}
                      {r.status === "REJECTED" && (
                        <span className="px-2.5 py-1 text-[10px] font-bold bg-red-100 text-red-700 rounded-lg">
                          ❌ ไม่อนุมัติ
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}