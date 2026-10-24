"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function TeacherDashboard() {
  // สมมติว่าดึงชื่อครูมาจากระบบ Login (ต้องแก้ให้ตรงกับ session จริงของคุณ)
  const currentUserName = "ชื่อครูที่ล็อกอิน"; 
  
  const [assignedGroups, setAssignedGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAssignedGroups();
  }, [currentUserName]);

  const fetchAssignedGroups = async () => {
    const { data } = await supabase
      .from("uniform_teachers")
      .select("*")
      .eq("teacher_name", currentUserName);
    setAssignedGroups(data || []);
  };

  const handleSelectGroup = async (group: any) => {
    setSelectedGroup(group);
    setLoading(true);
    const { data } = await supabase
      .from("uniform_activities")
      .select("*")
      .eq("activity_name", group.activity_name)
      .eq("grade_level", group.grade_level)
      .eq("level_1", group.group_no)
      .eq("level_2", group.division_no)
      .order("no", { ascending: true });
    
    setStudents(data || []);
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      <h1 className="text-2xl font-bold mb-6">📝 ระบบเช็คชื่อกิจกรรม (สำหรับครู)</h1>
      
      <div className="flex gap-4 mb-6">
        {assignedGroups.map((group) => (
          <button
            key={group.id}
            onClick={() => handleSelectGroup(group)}
            className={`px-4 py-2 rounded-xl border font-bold text-sm ${
              selectedGroup?.id === group.id 
                ? "bg-blue-600 text-white" 
                : "bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {group.activity_name} {group.grade_level} (กลุ่ม {group.group_no} กอง {group.division_no})
          </button>
        ))}
      </div>

      {selectedGroup && (
        <div className="bg-white rounded-2xl shadow-sm border p-4 overflow-x-auto">
          {loading ? (
            <p className="text-center py-4 text-slate-500">กำลังโหลดรายชื่อ...</p>
          ) : (
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-3 border-b">เลขที่</th>
                  <th className="p-3 border-b">ชื่อ-สกุล</th>
                  <th className="p-3 border-b">ห้อง</th>
                  {Array.from({ length: 18 }).map((_, i) => (
                    <th key={i} className="p-2 border-b text-center w-12">ส{i + 1}</th>
                  ))}
                  <th className="p-3 border-b text-center">สรุปผล</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 border-b">
                    <td className="p-3">{student.no}</td>
                    <td className="p-3 font-medium">{student.full_name}</td>
                    <td className="p-3">{student.classroom}</td>
                    {Array.from({ length: 18 }).map((_, i) => (
                      <td key={i} className="p-2 text-center">
                        <input type="checkbox" className="w-4 h-4 rounded text-blue-600" />
                      </td>
                    ))}
                    <td className="p-3 text-center font-bold text-slate-400">-</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}