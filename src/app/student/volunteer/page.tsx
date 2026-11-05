"use client";

import React, { useState } from "react";
import Link from "next/link";
import Swal from "sweetalert2";

type VolunteerItem = {
  id: number;
  title: string;
  date: string;
  hours: number;
  location: string;
  status: "approved" | "pending" | "rejected";
};

export default function StudentVolunteerPage() {
  const [showModal, setShowModal] = useState(false);
  const [activities, setActivities] = useState<VolunteerItem[]>([
    {
      id: 1,
      title: "ทำความสะอาดและพัฒนาบริเวณหอประชุมโรงเรียน",
      date: "2026-01-10",
      hours: 6,
      location: "อาคารหอประชุม",
      status: "approved",
    },
    {
      id: 2,
      title: "จิตอาสาช่วยงานจราจรดูแลน้องๆ หน้าประตูโรงเรียน",
      date: "2026-01-18",
      hours: 4,
      location: "ประตู 1 หน้าโรงเรียน",
      status: "approved",
    },
    {
      id: 3,
      title: "กิจกรรมคัดแยกขยะบำเพ็ญประโยชน์ในชุมชน",
      date: "2026-01-25",
      hours: 8,
      location: "ชุมชนเชียงคำ",
      status: "pending",
    },
  ]);

  // ฟอร์มบันทึกใหม่
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    hours: "",
    location: "",
  });

  // คำนวณชั่วโมงจิตอาสาสะสมเฉพาะที่ได้รับการอนุมัติแล้ว
  const totalApprovedHours = activities
    .filter((act) => act.status === "approved")
    .reduce((sum, act) => sum + act.hours, 0);

  const targetHours = 20; // เป้าหมายชั่วโมงจิตอาสาต่อปีการศึกษา

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.date || !formData.hours || !formData.location) {
      Swal.fire({
        icon: "warning",
        title: "กรอกข้อมูลไม่ครบ",
        text: "โปรดระบุรายละเอียดกิจกรรมให้ครบถ้วน",
        confirmButtonColor: "#10b981",
      });
      return;
    }

    const newItem: VolunteerItem = {
      id: Date.now(),
      title: formData.title,
      date: formData.date,
      hours: Number(formData.hours),
      location: formData.location,
      status: "pending",
    };

    setActivities([newItem, ...activities]);
    setFormData({ title: "", date: "", hours: "", location: "" });
    setShowModal(false);

    Swal.fire({
      icon: "success",
      title: "ส่งข้อมูลสำเร็จ!",
      text: "บันทึกกิจกรรมจิตอาสาเรียบร้อยแล้ว รอครูที่ปรึกษาตรวจสอบและอนุมัติ",
      timer: 2000,
      showConfirmButton: false,
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 1. ส่วนหัวของหน้าเพจ */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                🌱 กิจกรรมเพื่อสังคมและสาธารณประโยชน์
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-800 mt-2">
              ระบบบันทึกชั่วโมงจิตอาสา
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

        {/* 2. การ์ดสรุปสถิติชั่วโมงจิตอาสา */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* การ์ดชั่วโมงสะสม */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
            <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider">
              ชั่วโมงจิตอาสาสะสม
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
            <p className="text-[11px] text-emerald-100 mt-2 font-medium">
              {totalApprovedHours >= targetHours
                ? "🎉 สะสมครบตามเกณฑ์ขั้นต่ำประจำปีการศึกษาแล้ว"
                : `ขาดอีก ${targetHours - totalApprovedHours} ชั่วโมง จะครบเกณฑ์`}
            </p>
          </div>

          {/* การ์ดจำนวนรายการกิจกรรม */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              กิจกรรมที่เข้าร่วมทั้งหมด
            </p>
            <p className="text-3xl font-black text-slate-800 mt-2">
              {activities.length} <span className="text-xs font-normal text-slate-500">กิจกรรม</span>
            </p>
            <p className="text-xs text-emerald-600 font-bold mt-3">
              ✓ อนุมัติแล้ว {activities.filter((a) => a.status === "approved").length} กิจกรรม
            </p>
          </div>

          {/* การ์ดสถานะภาพรวม */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              สถานะการประเมินกิจกรรม
            </p>
            <div>
              <span
                className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold mt-1 ${
                  totalApprovedHours >= targetHours
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {totalApprovedHours >= targetHours ? "ผ่านเกณฑ์" : "อยู่ระหว่างสะสมชั่วโมง"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-3">
              อัปเดตล่าสุด: ประจำปีการศึกษา 2569
            </p>
          </div>
        </div>

        {/* 3. ตารางรายการจิตอาสา */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span>📋</span> ประวัติการเข้าร่วมและบันทึกกิจกรรมจิตอาสา
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b font-bold text-slate-700">
                <tr>
                  <th className="p-3.5">ชื่อกิจกรรมจิตอาสา</th>
                  <th className="p-3.5">สถานที่</th>
                  <th className="p-3.5 text-center">วันที่ทำกิจกรรม</th>
                  <th className="p-3.5 text-center">จำนวนชั่วโมง</th>
                  <th className="p-3.5 text-center">สถานะการตรวจสอบ</th>
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
                      {act.status === "approved" && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          ✓ อนุมัติแล้ว
                        </span>
                      )}
                      {act.status === "pending" && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                          ⏳ รอตรวจสอบ
                        </span>
                      )}
                      {act.status === "rejected" && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                          ✕ ไม่อนุมัติ
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Modal ป๊อปอัพฟอร์มเพิ่มกิจกรรม */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span>🌱</span> ยื่นบันทึกกิจกรรมจิตอาสา
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-xl"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ชื่อกิจกรรมจิตอาสา / รายละเอียด
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ทำความสะอาดวัด, ปลูกป่าชุมชน"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full border p-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    สถานที่จัดกิจกรรม
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น หอประชุมโรงเรียน, ชุมชนเชียงคำ"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full border p-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      วันที่ทำกิจกรรม
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full border p-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      จำนวนชั่วโมง
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      placeholder="เช่น 3"
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
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition"
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