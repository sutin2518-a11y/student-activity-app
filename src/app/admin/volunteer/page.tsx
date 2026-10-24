"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminVolunteerApprovalPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");

  useEffect(() => {
    fetchVolunteerRecords();
  }, []);

  const fetchVolunteerRecords = async () => {
    setLoading(true);
    // ดึงข้อมูลจิตอาสา พร้อม Join ดึงชื่อและชั้นของนักเรียนจาก profiles
    const { data, error } = await supabase
      .from("volunteer_records")
      .select(`
        *,
        profiles:student_id (full_name, grade_level, classroom, student_id_card)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching volunteer records:", error.message);
    } else {
      setRecords(data || []);
    }
    setLoading(false);
  };

  // ฟังก์ชันอัปเดตสถานะ (อนุมัติ / ไม่อนุมัติ)
  const handleUpdateStatus = async (id: number, newStatus: "APPROVED" | "REJECTED") => {
    const { error } = await supabase
      .from("volunteer_records")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    } else {
      // อัปเดต State หน้าเว็บทันที
      setRecords((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
      );
    }
  };

  // กรองข้อมูลตามแถบตัวเลือก
  const filteredRecords = records.filter((r) => {
    if (filterStatus === "ALL") return true;
    return r.status === filterStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-8 text-slate-800">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">🤝 ตรวจสอบและอนุมัติชั่วโมงจิตอาสา</h1>
            <p className="text-slate-600 mt-1">จัดการคำขอสะสมชั่วโมงจิตอาสาจากนักเรียน</p>
          </div>
          <button
            onClick={() => (window.location.href = "/admin")}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100"
          >
            ← กลับหน้า Admin Dashboard
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilterStatus("PENDING")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              filterStatus === "PENDING"
                ? "bg-amber-500 text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            ⏳ รอตรวจสอบ ({records.filter((r) => r.status === "PENDING").length})
          </button>
          <button
            onClick={() => setFilterStatus("APPROVED")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              filterStatus === "APPROVED"
                ? "bg-green-600 text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            ✅ อนุมัติแล้ว ({records.filter((r) => r.status === "APPROVED").length})
          </button>
          <button
            onClick={() => setFilterStatus("REJECTED")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              filterStatus === "REJECTED"
                ? "bg-red-600 text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            ❌ ไม่อนุมัติ ({records.filter((r) => r.status === "REJECTED").length})
          </button>
          <button
            onClick={() => setFilterStatus("ALL")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              filterStatus === "ALL"
                ? "bg-slate-900 text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            ทั้งหมด ({records.length})
          </button>
        </div>

        {/* Table Content */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-sm">กำลังโหลดรายการจิตอาสา...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">ไม่พบรายการในหมวดหมู่นี้</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700">
                <thead className="bg-slate-50 font-bold text-slate-700">
                  <tr>
                    <th className="px-6 py-4">นักเรียน</th>
                    <th className="px-6 py-4">กิจกรรม / รายละเอียด</th>
                    <th className="px-6 py-4 text-center">วันที่ทำกิจกรรม</th>
                    <th className="px-6 py-4 text-center">ชั่วโมง</th>
                    <th className="px-6 py-4 text-center">สถานะ</th>
                    <th className="px-6 py-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRecords.map((item) => {
                    const profile = item.profiles;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">
                            {profile?.full_name || "ไม่พบนามนักเรียน"}
                          </p>
                          <p className="text-xs text-slate-500">
                            รหัส: {profile?.student_id_card || "-"} | ชั้น {profile?.grade_level || "-"}/{profile?.classroom || "-"}
                          </p>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <p className="font-bold text-slate-800">{item.activity_name}</p>
                          <p className="text-xs text-slate-500 truncate" title={item.description}>
                            {item.description || "-"}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-center text-slate-600 text-xs">
                          {new Date(item.activity_date).toLocaleDateString("th-TH")}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-blue-600 text-base">
                          {item.hours}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {item.status === "PENDING" && (
                            <span className="px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-700 rounded-lg">
                              ⏳ รอตรวจสอบ
                            </span>
                          )}
                          {item.status === "APPROVED" && (
                            <span className="px-2.5 py-1 text-xs font-bold bg-green-100 text-green-700 rounded-lg">
                              ✅ อนุมัติแล้ว
                            </span>
                          )}
                          {item.status === "REJECTED" && (
                            <span className="px-2.5 py-1 text-xs font-bold bg-red-100 text-red-700 rounded-lg">
                              ❌ ไม่อนุมัติ
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {item.status !== "APPROVED" && (
                              <button
                                onClick={() => handleUpdateStatus(item.id, "APPROVED")}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm"
                              >
                                อนุมัติ
                              </button>
                            )}
                            {item.status !== "REJECTED" && (
                              <button
                                onClick={() => handleUpdateStatus(item.id, "REJECTED")}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                              >
                                ปฏิเสธ
                              </button>
                            )}
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

      </div>
    </div>
  );
}