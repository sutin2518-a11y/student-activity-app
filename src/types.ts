// กำหนดหมวดหมู่กิจกรรม
export type ActivityCategory = 'CLUB' | 'UNIFORM' | 'GUIDANCE' | 'SOCIAL';

// โครงสร้างข้อมูลชุมนุม/กิจกรรม
export interface Activity {
  id: number | string; // ปรับตามชนิดข้อมูลจริงใน Supabase
  title: string;
  teacher_name: string;
  department: string;
  max_seats: number;
  target_level: string;
  location: string;
  current_enrolled: number;
  category: ActivityCategory;
  is_elective: boolean;
}

// โครงสร้างข้อมูลผู้ใช้งาน/นักเรียน
export interface Profile {
  id: string;
  role: string;
  grade_level: string;
  classroom: string;
  no: number;
  full_name: string;
  gender: string;
  student_id_card: string;
}

// โครงสร้างข้อมูลจิตอาสา (ตารางใหม่)
export interface SocialServiceLog {
  id: string;
  student_id: string;
  activity_name: string;
  date_performed: string;
  hours: number;
  evidence_url?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  teacher_id?: string;
}