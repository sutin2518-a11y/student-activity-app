import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const TABLE = "student_database";
const PAGE_SIZE = 50;

type StudentInput = {
  student_id_card: string;
  full_name: string;
  grade_level: string;
  classroom: string;
  no: number;
  gender: string | null;
};

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" },
  });
}

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Legacy service role OR new server secret key. NEVER use NEXT_PUBLIC_ prefix here.
  const privateKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const allowed = (process.env.STUDENT_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!url || !publicKey || !privateKey || allowed.length === 0) return null;
  return { url, publicKey, privateKey, allowed };
}

async function requireAdministrator(req: NextRequest) {
  const cfg = config();
  if (!cfg) return { error: reply({ error: "ยังไม่ได้ตั้งค่า Server Environment สำหรับผู้ดูแลทะเบียนนักเรียน" }, 503) };
  const bearer = req.headers.get("authorization") || "";
  const match = /^Bearer\s+([^\s]+)$/.exec(bearer);
  if (!match) return { error: reply({ error: "กรุณาเข้าสู่ระบบก่อน" }, 401) };

  // The Auth server, not browser-side roles or getSession(), validates identity.
  const publicClient = createClient(cfg.url, cfg.publicKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await publicClient.auth.getUser(match[1]);
  const user = data.user;
  if (error || !user) return { error: reply({ error: "เซสชันหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่" }, 401) };

  const email = (user.email || "").trim().toLowerCase();
  if (!email || !cfg.allowed.includes(email) || !user.email_confirmed_at) {
    return { error: reply({ error: "บัญชีนี้ไม่มีสิทธิ์จัดการทะเบียนนักเรียน" }, 403) };
  }

  const admin = createClient(cfg.url, cfg.privateKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return { admin, userId: user.id, email };
}

function validateInput(input: unknown): { data: StudentInput } | { error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "รูปแบบข้อมูลไม่ถูกต้อง" };
  const obj = input as Record<string, unknown>;
  const student_id_card = String(obj.student_id_card ?? "").trim();
  const full_name = String(obj.full_name ?? "").trim().replace(/\s+/g, " ");
  const grade_level = String(obj.grade_level ?? "").trim();
  const classroom = String(obj.classroom ?? "").trim();
  const number = Number(obj.no);
  const gender = String(obj.gender ?? "").trim() || null;

  if (!/^\d{4,12}$/.test(student_id_card)) return { error: "รหัสนักเรียนต้องเป็นตัวเลข 4–12 หลัก" };
  if (full_name.length < 2 || full_name.length > 160) return { error: "กรุณาระบุชื่อ–นามสกุล ความยาวไม่เกิน 160 ตัวอักษร" };
  if (!["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"].includes(grade_level)) return { error: "กรุณาเลือกระดับชั้น ม.1 ถึง ม.6" };
  if (!/^(?:[1-9]|[12]\d|30)$/.test(classroom)) return { error: "ห้องเรียนต้องเป็นตัวเลข 1–30" };
  if (!Number.isInteger(number) || number < 1 || number > 100) return { error: "เลขที่ต้องเป็นจำนวนเต็ม 1–100" };
  if (gender && !["ชาย", "หญิง", "อื่น ๆ", "ไม่ระบุ"].includes(gender)) return { error: "เพศไม่อยู่ในรูปแบบที่รองรับ" };
  return { data: { student_id_card, full_name, grade_level, classroom, no: number, gender } };
}

function databaseError(code?: string, message?: string) {
  if (code === "23505") return reply({ error: "รหัสนักเรียนซ้ำกับข้อมูลที่มีอยู่แล้ว" }, 409);
  if (code === "23503") return reply({ error: "ข้อมูลยังถูกอ้างอิงอยู่ ไม่สามารถแก้ไขรายการนี้ได้" }, 409);
  if (code === "P0002") return reply({ error: "ไม่พบรายชื่อนักเรียนที่ต้องการแก้ไข" }, 404);
  // Avoid exposing DB internals and student data to the caller.
  console.error("student-master database error:", code, message);
  return reply({ error: "จัดการข้อมูลไม่สำเร็จ กรุณาตรวจ SQL Migration และสิทธิ์ฐานข้อมูล" }, 500);
}

async function parseBody(req: NextRequest) {
  if (Number(req.headers.get("content-length") || 0) > 12000) return null;
  try {
    const raw = await req.text();
    if (raw.length > 12000) return null;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>) : null;
  } catch { return null; }
}

function validId(value: unknown): number | null {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

async function write(
  req: NextRequest,
  operation: "CREATE" | "UPDATE" | "DEACTIVATE" | "RESTORE",
  preParsed?: Record<string, unknown>,
) {
  const auth = await requireAdministrator(req);
  if ("error" in auth) return auth.error;
  const body = preParsed ?? await parseBody(req);
  if (!body) return reply({ error: "รูปแบบคำขอไม่ถูกต้อง" }, 400);

  const id = operation === "CREATE" ? null : validId(body.id);
  if (operation !== "CREATE" && id === null) return reply({ error: "รหัสรายการไม่ถูกต้อง" }, 400);

  let payload: Record<string, unknown> = {};
  if (operation === "CREATE" || operation === "UPDATE") {
    const result = validateInput(body.student);
    if ("error" in result) return reply({ error: result.error }, 400);
    payload = { ...result.data };
    // Existing student IDs are immutable. Otherwise linked attendance data can diverge.
    if (operation === "UPDATE") delete payload.student_id_card;
  }

  const { data, error } = await auth.admin.rpc("manage_student_master", {
    p_operation: operation,
    p_actor_user_id: auth.userId,
    p_actor_email: auth.email,
    p_id: id,
    p_payload: payload,
  });
  if (error) return databaseError(error.code, error.message);
  return reply({ record: data?.record ?? data });
}

export async function GET(req: NextRequest) {
  const auth = await requireAdministrator(req);
  if ("error" in auth) return auth.error;

  const params = req.nextUrl.searchParams;
  const page = Math.min(2000, Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1));
  const grade = params.get("grade") || "";
  const room = params.get("room") || "";
  const status = params.get("status") || "active";
  const search = (params.get("q") || "").trim().slice(0, 80);
  if (grade && !["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"].includes(grade)) return reply({ error: "ระดับชั้นไม่ถูกต้อง" }, 400);
  if (room && !/^(?:[1-9]|[12]\d|30)$/.test(room)) return reply({ error: "ห้องไม่ถูกต้อง" }, 400);
  if (!["active", "inactive", "all"].includes(status)) return reply({ error: "สถานะไม่ถูกต้อง" }, 400);

  let query = auth.admin
    .from(TABLE)
    .select("id, student_id_card, full_name, grade_level, classroom, no, gender, is_active, created_at", { count: "exact" });
  if (grade) query = query.eq("grade_level", grade);
  if (room) query = query.eq("classroom", room);
  if (status === "active") query = query.eq("is_active", true);
  if (status === "inactive") query = query.eq("is_active", false);
  if (search) {
    if (/^\d+$/.test(search)) query = query.eq("student_id_card", search);
    else {
      const safe = search.replace(/[^\p{L}\p{N}\s.\-]/gu, "").trim();
      if (safe) query = query.ilike("full_name", `%${safe}%`);
    }
  }

  const { data, error, count } = await query
    .order("grade_level", { ascending: true })
    .order("classroom", { ascending: true })
    .order("no", { ascending: true })
    .order("id", { ascending: true })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) return databaseError(error.code, error.message);
  return reply({ students: data || [], total: count || 0, page, pageSize: PAGE_SIZE });
}

export async function POST(req: NextRequest) { return write(req, "CREATE"); }
export async function PATCH(req: NextRequest) {
  const body = await parseBody(req);
  if (!body) return reply({ error: "รูปแบบคำขอไม่ถูกต้อง" }, 400);
  return write(req, body.restore === true ? "RESTORE" : "UPDATE", body);
}
export async function DELETE(req: NextRequest) { return write(req, "DEACTIVATE"); }
