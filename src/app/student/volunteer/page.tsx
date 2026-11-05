"use client";

import React, { useState, useEffect } from "react";
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
};

export default function StudentVolunteerPage() {
  const [studentIdCard, setStudentIdCard] = useState<string>("33077"); // รหัสทดสอบ
  const [studentName, setStudentName] = useState<string>("นายภัสกร จิตนาวาทิน");
  const [classroom, setClassroom] = useState<string>("ม.4/1");
  const [activities, setActivities] = useState<VolunteerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    date: "",
    hours: "",
    location: "",
  });

  // ฟังก์ชันคำนวณชั่วโมงตามกฎกิจกรรมกีฬาสี (เช้า-บ่าย)
  const calculateActivityHours = (dateStr: string) => {
    // วันที่ 5 (วันสุดท้าย 5 พ.ย. 2569): เช้า 30 นาที + บ่าย 30 นาที = 60 นาที (1.0 ชั่วโมง)
    if (dateStr === "2026-11-05") {
      return {
        hours: 1.0,
        title: "เข้าร่วมกิจกรรมกีฬาสี วันสุดท้าย (เช้า 30 นาที + บ่าย 30 นาที)",
      };
    } 
    // วันที่ 1 - 4 (1 - 4 พ.ย. 2569): เช้า 15 นาที + บ่าย 15 นาที = 30 นาที (0.5 ชั่วโมง)
    else if (["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"].includes(dateStr)) {
      return {
        hours: 0.5,
        title: "เข้าร่วมกิจกรรมกีฬาสี (เช้า 15 นาที + บ่าย 15 นาที)",
      };
    }
    
    // วันทั่วไปอื่นๆ
    return {
      hours: 0.5,
      title: "เข้าร่วมกิจกรรมเช็คชื่อประจำวัน",
    };
  };

  useEffect(() => {
    fetchStudentVolunteerData();
  }, [studentIdCard]);

  const fetchStudentVolunteerData = async () => {
    setLoading(true);

    // 1. ดึงข้อมูลชื่อนักเรียน
    const { data: studentData } = await supabase
      .from("student_database")
      .select("full_name, grade_level, classroom")
      .eq("student_id_card", studentIdCard)
      .maybeSingle();

    if (studentData) {
      setStudentName(studentData.full_name);
      setClassroom(`${studentData.grade_level}/${studentData.classroom}`);
    }

    // 2. ดึงประวัติการเช็คชื่อ
    const { data: attendanceRecords } = await supabase
      .from("attendance_records")
      .select("check_date, status, grade_level, classroom")
      .eq("student_id_card", studentIdCard)
      .order("check_date", { ascending: true });

    // 3. ดึงบันทึกจิตอาสาเสริมอื่นๆ
    const { data: volunteerLogs } = await supabase
      .from("student_volunteer_logs")
      .select("*")
      .eq("student_id_card", studentIdCard);

    let list: VolunteerItem[] = [];

    // คำนวณชั่วโมงการเช็คชื่อตามวันที่กำหนด
    if (attendanceRecords && attendanceRecords.length > 0) {
      attendanceRecords.forEach((att, index) => {
        if (att.status === "present") {
          const actInfo = calculateActivityHours(att.check_date);
          list.push({
            id: `att-${index}`,
            title: `${actInfo.title} (ห้อง ${att.grade_level}/${att.classroom})`,
            date: att.check_date,
            hours: actInfo.hours,
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
          location: log.location || "ชุมชน/โรงเรียน",
          status: (log.status as any) || "approved",
        });
      });
    }

    setActivities(list);
    setLoading(false);
  };

  const totalApprovedHours = activities
    .filter((a) => a.status === "approved")
    .reduce((sum, a) => sum + a.hours, 0);

  const targetHours = 20;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.date || !formData.hours) {
      Swal.fire("กรอกข้อมูลไม่ครบ", "โปรดระบุรายละเอียดให้ครบถ้วน", "warning");
      return;
    }

    const { error } = await supabase.from("student_volunteer_logs").insert([
      {
        student_id_card: studentIdCard,
        activity_name: formData.title,
        hours_earned: Number(formData.hours),
        earned_date: formData.date,
        location: formData.location || "โรงเรียนเชียงคำวิทยาคม",
        status: "pending",
      },
    ]);

    if (error) {
      const newItem: VolunteerItem = {
        id: Date.now(),
        title: formData.title,
        date: formData.date,
        hours: Number(formData.hours),
        location: formData.location || "โรงเรียนเชียงคำวิทยาคม",
        status: "pending",
      };
      setActivities([newItem, ...activities]);
    } else {
      fetchStudentVolunteerData();
    }

    setShowModal(false);
    setFormData({ title: "", date: "", hours: "", location: "" });
    Swal.fire({
      icon: "success",
      title: "ยื่นบันทึกสำเร็จ!",
      text: "ส่งเรื่องให้ครูตรวจสอบเรียบร้อยแล้ว",
      timer: 1500,
      showConfirmButton: false,
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* แถบเลือก/เปลี่ยนรหัสนักเรียนสำหรับทดสอบ */}
        <div className="bg-indigo-900 text-white p-4 rounded-2xl shadow-md flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔍</span>
            <div>
              <p className="text-xs font-bold text-indigo-200">ระบบทดสอบดึงข้อมูลนักเรียนรายบุคคล</p>
              <p className="text-sm font-black">{studentName} ({classroom})</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-bold text-indigo-200 whitespace-nowrap">รหัสประจำตัว:</label>
            <input
              type="text"
              value={studentIdCard}
              onChange={(e) => setStudentIdCard(e.target.value)}
              placeholder="กรอกรหัสประจำตัว"
              className="bg-white text-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold outline-none w-full sm:w-36 text-center shadow-inner"
            />
          </div>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
              🌱 กิจกรรมเพื่อสังคมและสาธารณประโยชน์
            </span>
            <h1 className="text-2xl font-black text-slate-800 mt-2">
              สรุปชั่วโมงจิตอาสาประจำตัวนักเรียน
            </h1>
            <p className="text-xs text-slate-500">โรงเรียนเชียงคำวิทยาคม</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
            >
              ← กลับหน้าหลัก
            </Link>
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-1.5"
            >
              <span>➕</span> เพิ่มบันทึกกิจกรรม
            </button>
          </div>
        </div>

        {/* บล็อกสรุปชั่วโมงสะสม */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
            <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider">
              ชั่วโมงจิตอาสาสะสมจริง
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-black">{totalApprovedHours}</span>
              <span className="text-sm font-semibold text-emerald-100">
                / {targetHours} ชั่วโมง
              </span>
            </div>
            <div className="w-full bg-emerald-950/40 rounded-full h-2.5 mt-4 overflow-hidden">
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
            <p className="text-xs text-emerald-600 font-bold mt-3">
              ✓ คำนวณเวลาตรงตามกฎกิจกรรมกีฬาสี
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
                      <td className="p-3.5 font-medium text-slate-800">{act.title}</td>
                      <td className="p-3.5 text-slate-500 text-xs">📍 {act.location}</td>
                      <td className="p-3.5 text-center text-slate-500 text-xs">{act.date}</td>
                      <td className="p-3.5 text-center font-bold text-emerald-700">
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

        {/* Modal เพิ่มบันทึก */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-lg font-bold text-slate-800">🌱 ยื่นบันทึกกิจกรรมจิตอาสา</h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 font-bold">✕</button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อกิจกรรม</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ช่วยงานจราจร, จิตอาสาพัฒนาวัด"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full border p-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">สถานที่</label>
                  <input
                    type="text"
                    placeholder="สถานที่จัดกิจกรรม"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full border p-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">วันที่</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full border p-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">จำนวนชั่วโมง</label>
                    <input
                      type="number"
                      required
                      min="0.5"
                      step="0.5"
                      placeholder="เช่น 0.5 หรือ 1"
                      value={formData.hours}
                      onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                      className="w-full border p-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs shadow-md"
                  >
                    บันทึกข้อมูล
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}