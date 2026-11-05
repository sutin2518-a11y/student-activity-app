"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";

// เชื่อมต่อ Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Student = {
  id: number;
  student_id_card: string;
  no: number;
  full_name: string;
  gender: string;
};

type AttendanceStatus = "present" | "absent" | "leave";

function AttendanceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeGrade, setActiveGrade] = useState<string>("ม.1");
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [checkDate, setCheckDate] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<{ [key: number]: AttendanceStatus }>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const grades = ["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"];

  useEffect(() => {
    setCheckDate(new Date().toISOString().split("T")[0]);
    const roomFromUrl = searchParams.get("room");
    if (roomFromUrl) {
      setSelectedRoom(roomFromUrl);
      const gradePart = roomFromUrl.split("/")[0];
      if (grades.includes(gradePart)) {
        setActiveGrade(gradePart);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedRoom && checkDate) {
      fetchStudents();
    } else {
      setStudents([]);
      setAttendance({});
    }
  }, [selectedRoom, checkDate]);

  const fetchStudents = async () => {
    setLoading(true);
    const [grade, room] = selectedRoom.split("/");

    const { data: studentData, error: studentError } = await supabase
      .from("student_database")
      .select("id, student_id_card, no, full_name, gender")
      .eq("grade_level", grade)
      .eq("classroom", room)
      .order("no", { ascending: true });

    if (studentError) {
      console.error("Error fetching students:", studentError);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด!",
        text: "ไม่สามารถดึงข้อมูลนักเรียนได้",
        confirmButtonColor: "#2563eb",
      });
      setLoading(false);
      return;
    }

    const currentStudents = studentData || [];

    const { data: savedRecords } = await supabase
      .from("attendance_records")
      .select("student_id_card, status")
      .eq("check_date", checkDate)
      .eq("grade_level", grade)
      .eq("classroom", room);

    const savedStatusMap: { [key: string]: AttendanceStatus } = {};
    if (savedRecords) {
      savedRecords.forEach((rec) => {
        savedStatusMap[rec.student_id_card] = rec.status as AttendanceStatus;
      });
    }

    const initialAttendance: { [key: number]: AttendanceStatus } = {};
    currentStudents.forEach((student) => {
      initialAttendance[student.id] = savedStatusMap[student.student_id_card] || "present";
    });

    setStudents(currentStudents);
    setAttendance(initialAttendance);
    setLoading(false);
  };

  const handleSelectRoom = (roomName: string) => {
    setSelectedRoom(roomName);
    router.push(`?room=${encodeURIComponent(roomName)}`);
  };

  const handleStatusChange = (studentId: number, status: AttendanceStatus) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSetAllStatus = (status: AttendanceStatus) => {
    const updatedAttendance: { [key: number]: AttendanceStatus } = {};
    students.forEach((student) => {
      updatedAttendance[student.id] = status;
    });
    setAttendance(updatedAttendance);
  };

  const handleSaveToDatabase = async () => {
    if (!students.length) {
      Swal.fire({
        icon: "warning",
        title: "แจ้งเตือน",
        text: "ไม่มีข้อมูลนักเรียนสำหรับบันทึก",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    setSaving(true);
    const [grade, room] = selectedRoom.split("/");

    const recordsToInsert = students.map((student) => ({
      student_id_card: student.student_id_card,
      full_name: student.full_name,
      grade_level: grade,
      classroom: room,
      check_date: checkDate,
      status: attendance[student.id] || "present",
    }));

    const { error } = await supabase
      .from("attendance_records")
      .upsert(recordsToInsert, { onConflict: "student_id_card,check_date" });

    setSaving(false);

    if (error) {
      console.error("Save error:", error);
      Swal.fire({
        icon: "error",
        title: "บันทึกไม่สำเร็จ!",
        text: "เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + error.message,
        confirmButtonColor: "#2563eb",
      });
    } else {
      Swal.fire({
        icon: "success",
        title: "บันทึกเรียบร้อย!",
        text: `บันทึกการเช็คชื่อห้อง ${selectedRoom} ประจำวันที่ ${checkDate} เรียบร้อยแล้ว`,
        timer: 2000,
        showConfirmButton: false,
      });
    }
  };

  const handleExportExcel = () => {
    if (!students.length) {
      Swal.fire({
        icon: "warning",
        title: "แจ้งเตือน",
        text: "ไม่มีข้อมูลนักเรียนสำหรับส่งออก",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    const [grade, room] = selectedRoom.split("/");
    const statusText: { [key in AttendanceStatus]: string } = {
      present: "มา",
      absent: "ขาด",
      leave: "ลา",
    };

    const exportData = students.map((student) => ({
      "ระดับชั้น": grade,
      "ห้อง": room,
      "เลขที่": student.no,
      "รหัสประจำตัว": student.student_id_card,
      "ชื่อ-นามสกุล": student.full_name,
      "เพศ": student.gender || "-",
      "วันที่เช็คชื่อ": checkDate,
      "สถานะการมาเรียน": statusText[attendance[student.id]] || "มา",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet["!cols"] = [
      { wch: 12 },
      { wch: 8 },
      { wch: 8 },
      { wch: 16 },
      { wch: 30 },
      { wch: 10 },
      { wch: 15 },
      { wch: 18 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `ห้อง ${selectedRoom.replace("/", "-")}`);

    const fileName = `รายงานการเช็คชื่อ_${selectedRoom.replace("/", "-")}_${checkDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="p-4 md:p-8 font-sans max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">✅ ระบบเช็คชื่อนักเรียน โรงเรียนเชียงคำวิทยาคม</h1>
          <p className="text-sm text-gray-500">เลือกระดับชั้นและห้องเรียนเพื่อดำเนินการเช็คชื่อประจำวัน</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link 
            href="/teacher/summary" 
            className="text-xs sm:text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-2 rounded-lg border border-indigo-200 transition flex items-center gap-1 shadow-sm"
          >
            📊 ดูสรุปรายวัน
          </Link>
          <div className="flex items-center gap-1.5">
            <label className="text-sm font-semibold text-gray-700">วันที่:</label>
            <input 
              type="date" 
              value={checkDate}
              onChange={(e) => setCheckDate(e.target.value)}
              className="border p-2 rounded-md outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium shadow-sm text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-4 md:p-5">
        <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">
          📌 ลิงก์ด่วนเลือกห้องเรียน
        </h2>

        <div className="flex gap-2 border-b pb-3 overflow-x-auto">
          {grades.map((grade) => (
            <button
              key={grade}
              onClick={() => setActiveGrade(grade)}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition whitespace-nowrap ${
                activeGrade === grade
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {grade}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2 mt-4">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((roomNum) => {
            const roomName = `${activeGrade}/${roomNum}`;
            const isSelected = selectedRoom === roomName;
            return (
              <button
                key={roomName}
                onClick={() => handleSelectRoom(roomName)}
                className={`py-2 px-1 rounded-md text-xs sm:text-sm font-semibold transition text-center border ${
                  isSelected
                    ? "bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-300"
                    : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600"
                }`}
              >
                ห้อง {roomNum}
              </button>
            );
          })}
        </div>
      </div>

      {selectedRoom ? (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
            <div>
              <span className="text-lg font-bold text-blue-900">กำลังเช็คชื่อ: {selectedRoom}</span>
              <span className="ml-3 text-xs bg-blue-200 text-blue-800 font-semibold px-2.5 py-1 rounded-full">
                {students.length} คน
              </span>
            </div>
            
            {students.length > 0 && (
              <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                <button
                  onClick={() => handleSetAllStatus("present")}
                  className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold px-3 py-2 rounded-lg shadow-sm transition"
                >
                  ✓ มาทั้งหมด
                </button>
                <button
                  onClick={() => handleSetAllStatus("absent")}
                  className="flex-1 sm:flex-none bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold px-3 py-2 rounded-lg shadow-sm transition"
                >
                  ✕ ขาดทั้งหมด
                </button>
                <button
                  onClick={() => handleSetAllStatus("leave")}
                  className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-semibold px-3 py-2 rounded-lg shadow-sm transition"
                >
                  ! ลาทั้งหมด
                </button>

                <button
                  onClick={handleExportExcel}
                  className="flex-1 sm:flex-none bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-lg shadow-md transition flex items-center justify-center gap-1.5"
                >
                  📊 ดาวน์โหลด Excel
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="bg-white rounded-xl p-12 text-center border text-gray-500">
              กำลังโหลดข้อมูลนักเรียนห้อง {selectedRoom}...
            </div>
          ) : students.length > 0 ? (
            <>
              <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
                <table className="w-full border-collapse text-left text-sm text-gray-700">
                  <thead className="bg-gray-50 border-b font-bold text-gray-700">
                    <tr>
                      <th className="p-3.5 text-center w-16">เลขที่</th>
                      <th className="p-3.5 text-center w-32">รหัสประจำตัว</th>
                      <th className="p-3.5 text-left">ชื่อ-นามสกุล</th>
                      <th className="p-3.5 text-center w-64">สถานะการมาเรียน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-blue-50/50 transition">
                        <td className="p-3.5 text-center font-bold text-gray-800">{student.no}</td>
                        <td className="p-3.5 text-center font-mono text-gray-500">{student.student_id_card}</td>
                        <td className="p-3.5 font-medium text-gray-900">{student.full_name}</td>
                        <td className="p-3.5 text-center">
                          <div className="flex justify-center gap-4">
                            <label className="cursor-pointer flex items-center gap-1.5 text-emerald-700 font-semibold">
                              <input
                                type="radio"
                                name={`status-${student.id}`}
                                value="present"
                                checked={attendance[student.id] === "present"}
                                onChange={() => handleStatusChange(student.id, "present")}
                                className="w-4 h-4 accent-emerald-600"
                              />
                              มา
                            </label>
                            <label className="cursor-pointer flex items-center gap-1.5 text-rose-600 font-semibold">
                              <input
                                type="radio"
                                name={`status-${student.id}`}
                                value="absent"
                                checked={attendance[student.id] === "absent"}
                                onChange={() => handleStatusChange(student.id, "absent")}
                                className="w-4 h-4 accent-rose-600"
                              />
                              ขาด
                            </label>
                            <label className="cursor-pointer flex items-center gap-1.5 text-amber-600 font-semibold">
                              <input
                                type="radio"
                                name={`status-${student.id}`}
                                value="leave"
                                checked={attendance[student.id] === "leave"}
                                onChange={() => handleStatusChange(student.id, "leave")}
                                className="w-4 h-4 accent-amber-500"
                              />
                              ลา
                            </label>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ปุ่มบันทึกลอยติดขอบล่าง (Sticky Floating Bottom Bar) */}
              <div className="sticky bottom-4 z-40 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-gray-200 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 mt-6">
                <div className="text-sm font-semibold text-gray-700 text-center sm:text-left">
                  📌 เช็คชื่อห้อง <span className="text-blue-600 font-bold">{selectedRoom}</span> ประจำวันที่ <span className="font-bold">{checkDate}</span> ({students.length} คน)
                </div>

                <button
                  onClick={handleSaveToDatabase}
                  disabled={saving}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:shadow-blue-200 transition transform active:scale-95 flex items-center justify-center gap-2 text-base disabled:opacity-50"
                >
                  {saving ? "⏳ กำลังบันทึก..." : "💾 บันทึกเข้าฐานข้อมูล"}
                </button>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl p-12 text-center border text-gray-500">
              ไม่พบข้อมูลนักเรียนในห้อง {selectedRoom}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-12 text-center border text-gray-400">
          👈 โปรดเลือกห้องเรียนจากลิงก์ด่วนด้านบนเพื่อเริ่มเช็คชื่อ
        </div>
      )}
    </div>
  );
}

export default function TeacherAttendancePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">กำลังโหลดระบบ...</div>}>
      <AttendanceContent />
    </Suspense>
  );
}