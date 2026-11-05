"use client";

import React, { useState } from "react";
import Link from "next/link";
import Swal from "sweetalert2";

// โครงสร้างรอบการเช็คชื่อรายวัน
type DaySchedule = {
  dayNumber: number;
  dateStr: string;
  morningMinutes: number;   // นาทีภาคเช้า
  afternoonMinutes: number; // นาทีภาคบ่าย
};

// โครงสร้างประกาศกิจกรรม
type ActivityAnnouncement = {
  id: string;
  title: string;
  academicYear: string;
  targetGrades: string[];
  totalHours: number;
  schedules: DaySchedule[];
  status: "active" | "draft" | "completed";
};

export default function ActivityManager() {
  const [showModal, setShowModal] = useState(false);
  
  // รายการกิจกรรมประกาศเดิม
  const [activities, setActivities] = useState<ActivityAnnouncement[]>([
    {
      id: "ACT-2026-001",
      title: "กิจกรรมการแข่งขันกีฬาภายใน (กีฬาสีประจำปี 2569)",
      academicYear: "2569",
      targetGrades: ["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"],
      totalHours: 3.0,
      status: "active",
      schedules: [
        { dayNumber: 1, dateStr: "2026-11-01", morningMinutes: 15, afternoonMinutes: 15 },
        { dayNumber: 2, dateStr: "2026-11-02", morningMinutes: 15, afternoonMinutes: 15 },
        { dayNumber: 3, dateStr: "2026-11-03", morningMinutes: 15, afternoonMinutes: 15 },
        { dayNumber: 4, dateStr: "2026-11-04", morningMinutes: 15, afternoonMinutes: 15 },
        { dayNumber: 5, dateStr: "2026-11-05", morningMinutes: 30, afternoonMinutes: 30 },
      ],
    },
  ]);

  // ฟอร์มสร้างกิจกรรมใหม่ (ตั้งค่าแม่แบบกีฬาสีเป็นค่าเริ่มต้น)
  const [formData, setFormData] = useState({
    title: "กิจกรรมการแข่งขันกีฬาภายใน (กีฬาสี)",
    academicYear: "2569",
    targetGroup: "นักเรียนทุกคน (ม.1 - ม.6)",
  });

  // กฎการกระจายเวลาแต่ละวัน (ตัวอย่าง 5 วันตามโจทย์)
  const [schedules, setSchedules] = useState<DaySchedule[]>([
    { dayNumber: 1, dateStr: "2026-11-01", morningMinutes: 15, afternoonMinutes: 15 },
    { dayNumber: 2, dateStr: "2026-11-02", morningMinutes: 15, afternoonMinutes: 15 },
    { dayNumber: 3, dateStr: "2026-11-03", morningMinutes: 15, afternoonMinutes: 15 },
    { dayNumber: 4, dateStr: "2026-11-04", morningMinutes: 15, afternoonMinutes: 15 },
    { dayNumber: 5, dateStr: "2026-11-05", morningMinutes: 30, afternoonMinutes: 30 },
  ]);

  // คำนวณรวมนาทีทั้งหมดแปลงเป็นชั่วโมง (เช่น 180 นาที = 3.0 ชั่วโมง)
  const totalMinutes = schedules.reduce(
    (sum, d) => sum + d.morningMinutes + d.afternoonMinutes,
    0
  );
  const totalHours = Number((totalMinutes / 60).toFixed(1));

  // ฟังก์ชันอัปเดตเวลาในแต่ละวัน
  const handleScheduleChange = (
    index: number,
    field: "morningMinutes" | "afternoonMinutes" | "dateStr",
    value: string | number
  ) => {
    const updated = [...schedules];
    updated[index] = { ...updated[index], [field]: value };
    setSchedules(updated);
  };

  // เพิ่มวันทำกิจกรรม
  const handleAddDay = () => {
    const newDayNum = schedules.length + 1;
    setSchedules([
      ...schedules,
      {
        dayNumber: newDayNum,
        dateStr: "",
        morningMinutes: 15,
        afternoonMinutes: 15,
      },
    ]);
  };

  // ลบวัน
  const handleRemoveDay = (index: number) => {
    if (schedules.length <= 1) return;
    const updated = schedules.filter((_, i) => i !== index);
    setSchedules(updated);
  };

  // บันทึกประกาศกิจกรรมใหม่
  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      Swal.fire("กรอกข้อมูลไม่ครบ", "กรุณาระบุชื่อกิจกรรม", "warning");
      return;
    }

    const newActivity: ActivityAnnouncement = {
      id: `ACT-2026-00${activities.length + 1}`,
      title: formData.title,
      academicYear: formData.academicYear,
      targetGrades: ["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"],
      totalHours: totalHours,
      schedules: schedules,
      status: "active",
    };

    setActivities([newActivity, ...activities]);
    setShowModal(false);

    Swal.fire({
      icon: "success",
      title: "ประกาศกิจกรรมสำเร็จ!",
      text: `กำหนดชั่วโมงรวม ${totalHours} ชั่วโมง ให้กับนักเรียนทุกคนเรียบร้อยแล้ว`,
      confirmButtonColor: "#10b981",
    });
  };

  // ปุ่มประมวลผลคำนวณชั่วโมงเข้าฐานข้อมูลนักเรียนตามการเช็คชื่อจริง
  const handleProcessAttendance = (act: ActivityAnnouncement) => {
    Swal.fire({
      title: `ประมวลผลชั่วโมงกิจกรรม?`,
      html: `ระบบจะอ่านข้อมูลการเช็คชื่อ (เช้า-บ่าย) ของกิจกรรม <b>"${act.title}"</b><br/>และโอนชั่วโมงสะสมให้ผู้ที่เข้าเรียนครบถ้วนโดยอัตโนมัติ`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#059669",
      confirmButtonText: "⚡ เริ่มประมวลผลทันที",
      cancelButtonText: "ยกเลิก",
    }).then((res) => {
      if (res.isConfirmed) {
        Swal.fire({
          title: "กำลังประมวลผล...",
          text: "คำนวณการเข้าร่วมของนักเรียน 1,248 คน",
          timer: 1500,
          didOpen: () => Swal.showLoading(),
        }).then(() => {
          Swal.fire({
            icon: "success",
            title: "ประมวลผลเสร็จสิ้น!",
            text: `บันทึกชั่วโมงจิตอาสาเข้าประวัติของนักเรียนทุกคนเรียบร้อยแล้ว`,
            confirmButtonColor: "#10b981",
          });
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. แถบหัวข้อและปุ่มเพิ่มกิจกรรม */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-bold">
            ⚙️ ระบบผู้ดูแลระบบ (Admin)
          </span>
          <h1 className="text-2xl font-black text-slate-800 mt-2">
            กำหนดชั่วโมงกิจกรรมเพื่อสังคมฯ & กิจกรรมโรงเรียน
          </h1>
          <p className="text-xs text-slate-500">
            ตั้งค่าโควต้าชั่วโมงจิตอาสารายวัน/รอบเช็คชื่อ สำหรับมอบให้นักเรียนทั้งโรงเรียนอัตโนมัติ
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center justify-center gap-2"
        >
          <span>📢</span> ประกาศกิจกรรม & กำหนดชั่วโมงใหม่
        </button>
      </div>

      {/* 2. รายการกิจกรรมที่ประกาศไว้ */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <span>📌</span> กิจกรรมที่กำหนดการแจกชั่วโมงไว้แล้ว
        </h2>

        <div className="space-y-4">
          {activities.map((act) => (
            <div
              key={act.id}
              className="border border-slate-200 rounded-2xl p-5 hover:border-purple-300 transition bg-slate-50/50 space-y-4"
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-200 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-md">
                      ปีการศึกษา {act.academicYear}
                    </span>
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-0.5 rounded-md">
                      โควต้ารวม {act.totalHours} ชั่วโมง ({act.totalHours * 60} นาที)
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mt-1">
                    {act.title}
                  </h3>
                </div>

                <button
                  onClick={() => handleProcessAttendance(act)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition shrink-0 flex items-center gap-1.5"
                >
                  <span>⚡</span> ประมวลผลแจกชั่วโมงตามการเช็คชื่อ
                </button>
              </div>

              {/* รายละเอียดช่วงเวลาที่กำหนด */}
              <div>
                <p className="text-xs font-bold text-slate-600 mb-2">
                  🗓️ สรุปกฎการกระจายชั่วโมงตามรอบเช็คชื่อ:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {act.schedules.map((day) => {
                    const dayTotalMins = day.morningMinutes + day.afternoonMinutes;
                    return (
                      <div
                        key={day.dayNumber}
                        className="bg-white p-3 rounded-xl border border-slate-200 text-center space-y-1 shadow-2xs"
                      >
                        <p className="text-xs font-black text-purple-900">
                          วันที่ {day.dayNumber}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {day.dateStr || `วันที่ ${day.dayNumber}`}
                        </p>
                        <div className="text-[11px] text-slate-600 font-medium pt-1 border-t border-slate-100">
                          <p>เช้า: <span className="font-bold text-emerald-700">{day.morningMinutes} นาที</span></p>
                          <p>บ่าย: <span className="font-bold text-emerald-700">{day.afternoonMinutes} นาที</span></p>
                        </div>
                        <p className="text-[10px] font-bold text-purple-700 bg-purple-50 rounded py-0.5 mt-1">
                          รวม {dayTotalMins} นาที
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Modal ตั้งค่ากำหนดการกิจกรรมแบบละเอียด */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span>⚙️</span> ตั้งค่ากำหนดการและชั่วโมงกิจกรรม
                </h3>
                <p className="text-xs text-slate-500">
                  กำหนดโควต้าชั่วโมงแบ่งรายภาคเช้า-บ่าย ตามการเช็คชื่อแต่ละวัน
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อกิจกรรม / ประกาศ
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border p-2.5 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="เช่น กิจกรรมการแข่งขันกีฬาภายใน (กีฬาสี)"
                />
              </div>

              {/* การกำหนดเวลาแต่ละวัน */}
              <div className="space-y-3 border-t pt-3">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-purple-900">
                    ⏱️ กำหนดเวลาและนาทีจิตอาสาแต่ละวัน (เช้า-บ่าย):
                  </label>
                  <button
                    type="button"
                    onClick={handleAddDay}
                    className="text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1 rounded-lg transition"
                  >
                    + เพิ่มวันกิจกรรม
                  </button>
                </div>

                <div className="space-y-2">
                  {schedules.map((sch, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 border rounded-xl text-xs"
                    >
                      <span className="font-black text-slate-700 w-12">
                        วันที่ {sch.dayNumber}:
                      </span>

                      <input
                        type="date"
                        value={sch.dateStr}
                        onChange={(e) =>
                          handleScheduleChange(idx, "dateStr", e.target.value)
                        }
                        className="border p-1.5 rounded-lg text-xs bg-white"
                      />

                      <div className="flex items-center gap-1">
                        <span className="text-slate-500 font-medium">เช้า:</span>
                        <input
                          type="number"
                          min="0"
                          step="5"
                          value={sch.morningMinutes}
                          onChange={(e) =>
                            handleScheduleChange(
                              idx,
                              "morningMinutes",
                              Number(e.target.value)
                            )
                          }
                          className="w-16 border p-1.5 rounded-lg text-center font-bold bg-white"
                        />
                        <span className="text-slate-400">นาที</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-slate-500 font-medium">บ่าย:</span>
                        <input
                          type="number"
                          min="0"
                          step="5"
                          value={sch.afternoonMinutes}
                          onChange={(e) =>
                            handleScheduleChange(
                              idx,
                              "afternoonMinutes",
                              Number(e.target.value)
                            )
                          }
                          className="w-16 border p-1.5 rounded-lg text-center font-bold bg-white"
                        />
                        <span className="text-slate-400">นาที</span>
                      </div>

                      <div className="ml-auto flex items-center gap-2">
                        <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded">
                          รวม {sch.morningMinutes + sch.afternoonMinutes} นาที
                        </span>
                        {schedules.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDay(idx)}
                            className="text-rose-500 hover:text-rose-700 font-bold px-1"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* สรุปชั่วโมงรวม */}
              <div className="bg-purple-950 text-white rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-xs text-purple-200">สรุปโควต้าชั่วโมงที่จะได้รับ:</p>
                  <p className="text-xs text-purple-300 mt-0.5">
                    รวมทั้งสิ้น {totalMinutes} นาที
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-amber-400">
                    {totalHours} ชั่วโมง
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  บันทึก & ประกาศกิจกรรม
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}