"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";


// อ่านประวัติแบบแบ่งหน้า เพื่อไม่ให้การนับสะสมขาดข้อมูลเมื่อมีมากกว่า 1,000 แถว
async function readAttendanceHistory(activityType: string, activityId: string) {
  const result: Array<{ student_key: string; attendance_date: string; status: string; evaluation: string | null }> = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("attendance_records")
      .select("student_key, attendance_date, status, evaluation")
      .eq("activity_type", activityType)
      .eq("activity_id", activityId)
      .order("attendance_date", { ascending: false })
      .order("student_key", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`อ่านประวัติเช็คชื่อไม่ได้: ${error.message}`);
    result.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return result;
}

const VALID_STATUSES = new Set(["มา", "ลา", "ป่วย", "ขาด"]);

export default function TeacherClubPage() {
  const [searchTeacher, setSearchTeacher] = useState("");
  const [teacherDatalist, setTeacherDatalist] = useState<string[]>([]);
  const [assignedClubs, setAssignedClubs] = useState<any[]>([]);
  const [selectedClub, setSelectedClub] = useState<any | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceDate, setAttendanceDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [loadError, setLoadError] = useState("");
  const loadRequestId = useRef(0);

  // ตัวกรองระดับชั้น (ม.1 - ม.6)
  const [activeGradeFilter, setActiveGradeFilter] = useState<string>("ALL");

  const [attendanceStatus, setAttendanceStatus] = useState<{ [key: string]: string }>({});
  const [evaluations, setEvaluations] = useState<{ [key: string]: string }>({});
  const [historyPresentMap, setHistoryPresentMap] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    setAttendanceDate(todayStr);
    loadTeacherDatalist();
    autoFetchLoggedInTeacher(todayStr);
  }, []);

  // ดึงรายชื่อครูจากตาราง activities
  const loadTeacherDatalist = async () => {
    const { data } = await supabase
      .from("activities")
      .select("teacher_name")
      .limit(1000);

    if (data) {
      const namesSet = new Set<string>();
      data.forEach((item: any) => {
        if (item.teacher_name && item.teacher_name !== "EMPTY") {
          // รองรับกรณีมีครูหลายคนในช่องเดียว (แยกด้วยเครื่องหมายจุลภาค)
          const names = item.teacher_name.split(",").map((n: string) => n.trim());
          names.forEach((n: string) => namesSet.add(n));
        }
      });
      setTeacherDatalist(Array.from(namesSet));
    }
  };

  const autoFetchLoggedInTeacher = async (dateStr: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        let tName = user.user_metadata?.full_name || user.user_metadata?.name || "";

        if (!tName) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .maybeSingle();

          if (prof?.full_name) tName = prof.full_name;
        }

        if (tName) {
          setSearchTeacher(tName);
          await fetchClubsByName(tName, dateStr);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
    setLoading(false);
  };

  // ค้นหาชุมนุมจากตาราง activities ตามชื่อครู
  const fetchClubsByName = async (teacherName: string, dateStr: string) => {
    if (!teacherName.trim()) {
      setAssignedClubs([]);
      setSelectedClub(null);
      setStudents([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const { data: allActivities, error } = await supabase
        .from("activities")
        .select("*")
        .limit(1000);

      if (error) {
        console.error("Error from activities table:", error.message);
        setLoading(false);
        return;
      }

      const keyword = teacherName.trim().toLowerCase();
      const matched = (allActivities || []).filter((item: any) =>
        String(item.teacher_name || "").toLowerCase().includes(keyword)
      );

      if (matched.length > 0) {
        const uniqueList = matched.map((item: any) => ({
          id: `CLUB_${item.id}`,
          club_name: item.title,
          teacher_name: item.teacher_name,
        }));

        setAssignedClubs(uniqueList);

        if (uniqueList.length > 0) {
          setSelectedClub(uniqueList[0]);
          await loadClubStudents(uniqueList[0].club_name, dateStr);
        } else {
          setSelectedClub(null);
          setStudents([]);
        }
      } else {
        setAssignedClubs([]);
        setSelectedClub(null);
        setStudents([]);
      }
    } catch (err) {
      console.error("Search clubs exception:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTeacher(val);
    if (val.trim().length >= 2) {
      fetchClubsByName(val, attendanceDate);
    } else if (val.trim().length === 0) {
      setAssignedClubs([]);
      setSelectedClub(null);
      setStudents([]);
      setHasSearched(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchClubsByName(searchTeacher, attendanceDate);
  };

  // รายชื่อชุมนุมจาก club_activities (ตามระบบเดิม) และประวัติจาก attendance_records
  const loadClubStudents = async (clubName: string, dateStr: string) => {
    const requestId = ++loadRequestId.current;
    setLoading(true);
    setLoadError("");
    setStudents([]);
    setAttendanceStatus({});
    setEvaluations({});
    setHistoryPresentMap({});
    setActiveGradeFilter("ALL");

    try {
      const { data, error: rosterError } = await supabase
        .from("club_activities")
        .select("*")
        .eq("club_name", clubName)
        .limit(1000)
        .order("grade_level", { ascending: true })
        .order("classroom", { ascending: true })
        .order("no", { ascending: true });
      if (rosterError) throw new Error(`อ่านรายชื่อชุมนุมไม่ได้: ${rosterError.message}`);

      const formatted = (data || []).map((s: any, idx: number) => ({
        // ไม่ใช้ id ของแถวฐานข้อมูลแทนรหัสนักเรียน เพราะจะบันทึกประวัติผิดคน
        id: String(s.student_id ?? "").trim(),
        rowKey: `club-student-${s.id || s.student_id || idx}-${idx}`,
        no: s.no || idx + 1,
        name: s.full_name || "ไม่ระบุชื่อ",
        grade: String(s.grade_level || "").replace(/^ม\./, "").trim(),
        room: s.classroom || "-",
      }));
      if (formatted.some(s => !s.id)) {
        throw new Error("พบรายชื่อชุมนุมที่ไม่มีรหัสนักเรียน กรุณาตรวจข้อมูลใน club_activities ก่อนเช็คชื่อ");
      }

      const activityKey = `CLUB_${clubName}`;
      const history = await readAttendanceHistory("CLUB", activityKey);
      if (requestId !== loadRequestId.current) return false;

      const pastDates = new Map<string, Set<string>>();
      const today = new Map<string, (typeof history)[number]>();
      for (const record of history) {
        const id = String(record.student_key || "").trim();
        if (record.attendance_date === dateStr) {
          if (!today.has(id)) today.set(id, record);
        } else if (record.status === "มา") {
          if (!pastDates.has(id)) pastDates.set(id, new Set());
          pastDates.get(id)!.add(record.attendance_date);
        }
      }
      const counts: Record<string, number> = {};
      const statuses: Record<string, string> = {};
      const evals: Record<string, string> = {};
      for (const s of formatted) {
        const savedToday = today.get(s.id);
        // ไม่มีบันทึกในวันนั้น = ยังไม่เช็คชื่อ ไม่ใช่ "มา"
        const status = savedToday?.status || "";
        const past = pastDates.get(s.id)?.size || 0;
        counts[s.id] = past;
        statuses[s.id] = VALID_STATUSES.has(status) ? status : "";
        const total = past + (status === "มา" ? 1 : 0);
        evals[s.id] = savedToday?.evaluation || (total >= 14 ? "ผ" : "มผ");
      }
      setHistoryPresentMap(counts);
      setAttendanceStatus(statuses);
      setEvaluations(evals);
      setStudents(formatted);
      return true;
    } catch (err) {
      if (requestId === loadRequestId.current) {
        setLoadError(err instanceof Error ? err.message : "ไม่สามารถโหลดข้อมูลเช็คชื่อได้");
      }
      return false;
    } finally {
      if (requestId === loadRequestId.current) setLoading(false);
    }
  };

  const handleDateChange = (newDate: string) => {
    if (!newDate) return;
    setAttendanceDate(newDate);
    if (selectedClub) {
      loadClubStudents(selectedClub.club_name, newDate);
    }
  };

  const handleStatusChange = (studentId: string, newStatus: string) => {
    setAttendanceStatus((prevSt) => {
      const nextSt = { ...prevSt, [studentId]: newStatus };

      const pastCount = historyPresentMap[studentId] || 0;
      const totalPresent = pastCount + (newStatus === "มา" ? 1 : 0);
      const autoEval = totalPresent >= 14 ? "ผ" : "มผ";

      setEvaluations((prevEv) => ({
        ...prevEv,
        [studentId]: autoEval,
      }));

      return nextSt;
    });
  };

  const handleMarkAllPresent = () => {
    const updatedSt: any = { ...attendanceStatus };
    const updatedEv: any = { ...evaluations };

    displayedStudents.forEach((s) => {
      updatedSt[s.id] = "มา";
      const pastCount = historyPresentMap[s.id] || 0;
      const totalPresent = pastCount + 1;
      updatedEv[s.id] = totalPresent >= 14 ? "ผ" : "มผ";
    });

    setAttendanceStatus(updatedSt);
    setEvaluations(updatedEv);
  };

  const handleSaveAttendance = async () => {
    if (!selectedClub || !attendanceDate || students.length === 0 || loadError || loading || savingAttendance) return;

    const marked = students.filter(s => VALID_STATUSES.has(attendanceStatus[s.id]));
    if (marked.length === 0) {
      await Swal.fire({ icon: "warning", title: "ยังไม่ได้เช็คชื่อ", text: "กรุณาเลือกสถานะนักเรียนก่อนกดบันทึก" });
      return;
    }
    if (marked.length < students.length) {
      const confirm = await Swal.fire({
        icon: "question", title: "มีนักเรียนที่ยังไม่ได้เช็คชื่อ",
        text: `เช็คแล้ว ${marked.length} จาก ${students.length} คน ระบบจะบันทึกเฉพาะคนที่เช็คแล้วเท่านั้น`,
        showCancelButton: true, confirmButtonText: "บันทึกเฉพาะที่เช็คแล้ว", cancelButtonText: "กลับไปเช็คชื่อ",
      });
      if (!confirm.isConfirmed) return;
    }

    const payload = Array.from(new Map(marked.map(s => [s.id, {
      activity_type: "CLUB",
      activity_id: `CLUB_${selectedClub.club_name}`,
      student_key: s.id,
      attendance_date: attendanceDate,
      status: attendanceStatus[s.id],
      evaluation: evaluations[s.id] || "มผ",  // เกณฑ์เดิม 14 ครั้ง ยังไม่เปลี่ยนโดยไม่รับรองระเบียบ
      updated_at: new Date().toISOString(),
    }])).values());

    setSavingAttendance(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("กรุณาเข้าสู่ระบบก่อนบันทึกการเช็คชื่อ");
      const { error } = await supabase
        .from("attendance_records")
        .upsert(payload, { onConflict: "activity_type,activity_id,student_key,attendance_date" });
      if (error) throw new Error(error.message);

      const verified = await loadClubStudents(selectedClub.club_name, attendanceDate); // อ่านจากฐานข้อมูลอีกครั้งเพื่อยืนยันการทำงาน
      if (!verified) {
        await Swal.fire({ icon: "warning", title: "บันทึกแล้ว แต่ยังตรวจสอบผลไม่ได้", text: "ฐานข้อมูลตอบรับการบันทึก แต่การโหลดข้อมูลกลับล้มเหลว โปรดตรวจสอบก่อนบันทึกซ้ำ" });
        return;
      }
      await Swal.fire({
        icon: "success", title: "บันทึกเช็คชื่อสำเร็จ",
        text: `บันทึกกิจกรรมชุมนุม ${marked.length} คน ประจำวันที่ ${attendanceDate}`,
        confirmButtonColor: "#2563eb",
      });
    } catch (err) {
      await Swal.fire({
        icon: "error", title: "บันทึกไม่สำเร็จ",
        text: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
      });
    } finally {
      setSavingAttendance(false);
    }
  };

  const displayedStudents = students.filter((s) => {
    if (activeGradeFilter === "ALL") return true;
    return `ม.${s.grade}` === activeGradeFilter || s.grade === activeGradeFilter;
  });

  const presentCount = displayedStudents.filter((s) => attendanceStatus[s.id] === "มา").length;
  const leaveCount = displayedStudents.filter((s) => attendanceStatus[s.id] === "ลา" || attendanceStatus[s.id] === "ป่วย").length;
  const absentCount = displayedStudents.filter((s) => attendanceStatus[s.id] === "ขาด").length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Bar */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <Link href="/teacher" className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1">
              <span>←</span> กลับเมนูหลัก
            </Link>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-2xl font-bold text-slate-900">🧩 เช็คชื่อกิจกรรมชุมนุม</h1>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-full border border-purple-200">
                ระดับชั้น ม.1 - ม.6
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              จัดการเวลาเรียนกิจกรรมชุมนุมประจำสัปดาห์ (เกณฑ์เดิม 14 ครั้งจาก 18 ครั้ง (77.8%) — โปรดตรวจระเบียบก่อนปรับเกณฑ์)
            </p>
          </div>
        </div>

        {/* Search Component */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <span>🔍</span> ค้นหากิจกรรมชุมนุมของคุณครู
          </h2>

          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="text"
              list="teacher-names-list"
              placeholder="พิมพ์ชื่อ-สกุล คุณครู..."
              value={searchTeacher}
              onChange={handleSearchInputChange}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none"
            />
            <datalist id="teacher-names-list">
              {teacherDatalist.map((name, i) => (
                <option key={`t-name-${i}`} value={name} />
              ))}
            </datalist>

            <button type="submit" className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all">
              ค้นหา
            </button>
          </form>

          {loading ? (
            <p className="text-xs text-slate-400 py-4 text-center">กำลังค้นหากิจกรรมชุมนุม...</p>
          ) : assignedClubs.length > 0 ? (
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-500 block">ชุมนุมที่คุณครูดูแล:</span>
              <div className="flex flex-wrap gap-2">
                {assignedClubs.map((club) => (
                  <button
                    key={club.id}
                    onClick={() => {
                      setSelectedClub(club);
                      loadClubStudents(club.club_name, attendanceDate);
                    }}
                    className={`px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2 ${
                      selectedClub?.id === club.id
                        ? "bg-purple-600 text-white border-purple-600 shadow-md scale-[1.02]"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                    }`}
                  >
                    <span>🧩</span>
                    <span>ชุมนุม{club.club_name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : hasSearched && searchTeacher ? (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-center">
              <p className="text-xs font-bold text-amber-800">⚠️ ไม่พบรายการกิจกรรมชุมนุมสำหรับคุณครู "{searchTeacher}"</p>
            </div>
          ) : null}
        </div>

        {/* Dashboard & Table */}
        {selectedClub && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 p-4 rounded-2xl border border-slate-200 gap-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  📋 รายชื่อนักเรียน: ชุมนุม{selectedClub.club_name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">ครูผู้ดูแล: {selectedClub.teacher_name || searchTeacher}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-600">วันที่เช็คชื่อ:</label>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white font-bold outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* แถบตัวกรองระดับชั้น */}
            <div className="flex items-center gap-2 p-3 bg-purple-50/50 rounded-2xl border border-purple-100">
              <span className="text-xs font-bold text-purple-900">กรองระดับชั้น:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setActiveGradeFilter("ALL")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                    activeGradeFilter === "ALL" ? "bg-purple-600 text-white border-purple-600 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  ทั้งหมด (ม.1-ม.6)
                </button>
                {["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"].map((g) => (
                  <button
                    key={g}
                    onClick={() => setActiveGradeFilter(g)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                      activeGradeFilter === g ? "bg-purple-600 text-white border-purple-600 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {loadError && (
              <div role="alert" className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 font-bold">
                ⚠️ {loadError} — ยังไม่สามารถบันทึกได้
              </div>
            )}
            {/* Dashboard Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
                <span className="text-[11px] font-bold text-slate-500 block">นักเรียนแสดงผล</span>
                <span className="text-lg font-black text-slate-800">{displayedStudents.length} / {students.length} คน</span>
              </div>
              <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 text-center">
                <span className="text-[11px] font-bold text-emerald-600 block">มาเรียนวันนี้</span>
                <span className="text-lg font-black text-emerald-700">{presentCount} คน</span>
              </div>
              <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-center">
                <span className="text-[11px] font-bold text-amber-600 block">ลา / ป่วยวันนี้</span>
                <span className="text-lg font-black text-amber-700">{leaveCount} คน</span>
              </div>
              <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-200 text-center">
                <span className="text-[11px] font-bold text-rose-600 block">ขาดเรียนวันนี้</span>
                <span className="text-lg font-black text-rose-700">{absentCount} คน</span>
              </div>
            </div>

            <p className="text-xs text-amber-700 font-bold">
              ยังไม่เช็คชื่อ {displayedStudents.filter(s => !VALID_STATUSES.has(attendanceStatus[s.id])).length} คน (ในรายการที่แสดง)
              — ไม่มีสถานะเริ่มต้นเป็น “มา” จนกว่าครูจะเลือก
            </p>
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={handleMarkAllPresent}
                className="px-3.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-300 transition-all flex items-center gap-1"
              >
                <span>✅</span>
                <span>เช็คมาทั้งหมด ({displayedStudents.length} คน)</span>
              </button>

              <span className="text-xs text-slate-500 font-medium">
                💡 เกณฑ์เดิม: มาเรียนสะสม 14/18 ครั้ง (77.8%) จึงเป็น "ผ" — ต้องยืนยันเกณฑ์ก่อนใช้งานจริง
              </span>
            </div>

            {loading ? (
              <p className="text-xs text-center py-10 text-slate-400">กำลังโหลดรายชื่อนักเรียนชุมนุม...</p>
            ) : displayedStudents.length === 0 ? (
              <p className="text-xs text-center py-10 text-slate-400">ไม่พบนักเรียนตามเงื่อนไขตัวกรองที่เลือก</p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 font-bold text-slate-700 uppercase">
                    <tr>
                      <th className="p-3.5 text-center w-12 border-r border-slate-200">เลขที่</th>
                      <th className="p-3.5 border-r border-slate-200">รหัสนักเรียน</th>
                      <th className="p-3.5 border-r border-slate-200">ชื่อ - สกุล</th>
                      <th className="p-3.5 text-center border-r border-slate-200 w-24">ชั้น/ห้อง</th>
                      <th className="p-3.5 text-center border-r border-slate-200">การเข้าร่วมกิจกรรมวันนี้</th>
                      <th className="p-3.5 text-center w-40">ประเมินผล (สะสม)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedStudents.map((s) => {
                      const pastCount = historyPresentMap[s.id] || 0;
                      const isTodayPresent = attendanceStatus[s.id] === "มา";
                      const totalPresentCount = pastCount + (isTodayPresent ? 1 : 0);

                      return (
                        <tr key={s.rowKey} className="hover:bg-purple-50/40 transition-colors">
                          <td className="p-3 text-center font-bold text-slate-500 border-r border-slate-100">{s.no}</td>
                          <td className="p-3 font-mono text-slate-600 border-r border-slate-100">{s.id}</td>
                          <td className="p-3 font-bold text-slate-900 border-r border-slate-100">{s.name}</td>
                          <td className="p-3 text-center text-slate-600 border-r border-slate-100">ม.{s.grade}/{s.room}</td>
                          <td className="p-3 text-center border-r border-slate-100">
                            <div className="flex justify-center gap-1.5">
                              {["มา", "ลา", "ป่วย", "ขาด"].map((st) => (
                                <button
                                  key={st}
                                  onClick={() => handleStatusChange(s.id, st)}
                                  className={`px-3 py-1 text-[11px] font-bold rounded-xl border transition-all ${
                                    attendanceStatus[s.id] === st
                                      ? st === "มา"
                                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                        : st === "ขาด"
                                        ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                                        : "bg-amber-500 text-white border-amber-500 shadow-sm"
                                      : "bg-white text-slate-400 border-slate-200 hover:bg-slate-100"
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <select
                                value={evaluations[s.id] || "มผ"}
                                onChange={(e) => setEvaluations((p) => ({ ...p, [s.id]: e.target.value }))}
                                className={`px-2.5 py-1 border rounded-xl text-xs font-black outline-none transition-all ${
                                  evaluations[s.id] === "ผ"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                    : "bg-rose-50 text-rose-700 border-rose-300"
                                }`}
                              >
                                <option value="ผ">ผ (ผ่าน)</option>
                                <option value="มผ">มผ (ไม่ผ่าน)</option>
                              </select>

                              <span className={`text-[10px] font-bold ${totalPresentCount >= 14 ? "text-emerald-600" : "text-rose-500"}`}>
                                มาสะสม {totalPresentCount}/18 ครั้ง
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}

        {/* พื้นที่เผื่อท้ายหน้า ไม่ให้แถวสุดท้ายถูกแถบบันทึกบัง */}
        {selectedClub && students.length > 0 && <div aria-hidden="true" className="h-40 sm:h-28" />}
      </div>

      {/* แถบบันทึกติดขอบล่างหน้าจอ — ใช้ปุ่มและฟังก์ชันบันทึกเดิม */}
      {selectedClub && students.length > 0 && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pt-3 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur-md sm:px-6"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0 text-center sm:text-left" aria-live="polite">
              <p className="truncate text-xs font-bold text-slate-800 sm:text-sm">
                💾 {`ชุมนุม${selectedClub.club_name}`}
              </p>
              <p className="text-[11px] text-slate-600">
                วันที่ {attendanceDate} · เช็คชื่อแล้ว {students.filter(s => VALID_STATUSES.has(attendanceStatus[s.id])).length}/{students.length} คน
              </p>
              {loadError && <p role="alert" className="text-[11px] font-semibold text-rose-700">อ่านข้อมูลผิดพลาด — ไม่สามารถบันทึกได้</p>}
            </div>
            <button
              type="button"
              onClick={handleSaveAttendance}
              disabled={savingAttendance || loading || !!loadError}
              className="w-full shrink-0 rounded-xl bg-purple-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              aria-label="บันทึกหรืออัปเดตผลเช็คชื่อกิจกรรม"
            >
              {savingAttendance ? "⏳ กำลังบันทึก..." : "💾 บันทึก / อัปเดตการเช็คชื่อ"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}