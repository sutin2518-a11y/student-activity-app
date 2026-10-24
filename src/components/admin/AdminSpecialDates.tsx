"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";

interface SpecialDate {
  id: number;
  event_date: string;
  title: string;
  activity_type: string;
}

export default function AdminSpecialDates() {
  const [datesList, setDatesList] = useState<SpecialDate[]>([]);
  const [eventDate, setEventDate] = useState("");
  const [title, setTitle] = useState("");
  const [activityType, setActivityType] = useState("ALL");
  const [loading, setLoading] = useState(false);

  // โหลดรายการวันหยุดทั้งหมด
  const fetchSpecialDates = async () => {
    const { data, error } = await supabase
      .from("special_dates")
      .select("*")
      .order("event_date", { ascending: true });

    if (!error && data) {
      setDatesList(data);
    }
  };

  useEffect(() => {
    fetchSpecialDates();
  }, []);

  // เพิ่มวันหยุด / วันกิจกรรมพิเศษ
  const handleAddDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventDate || !title) {
      return Swal.fire({ icon: "warning", title: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    setLoading(true);

    const { error } = await supabase.from("special_dates").insert([
      {
        event_date: eventDate,
        title: title,
        activity_type: activityType,
      },
    ]);

    setLoading(false);

    if (error) {
      Swal.fire({
        icon: "error",
        title: "เพิ่มวันหยุดไม่สำเร็จ",
        text: error.message.includes("unique")
          ? "มีการบันทึกวันหยุดนี้ในระบบแล้ว"
          : error.message,
      });
    } else {
      Swal.fire({
        icon: "success",
        title: "เพิ่มวันหยุด/กิจกรรมพิเศษสำเร็จ! 📅",
        timer: 1500,
        showConfirmButton: false,
      });
      setEventDate("");
      setTitle("");
      fetchSpecialDates();
    }
  };

  // ลบวันหยุด
  const handleDeleteDate = async (id: number) => {
    const confirm = await Swal.fire({
      title: "ลบรายการวันหยุด?",
      text: "นักเรียนจะไม่ได้รับสิทธิ์การเช็คชื่ออัตโนมัติในวันนี้แล้ว",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบข้อมูล",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#ef4444",
    });

    if (confirm.isConfirmed) {
      const { error } = await supabase.from("special_dates").delete().eq("id", id);
      if (!error) {
        fetchSpecialDates();
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 font-sans">
      <div className="flex items-center gap-2">
        <span className="text-xl">📅</span>
        <h2 className="text-base font-bold text-slate-900">
          กำหนดวันหยุด / วันกิจกรรมโรงเรียน
        </h2>
      </div>
      <p className="text-xs text-slate-500">
        วันที่กำหนดในส่วนนี้ ระบบจะทำการงดเรียนและไม่นำมาคิดคำนวณเป็นวันขาดเรียนของนักเรียน
      </p>

      {/* ฟอร์มเพิ่มวันหยุด */}
      <form onSubmit={handleAddDate} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div>
          <label className="text-xs font-bold text-slate-700">วันที่งดเรียน</label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full mt-1 p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700">ชื่อกิจกรรม / เหตุผล</label>
          <input
            type="text"
            placeholder="เช่น วันไหว้ครู, วันหยุดนักขัตฤกษ์, กีฬาสี"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full mt-1 p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700">ส่งผลกระทบกับ</label>
          <select
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
            className="w-full mt-1 p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">กิจกรรมทั้งหมด (ชุมนุม + เครื่องแบบ)</option>
            <option value="CLUB">เฉพาะกิจกรรมชุมนุม</option>
            <option value="UNIFORM">เฉพาะกิจกรรมเครื่องแบบ</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
        >
          {loading ? "กำลังบันทึก..." : "➕ บันทึกวันหยุด/กิจกรรมพิเศษ"}
        </button>
      </form>

      {/* ตารางแสดงวันหยุดที่บันทึกไว้ */}
      <div className="mt-4">
        <h3 className="text-xs font-bold text-slate-700 mb-2">รายการวันหยุดที่ตั้งค่าไว้ ({datesList.length})</h3>
        {datesList.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            ยังไม่มีรายการวันหยุด
          </div>
        ) : (
          <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
            {datesList.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-800">{item.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    🗓️ {item.event_date} | 📌{" "}
                    {item.activity_type === "ALL"
                      ? "ทุกกิจกรรม"
                      : item.activity_type === "CLUB"
                      ? "ชุมนุม"
                      : "เครื่องแบบ"}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteDate(item.id)}
                  className="px-2.5 py-1 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
                >
                  ลบ
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}