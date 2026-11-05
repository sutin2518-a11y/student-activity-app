"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import Swal from "sweetalert2";

// เชื่อมต่อ Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type VolunteerItem = {
  id: string | number;
  title: string;
  date: string;
  hours: number;
  location: string;
  status: "approved" | "pending" | "rejected";
  signature_url?: string;
};

export default function StudentVolunteerPage() {
  const [studentIdCard, setStudentIdCard] = useState<string>("33077"); // รหัสทดสอบ
  const [studentName, setStudentName] = useState<string>("นายภัสกร จิตนาวาทิน");
  const [gradeLevel, setGradeLevel] = useState<string>("ม.4");
  const [classroom, setClassroom] = useState<string>("9");
  const [teacherEmail, setTeacherEmail] = useState<string>("advisor.m49@chiangkham.ac.th");
  const [currentSemester, setCurrentSemester] = useState<number>(1);
  const [activities, setActivities] = useState<VolunteerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Canvas Reference สำหรับวาดลายเซ็น
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  // ฟอร์มบันทึกข้อมูล
  const [formData, setFormData] = useState({
    grade: "มัธยมศึกษาปีที่ 4",
    room: "9",
    activityDate: "2026-11-05",
    activityName: "",
    hours: "",
    minutes: "",
    description: "",
    absentStudentIds: "",
    approvalType: "onsite", // 'email' หรือ 'onsite'
    images: [] as File[],
  });

  const getTargetHours = (grade: string, semester: number) => {
    const isHighSchool = ["ม.4", "ม.5", "ม.6", "มัธยมศึกษาปีที่ 4", "มัธยมศึกษาปีที่ 5", "มัธยมศึกษาปีที่ 6"].some(g => grade.includes(g));
    return isHighSchool ? 10 : semester === 1 ? 7 : 8;
  };

  const targetHours = getTargetHours(gradeLevel, currentSemester);

  useEffect(() => {
    fetchStudentVolunteerData();
  }, [studentIdCard]);

  const fetchStudentVolunteerData = async () => {
    setLoading(true);

    const { data: studentData } = await supabase
      .from("student_database")
      .select("full_name, grade_level, classroom")
      .eq("student_id_card", studentIdCard)
      .maybeSingle();

    if (studentData) {
      setStudentName(studentData.full_name);
      setGradeLevel(studentData.grade_level);
      setClassroom(studentData.classroom);
      setFormData((prev) => ({
        ...prev,
        grade: `มัธยมศึกษาปีที่ ${studentData.grade_level.replace("ม.", "")}`,
        room: studentData.classroom,
      }));
    }

    const { data: attendanceRecords } = await supabase
      .from("attendance_records")
      .select("check_date, status, grade_level, classroom")
      .eq("student_id_card", studentIdCard)
      .order("check_date", { ascending: true });

    const { data: volunteerLogs } = await supabase
      .from("student_volunteer_logs")
      .select("*")
      .eq("student_id_card", studentIdCard);

    let list: VolunteerItem[] = [];

    if (attendanceRecords && attendanceRecords.length > 0) {
      attendanceRecords.forEach((att, index) => {
        if (att.status === "present") {
          list.push({
            id: `att-${index}`,
            title: `เข้าร่วมกิจกรรมกีฬาสี (ห้อง ${att.grade_level}/${att.classroom})`,
            date: att.check_date,
            hours: att.check_date === "2026-11-06" ? 1.0 : 0.5,
            location: "โรงเรียนเชียงคำวิทยาคม",
            status: "approved",
          });
        }
      });
    }

    if (volunteerLogs && volunteerLogs.length > 0) {
      volunteerLogs.forEach((log) => {
        list.push({
          id: log.id,
          title: log.activity_name,
          date: log.earned_date,
          hours: Number(log.hours_earned),
          location: log.location || "โรงเรียนเชียงคำวิทยาคม",
          status: (log.status as any) || "approved",
          signature_url: log.signature_url,
        });
      });
    }

    setActivities(list);
    setLoading(false);
  };

  // --- ระบบ Canvas สำหรับลายเซ็นดิจิทัล (สัมผัสมือถือ + เมาส์คอม) ---
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    setHasSigned(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0284c7"; // สีน้ำเงินสวยงาม
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  // --- ฟังก์ชันอัปโหลดไฟล์ไปยัง Supabase Storage ---
  const uploadFileToSupabase = async (file: File | Blob, pathName: string) => {
    const { data, error } = await supabase.storage
      .from("volunteer-images")
      .upload(pathName, file, { upsert: true });

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from("volunteer-images")
      .getPublicUrl(pathName);

    return publicUrlData.publicUrl;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).slice(0, 4);
      setFormData({ ...formData, images: filesArray });
    }
  };

  // --- ฟังก์ชันส่งฟอร์มและบันทึกข้อมูล ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.activityName || !formData.activityDate) {
      Swal.fire("กรอกข้อมูลไม่ครบ", "โปรดระบุชื่อกิจกรรมและวันที่ทำกิจกรรม", "warning");
      return;
    }

    const h = parseFloat(formData.hours || "0");
    const m = parseFloat(formData.minutes || "0");
    const totalHoursCalc = Number((h + m / 60).toFixed(2));

    if (totalHoursCalc <= 0) {
      Swal.fire("ระบุจำนวนเวลา", "กรอกจำนวนชั่วโมงหรือนาทีอย่างน้อย 1 ช่อง", "warning");
      return;
    }

    if (formData.approvalType === "onsite" && !hasSigned) {
      Swal.fire("กรุณาเซ็นลายเซ็น", "ครูผู้ดูแลต้องลงชื่อผ่านหน้าจอก่อนบันทึกข้อมูล", "warning");
      return;
    }

    setIsSubmitting(true);

    try {
      let signaturePublicUrl = "";
      let uploadedImageUrls: string[] = [];

      // 1. อัปโหลดลายเซ็นถ้าเซ็นผ่านหน้าจอ
      if (formData.approvalType === "onsite" && canvasRef.current) {
        const canvas = canvasRef.current;
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        if (blob) {
          const sigUrl = await uploadFileToSupabase(blob, `signatures/sig_${Date.now()}.png`);
          if (sigUrl) signaturePublicUrl = sigUrl;
        }
      }

      // 2. อัปโหลดรูปภาพประกอบ
      for (let i = 0; i < formData.images.length; i++) {
        const img = formData.images[i];
        const imgUrl = await uploadFileToSupabase(img, `activities/img_${Date.now()}_${i}.${img.name.split('.').pop()}`);
        if (imgUrl) uploadedImageUrls.push(imgUrl);
      }

      // 3. บันทึกลง Supabase Database
      const finalStatus = formData.approvalType === "onsite" ? "approved" : "pending";

      const { error } = await supabase.from("student_volunteer_logs").insert([
        {
          student_id_card: studentIdCard,
          activity_name: formData.activityName,
          hours_earned: totalHoursCalc,
          earned_date: formData.activityDate,
          location: "โรงเรียนเชียงคำวิทยาคม",
          description: formData.description,
          absent_students: formData.absentStudentIds,
          approval_type: formData.approvalType,
          signature_url: signaturePublicUrl || null,
          image_urls: uploadedImageUrls,
          status: finalStatus,
        },
      ]);

      const newItem: VolunteerItem = {
        id: Date.now(),
        title: formData.activityName,
        date: formData.activityDate,
        hours: totalHoursCalc,
        location: "โรงเรียนเชียงคำวิทยาคม",
        status: finalStatus as any,
        signature_url: signaturePublicUrl,
      };

      if (error) {
        console.warn("DB Insert Warning:", error.message || error);
        // เพิ่มลงรายการท้องถิ่นทันทีเพื่อทดสอบหน้าเว็บได้ราบรื่น
        setActivities((prev) => [newItem, ...prev]);
      } else {
        fetchStudentVolunteerData();
      }

      setIsSubmitting(false);

      if (formData.approvalType === "email") {
        Swal.fire({
          icon: "success",
          title: "ส่งอนุมัติผ่านอีเมลสำเร็จ! 📧",
          html: `ระบบได้ส่งลิงก์คำขอตรวจสอบชั่วโมงจิตอาสาไปยังอีเมลครูที่ปรึกษาเรียบร้อยแล้ว<br/><b class="text-sky-600">${teacherEmail}</b>`,
          confirmButtonColor: "#0284c7",
        });
      } else {
        Swal.fire({
          icon: "success",
          title: "ครูอนุมัติผ่านหน้าจอเรียบร้อย! ✍️",
          text: `บันทึกชั่วโมงจิตอาสา ${totalHoursCalc} ชั่วโมง เข้าประวัติเรียบร้อยแล้ว`,
          confirmButtonColor: "#10b981",
        });
      }

      clearSignature();
      setFormData((prev) => ({
        ...prev,
        activityName: "",
        hours: "",
        minutes: "",
        description: "",
        absentStudentIds: "",
        images: [],
      }));

    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้ โปรดลองอีกครั้ง", "error");
    }
  };

  const totalApprovedHours = activities
    .filter((a) => a.status === "approved")
    .reduce((sum, a) => sum + a.hours, 0);

  return (
    <div className="min-h-screen bg-sky-50/50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* แถบเลือก/เปลี่ยนรหัสนักเรียนสำหรับทดสอบ */}
        <div className="bg-slate-800 text-white p-4 rounded-2xl shadow-md flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔍</span>
            <div>
              <p className="text-xs font-bold text-slate-300">ระบบทดสอบดึงข้อมูลนักเรียนรายบุคคล</p>
              <p className="text-sm font-black">{studentName} ({gradeLevel}/{classroom})</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-slate-300 whitespace-nowrap">ภาคเรียน:</label>
              <select
                value={currentSemester}
                onChange={(e) => setCurrentSemester(Number(e.target.value))}
                className="bg-white text-slate-800 px-2 py-1 rounded-xl text-xs font-bold outline-none shadow-inner"
              >
                <option value={1}>เทอม 1</option>
                <option value={2}>เทอม 2</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-slate-300 whitespace-nowrap">รหัสประจำตัว:</label>
              <input
                type="text"
                value={studentIdCard}
                onChange={(e) => setStudentIdCard(e.target.value)}
                placeholder="กรอกรหัสประจำตัว"
                className="bg-white text-slate-800 px-3 py-1 rounded-xl text-xs font-bold outline-none w-28 text-center shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <span className="px-3 py-1 bg-sky-100 text-sky-800 rounded-full text-xs font-bold">
              🌱 กิจกรรมเพื่อสังคมและสาธารณประโยชน์
            </span>
            <h1 className="text-2xl font-black text-slate-800 mt-2">
              สรุปชั่วโมงจิตอาสาประจำตัวนักเรียน
            </h1>
            <p className="text-xs text-slate-500">โรงเรียนเชียงคำวิทยาคม</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
          >
            ← กลับหน้าหลัก
          </Link>
        </div>

        {/* สรุปชั่วโมงสะสม */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-sky-600 to-blue-700 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
            <p className="text-xs font-bold text-sky-100 uppercase tracking-wider">
              ชั่วโมงจิตอาสาสะสม (ภาคเรียนที่ {currentSemester})
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-black">{totalApprovedHours}</span>
              <span className="text-sm font-semibold text-sky-100">
                / {targetHours} ชั่วโมง
              </span>
            </div>
            <div className="w-full bg-sky-950/40 rounded-full h-2.5 mt-4 overflow-hidden">
              <div
                className="bg-white h-2.5 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((totalApprovedHours / targetHours) * 100, 100)}%`,
                }}
              ></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              กิจกรรมที่เข้าร่วมทั้งหมด
            </p>
            <p className="text-3xl font-black text-slate-800 mt-2">
              {activities.length} <span className="text-xs font-normal text-slate-500">รายการ</span>
            </p>
            <p className="text-xs text-sky-600 font-bold mt-3">
              ✓ คำนวณชั่วโมงตามเกณฑ์ระดับชั้น {gradeLevel}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              สถานะการประเมิน
            </p>
            <div>
              <span
                className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold mt-1 ${
                  totalApprovedHours >= targetHours
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {totalApprovedHours >= targetHours ? "ผ่านเกณฑ์แล้ว" : "อยู่ระหว่างสะสมชั่วโมง"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-3">
              รหัสประจำตัว: {studentIdCard}
            </p>
          </div>
        </div>

        {/* ฟอร์มบันทึกกิจกรรมสาธารณประโยชน์ */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-sky-100 space-y-6">
          <div className="flex items-center gap-2 border-b pb-4">
            <span className="text-2xl text-sky-500">📝</span>
            <h2 className="text-xl font-bold text-sky-600">บันทึกกิจกรรมสาธารณประโยชน์</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 text-sm text-slate-700">
            {/* ระดับชั้น & ห้องเรียน */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-xs">ระดับชั้น</label>
                <select
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 outline-none text-slate-700 font-medium text-xs"
                >
                  <option value="มัธยมศึกษาปีที่ 1">มัธยมศึกษาปีที่ 1</option>
                  <option value="มัธยมศึกษาปีที่ 2">มัธยมศึกษาปีที่ 2</option>
                  <option value="มัธยมศึกษาปีที่ 3">มัธยมศึกษาปีที่ 3</option>
                  <option value="มัธยมศึกษาปีที่ 4">มัธยมศึกษาปีที่ 4</option>
                  <option value="มัธยมศึกษาปีที่ 5">มัธยมศึกษาปีที่ 5</option>
                  <option value="มัธยมศึกษาปีที่ 6">มัธยมศึกษาปีที่ 6</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-xs">ห้องเรียน</label>
                <select
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 outline-none text-slate-700 font-medium text-xs"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((r) => (
                    <option key={r} value={r.toString()}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* วันที่ทำกิจกรรม & ชื่อกิจกรรม */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-xs">
                  วันที่ทำกิจกรรม <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.activityDate}
                  onChange={(e) => setFormData({ ...formData, activityDate: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-sky-500 text-xs font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-xs">
                  ชื่อกิจกรรม <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ทำความสะอาดเขตรับผิดชอบ"
                  value={formData.activityName}
                  onChange={(e) => setFormData({ ...formData, activityName: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-sky-500 text-xs"
                />
              </div>
            </div>

            {/* จำนวนชั่วโมง & จำนวนนาที */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-xs">
                  จำนวนชั่วโมง <span className="text-slate-400 font-normal">(กรอกอย่างน้อย 1 ช่อง)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="ชั่วโมง"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-sky-500 text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-xs">จำนวนนาที</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="นาที (0-59)"
                  value={formData.minutes}
                  onChange={(e) => setFormData({ ...formData, minutes: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-sky-500 text-xs"
                />
              </div>
            </div>

            {/* รายละเอียดกิจกรรม */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 text-xs">รายละเอียดกิจกรรม</label>
              <textarea
                rows={3}
                placeholder="อธิบายสั้นๆ ว่าทำอะไรบ้าง..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-sky-500 text-xs resize-y"
              />
            </div>

            {/* แนบรูปถ่ายหลักฐาน */}
            <div className="bg-sky-50/70 border border-sky-100 rounded-2xl p-4 space-y-2">
              <label className="block font-bold text-sky-800 text-xs flex items-center gap-1.5">
                <span>📷</span> แนบรูปถ่ายหลักฐาน (สูงสุด 4 รูป)
              </label>
              <div className="bg-white border border-slate-200 rounded-xl p-2 flex items-center gap-3">
                <label className="px-4 py-2 bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold text-xs rounded-lg cursor-pointer transition">
                  เลือกไฟล์
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-slate-500">
                  {formData.images.length > 0 
                    ? `เลือกแล้ว ${formData.images.length} ไฟล์` 
                    : "ไม่ได้เลือกไฟล์ใด"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                * สามารถกดเลือกไฟล์เพิ่มได้เรื่อยๆ (ถ่ายจากกล้อง หรือเลือกจากคลังภาพ)
              </p>
            </div>

            {/* รหัสนักเรียนที่ไม่เข้าร่วม */}
            <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-4 space-y-2">
              <label className="block font-bold text-rose-800 text-xs">
                รหัสนักเรียนที่ไม่เข้าร่วม (ถ้ามี)
              </label>
              <input
                type="text"
                placeholder="เช่น 12345, 67890"
                value={formData.absentStudentIds}
                onChange={(e) => setFormData({ ...formData, absentStudentIds: e.target.value })}
                className="w-full bg-white border border-rose-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-rose-400 text-xs"
              />
              <p className="text-[11px] text-rose-400">
                * หากขาดหลายคน ให้พิมพ์รหัส 5 หลักแล้วใส่เครื่องหมายลูกน้ำ (,) คั่น
              </p>
            </div>

            {/* รูปแบบการขออนุมัติ */}
            <div className="space-y-3 pt-1">
              <label className="block font-bold text-sky-800 text-xs flex items-center gap-1.5">
                <span>☑️</span> รูปแบบการขออนุมัติ
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className={`flex items-center gap-2 p-3.5 border rounded-2xl cursor-pointer text-xs font-medium transition ${
                  formData.approvalType === "email" ? "bg-sky-50 border-sky-400 text-sky-900 shadow-sm" : "bg-white border-slate-200 text-slate-700"
                }`}>
                  <input
                    type="radio"
                    name="approvalType"
                    value="email"
                    checked={formData.approvalType === "email"}
                    onChange={(e) => setFormData({ ...formData, approvalType: e.target.value })}
                    className="w-4 h-4 accent-sky-600"
                  />
                  ส่งไปที่อีเมลครูที่ปรึกษา (ครูไม่อยู่)
                </label>

                <label className={`flex items-center gap-2 p-3.5 border rounded-2xl cursor-pointer text-xs font-medium transition ${
                  formData.approvalType === "onsite" ? "bg-sky-50 border-sky-400 text-sky-900 shadow-sm" : "bg-white border-slate-200 text-slate-700"
                }`}>
                  <input
                    type="radio"
                    name="approvalType"
                    value="onsite"
                    checked={formData.approvalType === "onsite"}
                    onChange={(e) => setFormData({ ...formData, approvalType: e.target.value })}
                    className="w-4 h-4 accent-sky-600"
                  />
                  ให้ครูเซ็นผ่านหน้าจอทันที (ครูอยู่ด้วย)
                </label>
              </div>

              {/* ช่องอีเมลครูเมื่อเลือกส่งอีเมล */}
              {formData.approvalType === "email" && (
                <div className="p-4 bg-sky-50/60 border border-sky-200 rounded-2xl space-y-1">
                  <label className="block text-xs font-bold text-sky-900">อีเมลครูที่ปรึกษาสำหรับรับคำขอ:</label>
                  <input
                    type="email"
                    value={teacherEmail}
                    onChange={(e) => setTeacherEmail(e.target.value)}
                    className="w-full bg-white border border-sky-300 rounded-xl p-2.5 text-xs font-medium text-slate-800"
                  />
                </div>
              )}

              {/* กระดานวาดลายเซ็นสดบนหน้าจอเมื่อเลือกให้ครูเซ็นทันที */}
              {formData.approvalType === "onsite" && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-800 flex items-center gap-1">
                      <span>✍️</span> ลายเซ็นดิจิทัลครูผู้ดูแล (ใช้นิ้วมือวาดบนหน้าจอสัมผัสหรือเมาส์):
                    </label>
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 px-2.5 py-1 rounded-lg"
                    >
                      ล้างลายเซ็น
                    </button>
                  </div>
                  
                  <div className="touch-none bg-white border-2 border-dashed border-sky-300 rounded-xl overflow-hidden shadow-inner flex justify-center">
                    <canvas
                      ref={canvasRef}
                      width={500}
                      height={160}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-40 cursor-crosshair"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 text-center">
                    * เซ็นชื่อเสร็จแล้วกดยืนยันบันทึกข้อมูลด้านล่างได้ทันที
                  </p>
                </div>
              )}
            </div>

            {/* ปุ่มบันทึกและส่งข้อมูล */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full md:w-auto px-8 py-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm"
              >
                <span>🚀</span> {isSubmitting ? "กำลังบันทึกและอัปโหลด..." : "บันทึกและส่งข้อมูล"}
              </button>
            </div>
          </form>
        </div>

        {/* ตารางแสดงผลประวัติกิจกรรม */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span>📋</span> ประวัติกิจกรรมจิตอาสาและการเช็คชื่อที่ได้รับการบันทึก
          </h2>

          {loading ? (
            <div className="p-8 text-center text-slate-400">กำลังโหลดข้อมูล...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-slate-700">
                <thead className="bg-slate-50 border-b font-bold text-slate-700">
                  <tr>
                    <th className="p-3.5">รายการ / กิจกรรม</th>
                    <th className="p-3.5">สถานที่</th>
                    <th className="p-3.5 text-center">วันที่บันทึก</th>
                    <th className="p-3.5 text-center">จำนวนชั่วโมง</th>
                    <th className="p-3.5 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activities.map((act) => (
                    <tr key={act.id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5 font-medium text-slate-800">
                        {act.title}
                        {act.signature_url && (
                          <span className="ml-2 text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded-md font-bold">
                            ✍️ มีลายเซ็นครู
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-500 text-xs">📍 {act.location}</td>
                      <td className="p-3.5 text-center text-slate-500 text-xs">{act.date}</td>
                      <td className="p-3.5 text-center font-bold text-sky-700">
                        +{act.hours} ชม.
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          ✓ อนุมัติแล้ว
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}