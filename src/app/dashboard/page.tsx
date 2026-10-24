"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Activity, Profile } from "@/types";

export default function DashboardPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [myEnrolls, setMyEnrolls] = useState<number[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  
  // States สำหรับฟอร์มเพิ่มกิจกรรม
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [teacher, setTeacher] = useState("");
  const [dept, setDept] = useState("");
  const [seats, setSeats] = useState(20);
  const [level, setLevel] = useState("ม.ต้น");
  const [loc, setLoc] = useState("");
  const [category, setCategory] = useState<"CLUB" | "UNIFORM">("CLUB");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      setUserEmail(user.email || "");
      setUserId(user.id);
      
      // 1. ดึงข้อมูล Profile ของนักเรียน
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (prof) setProfile(prof as Profile);

      // 2. ดึงประวัติการลงทะเบียนของเด็กคนนี้
      const { data: en } = await supabase.from("enrollments").select("activity_id").eq("student_id", user.id);
      if (en) setMyEnrolls(en.map(e => Number(e.activity_id)));

      // 3. ดึงรายการกิจกรรมตามเงื่อนไข
      let query = supabase.from("activities").select("*").order("category", { ascending: true }).order("id", { ascending: true });
      
      if (prof?.grade_level === "ม.1" && prof?.gender === "หญิง") {
        query = query.in("category", ["CLUB", "UNIFORM"]);
      } else {
        query = query.eq("category", "CLUB");
      }
      
      const { data: acts } = await query;
      if (acts) setActivities(acts as unknown as Activity[]);
    }
    setLoading(false);
  };

  const handleEnroll = async (actId: number, current: number, max: number, targetCategory: string) => {
    if (current >= max) return alert("กิจกรรมนี้เต็มแล้วครับ");

    const hasEnrolledInCategory = myEnrolls.some(enrolledId => {
      const act = activities.find(a => Number(a.id) === enrolledId);
      return act?.category === targetCategory;
    });

    if (hasEnrolledInCategory) {
      return alert(`คุณได้ลงทะเบียนกิจกรรมประเภท "${targetCategory === 'CLUB' ? 'ชุมนุม' : 'กิจกรรมในเครื่องแบบ'}" ไปแล้ว ไม่สามารถเลือกซ้ำได้ครับ`);
    }

    const { error } = await supabase.from("enrollments").insert([{ student_id: userId, activity_id: actId }]);
    if (error) return alert("สมัครไม่สำเร็จ: " + error.message);
    
    await supabase.from("activities").update({ current_enrolled: current + 1 }).eq("id", actId);
    alert("ลงทะเบียนเรียนเรียบร้อย!");
    fetchData();
  };

  const handleCancel = async (actId: number, current: number) => {
    if (!window.confirm("คุณต้องการยกเลิกกิจกรรมนี้ใช่หรือไม่?")) return;
    const { error } = await supabase.from("enrollments").delete().eq("student_id", userId).eq("activity_id", actId);
    if (error) return alert("ยกเลิกไม่สำเร็จ");
    
    await supabase.from("activities").update({ current_enrolled: Math.max(0, current - 1) }).eq("id", actId);
    alert("ยกเลิกเรียบร้อยแล้ว");
    fetchData();
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("activities").insert([{
      title, teacher_name: teacher, department: dept, max_seats: seats, target_level: level, location: loc, current_enrolled: 0, category: category, is_elective: true
    }]);
    if (error) return alert(error.message);
    alert("เพิ่มกิจกรรมสำเร็จ!");
    setShowForm(false);
    setTitle(""); setTeacher(""); setLoc(""); setDept("");
    fetchData();
  };

  // ตรวจสอบว่าเป็น Admin หรือ Teacher หรือไม่
  const isAdminOrTeacher = profile?.role === "admin" || profile?.role === "teacher";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <nav className="bg-white shadow-sm border-b border-slate-100 py-4 px-6 flex justify-between items-center">
        <h1 className="text-xl font-bold text-slate-950">🎒 ระบบกิจกรรมพัฒนาผู้เรียน</h1>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs font-bold text-slate-700">{profile?.full_name || userEmail}</p>
            <p className="text-xs text-slate-500">ชั้น {profile?.grade_level || "-"} | เพศ: {profile?.gender || "-"}</p>
          </div>
          <button onClick={() => window.location.href = "/student"} className="text-xs font-bold text-slate-600 hover:text-red-600">
            ← กลับหน้าหลัก
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">ตารางรายชื่อกิจกรรม</h2>
            <p className="text-slate-600 text-sm mt-1">สามารถเลือกสมัครกิจกรรม หรือยกเลิกการลงทะเบียนของตนเองได้แบบ Real-time</p>
          </div>
          
          {/* แสดงปุ่มเพิ่มกิจกรรมเฉพาะผู้ที่มี Role เป็น admin หรือ teacher เท่านั้น */}
          {isAdminOrTeacher && (
            <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm">
              {showForm ? "✕ ปิดฟอร์ม" : "＋ เพิ่มกิจกรรมใหม่"}
            </button>
          )}
        </div>

        {/* ฟอร์มเพิ่มกิจกรรม แสดงเฉพาะครู/แอดมิน */}
        {isAdminOrTeacher && showForm && (
          <form onSubmit={handleAdd} className="mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 max-w-2xl">
            <h3 className="font-bold text-sm">เพิ่มรายการกิจกรรมใหม่เข้าระบบ</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input type="text" required placeholder="ชื่อกิจกรรม" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm" />
              <select value={category} onChange={e => setCategory(e.target.value as "CLUB" | "UNIFORM")} className="w-full px-3 py-2 border rounded-xl text-sm bg-white">
                <option value="CLUB">ประเภท: ชุมนุม (CLUB)</option>
                <option value="UNIFORM">ประเภท: กิจกรรมในเครื่องแบบ (UNIFORM)</option>
              </select>
              <input type="text" placeholder="ครูผู้สอน" value={teacher} onChange={e => setTeacher(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm" />
              <input type="text" placeholder="กลุ่มสาระฯ" value={dept} onChange={e => setDept(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm" />
              <input type="text" placeholder="สถานที่เรียน" value={loc} onChange={e => setLoc(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm" />
              <select value={level} onChange={e => setLevel(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm bg-white">
                <option value="ม.ต้น">ม.ต้น (ม.1 - ม.3)</option>
                <option value="ม.ปลาย">ม.ปลาย (ม.4 - ม.6)</option>
                <option value="ม.1 เท่านั้น">ม.1 เท่านั้น</option>
                <option value="ทุกระดับชั้น">ทุกระดับชั้น</option>
              </select>
              <input type="number" required placeholder="จำนวนที่รับสมัคร" value={seats} onChange={e => setSeats(Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl text-sm" />
            </div>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-sm">บันทึกข้อมูลเข้า Supabase</button>
          </form>
        )}

        {loading ? (
          <p className="text-slate-500 text-sm">กำลังโหลดข้อมูลกิจกรรม...</p>
        ) : activities.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200"><p className="text-slate-500">ไม่มีกิจกรรมที่เปิดรับสมัครสำหรับคุณในขณะนี้</p></div>
        ) : (
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-100">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700">
                <thead className="bg-slate-900 text-white font-medium">
                  <tr>
                    <th className="px-6 py-4">หมวดหมู่</th>
                    <th className="px-6 py-4">ชื่อกิจกรรม</th>
                    <th className="px-6 py-4">ครูผู้สอน</th>
                    <th className="px-6 py-4 text-center">เงื่อนไข</th>
                    <th className="px-6 py-4 text-center">รับ</th>
                    <th className="px-6 py-4 text-center">สมัครแล้ว</th>
                    <th className="px-6 py-4 text-center">สถานะ</th>
                    <th className="px-6 py-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {activities.map((act) => {
                    const max = Number(act.max_seats) || 0;
                    const enrolled = Number(act.current_enrolled) || 0;
                    const rem = max - enrolled;
                    const isJoined = myEnrolls.includes(Number(act.id));
                    const isFull = rem <= 0;
                    const isClub = act.category === "CLUB";

                    return (
                      <tr key={act.id} className={`hover:bg-slate-50 transition-colors ${isJoined ? "bg-blue-50/50" : ""}`}>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-xs font-bold ${isClub ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                            {isClub ? "📌 ชุมนุม" : "⚜️ เครื่องแบบ"}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900">{act.title}</td>
                        <td className="px-6 py-4 text-slate-600">{act.teacher_name || "-"}</td>
                        <td className="px-6 py-4 text-center font-medium text-purple-600"><span className="bg-purple-50 px-2.5 py-1 rounded-lg">{act.target_level || "ทุกระดับชั้น"}</span></td>
                        <td className="px-6 py-4 text-center font-semibold text-slate-900">{max}</td>
                        <td className="px-6 py-4 text-center font-semibold text-green-600">{enrolled}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isFull ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{isFull ? "เต็ม" : "ว่าง"}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isJoined ? (
                            <button onClick={() => handleCancel(Number(act.id), enrolled)} className="px-4 py-2 text-xs font-bold rounded-xl text-white bg-red-500 hover:bg-red-600 shadow-sm shadow-red-100">✕ ยกเลิกสมัคร</button>
                          ) : (
                            <button disabled={isFull} onClick={() => handleEnroll(Number(act.id), enrolled, max, act.category)} className={`px-4 py-2 text-xs font-bold rounded-xl shadow-sm ${isFull ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100"}`}>
                              {isClub ? "สมัครชุมนุม" : "สมัครกิจกรรมนี้"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}