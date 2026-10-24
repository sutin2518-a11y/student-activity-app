"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";

export default function ActivityManager() {
  const [activities, setActivities] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("CLUB");
  const [targetLevel, setTargetLevel] = useState("ม.ต้น");
  const [requirements, setRequirements] = useState("");
  const [maxSeats, setMaxSeats] = useState(20);
  const [teacherName, setTeacherName] = useState("");
  const [department, setDepartment] = useState("ภาษาไทย");
  const [location, setLocation] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: acts } = await supabase.from("activities").select("*").order("id", { ascending: false });
    setActivities(acts || []);
    const { data: tList } = await supabase.from("teachers").select("*").order("full_name", { ascending: true });
    setTeachers(tList || []);
    setLoading(false);
  };

  const handleTeacherChange = (val: string) => {
    setTeacherName(val);
    const matchedTeacher = teachers.find((t) => t.full_name === val);
    if (matchedTeacher && matchedTeacher.department) setDepartment(matchedTeacher.department);
  };

  const handleEditClick = (act: any) => {
    setEditingId(act.id); setTitle(act.title || ""); setCategory(act.category || "CLUB");
    setTargetLevel(act.target_level || "ม.ต้น"); setRequirements(act.requirements || "");
    setMaxSeats(act.max_seats || 20); setTeacherName(act.teacher_name || "");
    setDepartment(act.department || "ภาษาไทย"); setLocation(act.location || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null); setTitle(""); setCategory("CLUB"); setTargetLevel("ม.ต้น");
    setRequirements(""); setMaxSeats(20); setTeacherName(""); setDepartment("ภาษาไทย"); setLocation("");
  };

  const handleSubmitActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { title, category, target_level: targetLevel, requirements, max_seats: Number(maxSeats), teacher_name: teacherName, department, location };
    
    if (editingId) {
      const { error } = await supabase.from("activities").update(payload).eq("id", editingId);
      if (error) Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: error.message });
      else { Swal.fire({ icon: "success", title: "แก้ไขสำเร็จ! ✨" }); handleCancelEdit(); fetchData(); }
    } else {
      const { error } = await supabase.from("activities").insert([{ ...payload, current_enrolled: 0 }]);
      if (error) Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: error.message });
      else { Swal.fire({ icon: "success", title: "บันทึกสำเร็จ! 🎉" }); handleCancelEdit(); fetchData(); }
    }
    setSaving(false);
  };

  const handleDelete = async (id: number, actTitle: string) => {
    const confirmResult = await Swal.fire({ title: "ยืนยันการลบ?", text: `ลบกิจกรรม "${actTitle}"?`, icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "ลบกิจกรรม", customClass: { popup: "rounded-3xl" } });
    if (!confirmResult.isConfirmed) return;
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) Swal.fire({ icon: "error", title: "ลบไม่สำเร็จ", text: error.message });
    else { Swal.fire({ icon: "success", title: "ลบเรียบร้อย" }); fetchData(); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form */}
      <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-fit space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-slate-900 text-base">{editingId ? "✏️ แก้ไขกิจกรรม" : "＋ เพิ่มกิจกรรมใหม่"}</h2>
          {editingId && <button onClick={handleCancelEdit} className="text-xs text-slate-400 underline font-bold">ยกเลิก</button>}
        </div>
        <form onSubmit={handleSubmitActivity} className="space-y-3">
          <div><label className="block text-xs font-bold text-slate-600 mb-1">ชื่อกิจกรรม</label><input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs" /></div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">หมวดหมู่</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-white text-blue-700 font-bold">
              <option value="CLUB">📌 ชุมนุม (CLUB)</option><option value="UNIFORM">⚜️ เครื่องแบบ (UNIFORM)</option><option value="GUIDANCE">🧭 แนะแนว (GUIDANCE)</option><option value="COMMUNITY_SERVICE">🤝 จิตอาสา (COMMUNITY_SERVICE)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">ระดับชั้นที่รับ</label>
            <select value={targetLevel} onChange={(e) => setTargetLevel(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-white">
              <option value="ม.1">ม.1</option><option value="ม.2">ม.2</option><option value="ม.3">ม.3</option><option value="ม.4">ม.4</option><option value="ม.5">ม.5</option><option value="ม.6">ม.6</option><option value="ม.ต้น">ม.ต้น</option><option value="ม.ปลาย">ม.ปลาย</option><option value="ทุกระดับชั้น">ทุกระดับชั้น</option>
            </select>
          </div>
          <div><label className="block text-xs font-bold text-amber-800 mb-1">⚠️ เงื่อนไขเพิ่มเติม</label><input type="text" value={requirements} onChange={(e) => setRequirements(e.target.value)} className="w-full px-3 py-2 border border-amber-200 bg-amber-50/40 rounded-xl text-xs" /></div>
          <div><label className="block text-xs font-bold text-slate-600 mb-1">จำนวนที่รับ</label><input type="number" min="1" required value={maxSeats} onChange={(e) => setMaxSeats(Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl text-xs" /></div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">ครูผู้สอน</label>
            <input type="text" list="teachers-list" value={teacherName} onChange={(e) => handleTeacherChange(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs" />
            <datalist id="teachers-list">{teachers.map((t) => (<option key={t.id} value={t.full_name}>{t.full_name}</option>))}</datalist>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">กลุ่มสาระฯ</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs bg-white">
              <option value="ภาษาไทย">ภาษาไทย</option><option value="คณิตศาสตร์">คณิตศาสตร์</option><option value="วิทยาศาสตร์และเทคโนโลยี">วิทยาศาสตร์และเทคโนโลยี</option><option value="สังคมศึกษา ศาสนา และวัฒนธรรม">สังคมศึกษา ศาสนา และวัฒนธรรม</option><option value="สุขศึกษาและพลศึกษา">สุขศึกษาและพลศึกษา</option><option value="ศิลปศึกษา">ศิลปศึกษา</option><option value="การงานอาชีพ">การงานอาชีพ</option><option value="ภาษาต่างประเทศ">ภาษาต่างประเทศ</option><option value="กิจกรรมพัฒนาผู้เรียน">กิจกรรมพัฒนาผู้เรียน / อื่นๆ</option>
            </select>
          </div>
          <div><label className="block text-xs font-bold text-slate-600 mb-1">สถานที่</label><input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs" /></div>
          <button type="submit" disabled={saving} className={`w-full py-2.5 text-white font-bold text-xs rounded-xl ${editingId ? "bg-amber-600" : "bg-blue-600"}`}>{saving ? "บันทึก..." : editingId ? "บันทึกการแก้ไข" : "บันทึกกิจกรรมใหม่"}</button>
        </form>
      </div>

      {/* List */}
      <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="font-bold text-slate-900 text-base">📋 รายการกิจกรรมทั้งหมด ({activities.length})</h2>
        {loading ? <p className="text-xs text-center py-8 text-slate-400">กำลังโหลด...</p> : (
          <div className="space-y-3">
            {activities.map((act) => (
              <div key={act.id} className="p-4 rounded-2xl border bg-slate-50 flex justify-between items-center gap-4">
                <div>
                  <div className="flex gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md">{act.category}</span>
                    {act.department && <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md">{act.department}</span>}
                  </div>
                  <span className="font-bold text-sm text-slate-900">{act.title}</span>
                  {act.requirements && <p className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mt-1 inline-block">⚠️ {act.requirements}</p>}
                  <p className="text-[11px] text-slate-500 mt-1">ครู: {act.teacher_name || "-"} | รับ: {act.target_level} | ผู้สมัคร: {act.current_enrolled || 0}/{act.max_seats}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEditClick(act)} className="px-3 py-1.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-xl">✏️ แก้ไข</button>
                  <button onClick={() => handleDelete(act.id, act.title)} className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded-xl">🗑️ ลบ</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}