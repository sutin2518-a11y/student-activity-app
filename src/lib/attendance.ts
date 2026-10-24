import { supabase } from "@/lib/supabase";

export async function getStudentAttendanceSummary(
  studentKey: string, 
  activityType: 'CLUB' | 'UNIFORM'
) {
  // 1. ดึงข้อมูลการมาเรียนจริงจากตาราง attendance_records
  const { data: records } = await supabase
    .from("attendance_records")
    .select("attendance_date, status")
    .eq("student_key", studentKey)
    .eq("activity_type", activityType);

  // 2. ดึงข้อมูลวันหยุดพิเศษจากตาราง special_dates
  const { data: specialDates } = await supabase
    .from("special_dates")
    .select("event_date")
    .or(`activity_type.eq.${activityType},activity_type.eq.ALL`);

  // 3. รวมจำนวนวันที่มาเรียนจริง (status = 'มา')
  const actualPresentCount = (records || []).filter(r => r.status === "มา").length;

  // 4. จำนวนวันหยุดพิเศษที่ให้สิทธิ์ฟรี
  const freePresentCount = specialDates ? specialDates.length : 0;

  // 5. รวมวันมาเรียนทั้งหมด
  const totalAttended = actualPresentCount + freePresentCount;

  // เกณฑ์การผ่าน (เช่น 14/18 ครั้ง)
  const isPassed = totalAttended >= 14;

  return {
    actualPresentCount,
    freePresentCount,
    totalAttended,
    status: isPassed ? "ผ" : "มผ"
  };
}