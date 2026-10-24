"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";

export default function TeacherUniformPage() {
  const [searchTeacher, setSearchTeacher] = useState("");
  const [teacherDatalist, setTeacherDatalist] = useState<string[]>([]);
  const [assignedActivities, setAssignedActivities] = useState<any[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceDate, setAttendanceDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);

  // ตัวกรองระดับชั้น (ม.1 - ม.3)
  const [activeGradeFilter, setActiveGradeFilter] = useState<string>("ALL");

  // ตัวกรองย่อย ระดับ 1, 2, 3
  const [selectedL1, setSelectedL1] = useState<string>("ALL");
  const [selectedL2, setSelectedL2] = useState<string>("ALL");
  const [selectedL3, setSelectedL3] = useState<string>("ALL");

  const [attendanceStatus, setAttendanceStatus] = useState<{ [key: string]: string }>({});
  const [evaluations, setEvaluations] = useState<{ [key: string]: string }>({});
  
  // สถิติมาเรียนสะสมย้อนหลังของนักเรียนแต่ละคน { student_key: totalPresentCount }
  const [historyPresentMap, setHistoryPresentMap] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    setAttendanceDate(todayStr);
    loadTeacherDatalist();
    autoFetchLoggedInTeacher(todayStr);
  }, []);

  // กำหนดชื่อยศ/ระดับย่อยตามระเบียบข้อบังคับแต่ละกิจกรรม
  const getLevelLabels = (activityName: string = "") => {
    const act = activityName.toLowerCase();
    if (act.includes("ลูกเสือ") || act.includes("เนตรนารี")) {
      return { l1: "กลุ่ม", l2: "กอง", l3: "หมู่" };
    }
    if (act.includes("ยุวกาชาด")) {
      return { l1: "หมู่", l2: "กลุ่ม", l3: "หน่วย" };
    }
    if (act.includes("ประโยชน์") || act.includes("บำเพ็ญ")) {
      return { l1: "หมวด", l2: "หมู่", l3: "" };
    }
    return { l1: "ระดับ 1", l2: "ระดับ 2", l3: "ระดับ 3" };
  };

  const loadTeacherDatalist = async () => {
    const { data } = await supabase
      .from("uniform_teachers")
      .select("teacher_name")
      .limit(1000);

    if (data) {
      const names = Array.from(new Set(data.map((d: any) => d.teacher_name).filter(Boolean)));
      setTeacherDatalist(names);
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
          await fetchUniformsByName(tName, dateStr);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
    setLoading(false);
  };

  const fetchUniformsByName = async (teacherName: string, dateStr: string) => {
    if (!teacherName.trim()) {
      setAssignedActivities([]);
      setSelectedActivity(null);
      setStudents([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const { data: allTeachers, error } = await supabase
        .from("uniform_teachers")
        .select("*")
        .limit(1000);

      if (error) {
        console.error("Error from uniform_teachers:", error.message);
        setLoading(false);
        return;
      }

      const keyword = teacherName.trim().toLowerCase();
      const matched = (allTeachers || []).filter((item: any) =>
        String(item.teacher_name || "").toLowerCase().includes(keyword)
      );

      if (matched.length > 0) {
        const uniqueMap = new Map();
        matched.forEach((item: any) => {
          const rawGrade = String(item.grade_level || "").trim();
          const cleanGradeNum = rawGrade.replace(/^ม\./, "").trim();

          if (["1", "2", "3"].includes(cleanGradeNum)) {
            const formattedGrade = `ม.${cleanGradeNum}`;
            const key = `${item.activity_name}_${formattedGrade}`;
            if (!uniqueMap.has(key)) {
              uniqueMap.set(key, {
                id: key,
                activity_name: item.activity_name,
                grade_level: formattedGrade,
                cleanGradeNum: cleanGradeNum,
                teacher_name: item.teacher_name,
              });
            }
          }
        });

        const uniqueList = Array.from(uniqueMap.values());
        setAssignedActivities(uniqueList);

        if (uniqueList.length > 0) {
          setSelectedActivity(uniqueList[0]);
          await loadUniformStudents(uniqueList[0], dateStr);
        } else {
          setSelectedActivity(null);
          setStudents([]);
        }
      } else {
        setAssignedActivities([]);
        setSelectedActivity(null);
        setStudents([]);
      }
    } catch (err) {
      console.error("Search uniforms exception:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTeacher(val);
    if (val.trim().length >= 2) {
      fetchUniformsByName(val, attendanceDate);
    } else if (val.trim().length === 0) {
      setAssignedActivities([]);
      setSelectedActivity(null);
      setStudents([]);
      setHasSearched(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUniformsByName(searchTeacher, attendanceDate);
  };

  const loadUniformStudents = async (act: any, dateStr: string) => {
    setLoading(true);
    setSelectedL1("ALL");
    setSelectedL2("ALL");
    setSelectedL3("ALL");

    const cleanNum = act.cleanGradeNum || act.grade_level.replace(/^ม\./, "").trim();
    const gradeVariants = [act.grade_level, `ม.${cleanNum}`, cleanNum];

    let activityVariants = [act.activity_name];
    if (act.activity_name.includes("ประโยชน์") || act.activity_name.includes("บำเพ็ญ")) {
      activityVariants = ["ผู้บำเพ็ญประโยชน์", "ผู้ทำประโยชน์"];
    }

    // 1. ดึงรายชื่อนักเรียนในกิจกรรม
    const { data } = await supabase
      .from("uniform_activities")
      .select("*")
      .in("activity_name", activityVariants)
      .in("grade_level", gradeVariants)
      .limit(1000)
      .order("classroom", { ascending: true })
      .order("no", { ascending: true });

    const formatted = (data || []).map((s: any, idx: number) => ({
      id: String(s.student_id_card || s.id || idx),
      rowKey: `uniform-student-${s.id || s.student_id_card || idx}-${idx}`,
      no: s.no || idx + 1,
      name: s.full_name || "ไม่ระบุชื่อ",
      grade: s.grade_level || act.grade_level,
      room: s.classroom || "-",
      level_1: String(s.level_1 || "").trim(),
      level_2: String(s.level_2 || "").trim(),
      level_3: String(s.level_3 || "").trim(),
    }));

    const activityKey = `UNIFORM_${act.activity_name}_M${cleanNum}`;

    // 2. ดึงประวัติการเช็คชื่อย้อนหลังทั้งหมดของกิจกรรมนี้ (ทุกวัน)
    const { data: allHistory } = await supabase
      .from("attendance_records")
      .select("student_key, attendance_date, status, evaluation")
      .eq("activity_type", "UNIFORM")
      .eq("activity_id", activityKey);

    // สร้าง Map นับจำนวนวันที่มาเรียนสะสมย้อนหลัง (ไม่นับวันปัจจุบันที่กำลังเช็คอยู่)
    const pastPresentCounts: { [key: string]: number } = {};
    const existTodayMap: { [key: string]: any } = {};

    (allHistory || []).forEach((r: any) => {
      if (r.attendance_date === dateStr) {
        existTodayMap[r.student_key] = r;
      } else {
        if (r.status === "มา") {
          pastPresentCounts[r.student_key] = (pastPresentCounts[r.student_key] || 0) + 1;
        }
      }
    });

    setHistoryPresentMap(pastPresentCounts);

    // 3. กำหนดค่าเริ่มต้น และคำนวณการประเมินผลอัตโนมัติ (เกณฑ์ 80% = 14 ครั้ง)
    const initSt: { [key: string]: string } = {};
    const initEv: { [key: string]: string } = {};

    formatted.forEach((s) => {
      const todayStatus = existTodayMap[s.id]?.status || "มา";
      initSt[s.id] = todayStatus;

      // คำนวณวันมาเรียนสะสมรวมวันนี้
      const pastPresent = pastPresentCounts[s.id] || 0;
      const totalPresent = pastPresent + (todayStatus === "มา" ? 1 : 0);

      // หากมีบันทึกใน DB เดิม ให้ใช้ค่าเดิมก่อน ถ้าไม่มีให้คำนวณตามเกณฑ์ >= 14 ครั้ง = ผ
      if (existTodayMap[s.id]?.evaluation) {
        initEv[s.id] = existTodayMap[s.id].evaluation;
      } else {
        initEv[s.id] = totalPresent >= 14 ? "ผ" : "มผ";
      }
    });

    setStudents(formatted);
    setAttendanceStatus(initSt);
    setEvaluations(initEv);
    setLoading(false);
  };

  const handleDateChange = (newDate: string) => {
    setAttendanceDate(newDate);
    if (selectedActivity) {
      loadUniformStudents(selectedActivity, newDate);
    }
  };

  // เมื่อครูกดเปลี่ยนสถานะการมาเรียนของนักเรียน ให้คำนวณผลประเมิน ผ/มผ อัตโนมัติทันที
  const handleStatusChange = (studentId: string, newStatus: string) => {
    setAttendanceStatus((prevSt) => {
      const nextSt = { ...prevSt, [studentId]: newStatus };
      
      // คำนวณการประเมินผลสะสมใหม่
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

  const getUniqueOptions = (key: "level_1" | "level_2" | "level_3") => {
    const rawList = students
      .map((s) => s[key])
      .filter((v) => v !== null && v !== undefined && v !== "");
    return Array.from(new Set(rawList)).sort((a, b) => a.localeCompare(b, "th", { numeric: true }));
  };

  const levelLabels = getLevelLabels(selectedActivity?.activity_name);
  const l1Options = getUniqueOptions("level_1");
  const l2Options = getUniqueOptions("level_2");
  const l3Options = levelLabels.l3 ? getUniqueOptions("level_3") : [];

  const displayedStudents = students.filter((s) => {
    if (selectedL1 !== "ALL" && s.level_1 !== selectedL1) return false;
    if (selectedL2 !== "ALL" && s.level_2 !== selectedL2) return false;
    if (selectedL3 !== "ALL" && levelLabels.l3 && s.level_3 !== selectedL3) return false;
    return true;
  });

  const handleMarkAllPresent = () => {
    const updatedSt: any = { ...attendanceStatus };
    const updatedEv: any = { ...evaluations };

    displayedStudents.forEach((s) => {
      updatedSt[s.id] = "มา";
      const pastCount = historyPresentMap[s.id] || 0;
      const totalPresent = pastCount + 1; // มาเรียนวันนี้
      updatedEv[s.id] = totalPresent >= 14 ? "ผ" : "มผ";
    });

    setAttendanceStatus(updatedSt);
    setEvaluations(updatedEv);
  };

  const handleSaveAttendance = async () => {
    if (!selectedActivity || students.length === 0) return;
    setSavingAttendance(true);

    const activityKey = `UNIFORM_${selectedActivity.activity_name}`;

    const rawPayload = students.map((s) => ({
      activity_type: "UNIFORM",
      activity_id: activityKey,
      student_key: String(s.id),
      attendance_date: attendanceDate,
      status: attendanceStatus[s.id] || "มา",
      evaluation: evaluations[s.id] || "ผ",
      updated_at: new Date().toISOString(),
    }));

    // กรองขจัดรายการซ้ำ
    const uniqueMap = new Map();
    rawPayload.forEach((item) => {
      if (item.student_key) {
        uniqueMap.set(item.student_key, item);
      }
    });
    const payload = Array.from(uniqueMap.values());

    const { error } = await supabase
      .from("attendance_records")
      .upsert(payload, { onConflict: "activity_type,activity_id,student_key,attendance_date" });

    if (error) {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาดในการบันทึก", text: error.message });
    } else {
      Swal.fire({
        icon: "success",
        title: "บันทึกสำเร็จ! 🎉",
        text: `บันทึกกิจกรรมเครื่องแบบเรียบร้อยแล้ว (${payload.length} รายการ)`,
        confirmButtonColor: "#2563eb",
        customClass: { popup: "rounded-3xl font-sans" },
      });
    }
    setSavingAttendance(false);
  };

  const presentCount = displayedStudents.filter((s) => attendanceStatus[s.id] === "มา").length;
  const leaveCount = displayedStudents.filter((s) => attendanceStatus[s.id] === "ลา" || attendanceStatus[s.id] === "ป่วย").length;
  const absentCount = displayedStudents.filter((s) => attendanceStatus[s.id] === "ขาด").length;

  const filteredActivities = assignedActivities.filter((a) => {
    if (activeGradeFilter === "ALL") return true;
    return a.grade_level === activeGradeFilter;
  });

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
              <h1 className="text-2xl font-bold text-slate-900">⚜️ เช็คชื่อกิจกรรมเครื่องแบบ</h1>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-full border border-purple-200">
                เฉพาะระดับชั้น ม.1 - ม.3
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              จัดการเวลาเรียนและประเมินผล (ผ่านเกณฑ์ 80% = มาเรียน 14 ครั้งขึ้นไป จาก 18 ครั้ง)
            </p>
          </div>
        </div>

        {/* Search Component with Auto-complete Datalist */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <span>🔍</span> ค้นหากิจกรรมเครื่องแบบของคุณครู
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
            <p className="text-xs text-slate-400 py-4 text-center">กำลังค้นหากิจกรรมเครื่องแบบ...</p>
          ) : assignedActivities.length > 0 ? (
            <div className="space-y-3 pt-3 border-t border-slate-100">
              
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">เลือกชั้น:</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setActiveGradeFilter("ALL")}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                      activeGradeFilter === "ALL" ? "bg-purple-600 text-white border-purple-600 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    ทั้งหมด (ม.1-ม.3)
                  </button>
                  {["ม.1", "ม.2", "ม.3"].map((g) => (
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

              <div className="flex flex-wrap gap-2">
                {filteredActivities.map((act) => (
                  <button
                    key={act.id}
                    onClick={() => {
                      setSelectedActivity(act);
                      loadUniformStudents(act, attendanceDate);
                    }}
                    className={`px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2 ${
                      selectedActivity?.id === act.id
                        ? "bg-purple-600 text-white border-purple-600 shadow-md scale-[1.02]"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                    }`}
                  >
                    <span>⚜️</span>
                    <span>{act.activity_name} ({act.grade_level})</span>
                  </button>
                ))}
              </div>

            </div>
          ) : hasSearched && searchTeacher ? (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-center">
              <p className="text-xs font-bold text-amber-800">⚠️ ไม่พบรายการกิจกรรมเครื่องแบบ (ม.1 - ม.3) สำหรับคุณครู "{searchTeacher}"</p>
            </div>
          ) : null}
        </div>

        {/* Dashboard Table & Sub-level Filters */}
        {selectedActivity && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 p-4 rounded-2xl border border-slate-200 gap-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  📋 รายชื่อนักเรียน: {selectedActivity.activity_name} ({selectedActivity.grade_level})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">ครูผู้ดูแล: {selectedActivity.teacher_name || searchTeacher}</p>
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

            {/* แถบตัวกรองระดับย่อย */}
            {levelLabels.l1 && (
              <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-3">
                <span className="text-xs font-bold text-purple-900 block">
                  ⚙️ ตัวกรองจัดกลุ่ม ({selectedActivity.activity_name}):
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  
                  {/* ตัวกรองระดับ 1 */}
                  {levelLabels.l1 && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        {levelLabels.l1}:
                      </label>
                      <select
                        value={selectedL1}
                        onChange={(e) => setSelectedL1(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-xl text-xs bg-white font-bold text-slate-700 border-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="ALL">ทุก{levelLabels.l1}</option>
                        {l1Options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt === "EMPTY" || opt === "-" ? "ยังไม่ระบุ (EMPTY)" : opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* ตัวกรองระดับ 2 */}
                  {levelLabels.l2 && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        {levelLabels.l2}:
                      </label>
                      <select
                        value={selectedL2}
                        onChange={(e) => setSelectedL2(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-xl text-xs bg-white font-bold text-slate-700 border-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="ALL">ทุก{levelLabels.l2}</option>
                        {l2Options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt === "EMPTY" || opt === "-" ? "ยังไม่ระบุ (EMPTY)" : opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* ตัวกรองระดับ 3 (เฉพาะที่มี 3 ระดับ) */}
                  {levelLabels.l3 && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        {levelLabels.l3}:
                      </label>
                      <select
                        value={selectedL3}
                        onChange={(e) => setSelectedL3(e.target.value)}
                        className="w-full px-3 py-1.5 border rounded-xl text-xs bg-white font-bold text-slate-700 border-slate-200 outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="ALL">ทุก{levelLabels.l3}</option>
                        {l3Options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt === "EMPTY" || opt === "-" ? "ยังไม่ระบุ (EMPTY)" : opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* สถิติ Dashboard */}
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

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={handleMarkAllPresent}
                className="px-3.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-300 transition-all flex items-center gap-1"
              >
                <span>✅</span>
                <span>เช็คมาทั้งหมด ({displayedStudents.length} คน)</span>
              </button>

              <span className="text-xs text-slate-500 font-medium">
                💡 เกณฑ์ประเมิน: มาเรียนสะสม $\ge$ 14 ครั้ง (จาก 18 ครั้ง) ประเมิน "ผ่าน (ผ)"
              </span>
            </div>

            {loading ? (
              <p className="text-xs text-center py-10 text-slate-400">กำลังโหลดรายชื่อนักเรียนและคำนวณสถิติสะสม...</p>
            ) : displayedStudents.length === 0 ? (
              <p className="text-xs text-center py-10 text-slate-400">ไม่พบนักเรียนตามเงื่อนไขตัวกรองที่เลือก</p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 font-bold text-slate-700 uppercase">
                    <tr>
                      <th className="p-3.5 text-center w-12 border-r border-slate-200">เลขที่</th>
                      <th className="p-3.5 border-r border-slate-200">ชื่อ - สกุล</th>
                      <th className="p-3.5 text-center border-r border-slate-200 w-24">ชั้น/ห้อง</th>
                      <th className="p-3.5 text-center border-r border-slate-200">สังกัดกลุ่ม/หน่วย</th>
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
                          <td className="p-3 font-bold text-slate-900 border-r border-slate-100">{s.name}</td>
                          <td className="p-3 text-center text-slate-600 border-r border-slate-100">ม.{s.grade}/{s.room}</td>
                          <td className="p-3 text-center text-slate-500 font-bold border-r border-slate-100 text-[11px]">
                            {[
                              s.level_1 && s.level_1 !== "EMPTY" && s.level_1 !== "-" ? `${levelLabels.l1}: ${s.level_1}` : "",
                              s.level_2 && s.level_2 !== "EMPTY" && s.level_2 !== "-" ? `${levelLabels.l2}: ${s.level_2}` : "",
                              levelLabels.l3 && s.level_3 && s.level_3 !== "EMPTY" && s.level_3 !== "-" ? `${levelLabels.l3}: ${s.level_3}` : "",
                            ].filter(Boolean).join(" / ") || "ยังไม่ระบุ (EMPTY)"}
                          </td>
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
                                value={evaluations[s.id] || "ผ"}
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

            {students.length > 0 && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveAttendance}
                  disabled={savingAttendance}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center gap-2"
                >
                  <span>💾</span>
                  <span>{savingAttendance ? "กำลังบันทึกข้อมูล..." : "บันทึกข้อมูลเวลาเรียนและผลประเมินลงฐานข้อมูล"}</span>
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}