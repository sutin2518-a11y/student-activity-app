"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Student = {
  id: number;
  student_id_card: string;
  full_name: string | null;
  grade_level: string | null;
  classroom: string | null;
  no: number | null;
  gender: string | null;
  is_active: boolean;
  created_at: string | null;
};
type FormData = {
  student_id_card: string;
  full_name: string;
  grade_level: string;
  classroom: string;
  no: string;
  gender: string;
};
const emptyForm: FormData = {
  student_id_card: "", full_name: "", grade_level: "", classroom: "", no: "", gender: "",
};
const gradeOptions = ["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"];
const boxInput = "peer h-12 w-full rounded-xl border border-slate-300 bg-white px-3 pt-3 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/10 disabled:bg-slate-100";

function FloatingField({ name, value, onChange, disabled, type = "text", required = true }: {
  name: string; value: string; onChange: (value: string) => void; disabled?: boolean; type?: string; required?: boolean;
}) {
  return <label className="relative block">
    <input aria-label={name} type={type} value={value} disabled={disabled} required={required}
      placeholder=" " onChange={(e) => onChange(e.target.value)} className={boxInput} />
    <span className="pointer-events-none absolute left-3 top-0 -translate-y-1/2 rounded bg-white px-1 text-xs font-semibold text-slate-600 transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-red-700">
      {name}
    </span>
  </label>;
}

function FloatingSelect({ name, value, onChange, options, required = true }: {
  name: string; value: string; onChange: (value: string) => void;
  options: { value: string; label: string }[]; required?: boolean;
}) {
  return <label className="relative block">
    <select aria-label={name} value={value} required={required} onChange={(e) => onChange(e.target.value)}
      className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 pt-2 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/10">
      <option value="">-- เลือก --</option>
      {options.map((opt) => <option value={opt.value} key={opt.value}>{opt.label}</option>)}
    </select>
    <span className="pointer-events-none absolute left-3 top-0 -translate-y-1/2 rounded bg-white px-1 text-xs font-semibold text-slate-600">
      {name}
    </span>
  </label>;
}

async function apiRequest<T>(method: "GET" | "POST" | "PATCH" | "DELETE", query = "", body?: unknown): Promise<T> {
  // getSession is only used to send a bearer token. API independently verifies it with Auth.
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (sessionError || !token) throw new Error("กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลก่อนใช้งาน");
  const response = await fetch(`/api/admin/students${query}`, {
    method,
    cache: "no-store",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || `คำขอล้มเหลว (${response.status})`);
  return result as T;
}

export default function StudentMasterAdminPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [q, setQ] = useState("");
  const [grade, setGrade] = useState("");
  const [room, setRoom] = useState("");
  const [status, setStatus] = useState<"active" | "inactive" | "all">("active");
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState<FormData | null>(null);

  const fetchList = useCallback(async (term: string) => {
    const searchParams = new URLSearchParams({ page: String(page), status });
    if (term) searchParams.set("q", term);
    if (grade) searchParams.set("grade", grade);
    if (room) searchParams.set("room", room);
    const result = await apiRequest<{ students: Student[]; total: number }>("GET", `?${searchParams}`);
    return result;
  }, [page, status, grade, room]);

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      fetchList(q.trim()).then((result) => {
        if (alive) { setStudents(result.students); setTotal(result.total); }
      }).catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : "ไม่สามารถอ่านข้อมูลทะเบียนนักเรียนได้");
      }).finally(() => { if (alive) setLoading(false); });
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [q, fetchList, reload]);

  const updateField = (key: keyof FormData, value: string) => {
    setForm((old) => old ? ({ ...old, [key]: value }) : old);
  };
  const openNew = () => { setEditing(null); setForm({ ...emptyForm }); setError(""); setMessage(""); };
  const openEdit = (student: Student) => {
    setEditing(student);
    setForm({
      student_id_card: student.student_id_card,
      full_name: student.full_name || "",
      grade_level: student.grade_level || "",
      classroom: student.classroom || "",
      no: student.no == null ? "" : String(student.no),
      gender: student.gender || "",
    });
    setError(""); setMessage("");
  };
  const notice = (messageText: string) => { setMessage(messageText); setError(""); setReload((n) => n + 1); };

  const submitStudent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form || saving) return;
    if (!/^\d{4,12}$/.test(form.student_id_card.trim())) {
      setError("กรุณากรอกรหัสประจำตัวนักเรียนเป็นตัวเลข 4–12 หลัก"); return;
    }
    const student = { ...form, no: Number(form.no), classroom: form.classroom.trim() };
    setSaving(true); setError("");
    try {
      if (editing) {
        await apiRequest("PATCH", "", { id: editing.id, student });
        notice("แก้ไขข้อมูลนักเรียนเรียบร้อยแล้ว");
      } else {
        await apiRequest("POST", "", { student });
        notice("เพิ่มนักเรียนรายบุคคลเรียบร้อยแล้ว");
      }
      setForm(null); setEditing(null);
    } catch (e) { setError(e instanceof Error ? e.message : "บันทึกข้อมูลไม่สำเร็จ"); }
    finally { setSaving(false); }
  };

  const changeActive = async (student: Student) => {
    if (saving) return;
    const isRestoring = !student.is_active;
    const label = isRestoring ? "คืนสถานะ" : "ปิดใช้งาน";
    if (!window.confirm(`${label}นักเรียน ${student.full_name || student.student_id_card} (รหัส ${student.student_id_card}) ใช่หรือไม่?\nข้อมูลประวัติจะไม่ถูกลบ`)) return;
    setSaving(true); setError("");
    try {
      if (isRestoring) await apiRequest("PATCH", "", { id: student.id, restore: true });
      else await apiRequest("DELETE", "", { id: student.id });
      notice(`${label}ข้อมูลเรียบร้อยแล้ว (ไม่ลบประวัติเดิม)`);
    } catch (e) { setError(e instanceof Error ? e.message : `${label}ไม่สำเร็จ`); }
    finally { setSaving(false); }
  };
  const pageCount = Math.max(1, Math.ceil(total / 50));

  return <div className="mx-auto max-w-7xl space-y-5 text-slate-900">
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="text-xs font-semibold text-red-700">Student Master · CKW</div>
          <h1 className="mt-1 text-2xl font-bold">ทะเบียนนักเรียนกลาง</h1>
          <p className="mt-1 text-sm text-slate-600">จัดการรายบุคคลจากตาราง student_database · ข้อมูลเชื่อมใช้ร่วมกับกิจกรรมโรงเรียน</p>
        </div>
        <button type="button" onClick={openNew} className="rounded-xl bg-red-700 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-800">
          + เพิ่มนักเรียนรายบุคคล
        </button>
      </div>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2"><FloatingField name="ค้นหาด้วยรหัสหรือชื่อ–นามสกุล" value={q} required={false} onChange={(value) => { setQ(value); setPage(1); }} /></div>
        <FloatingSelect name="ระดับชั้น" value={grade} required={false} onChange={(v) => { setGrade(v); setPage(1); }}
          options={gradeOptions.map((value) => ({ value, label: value }))}/>
        <FloatingSelect name="ห้อง" value={room} required={false} onChange={(v) => { setRoom(v); setPage(1); }}
          options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}/>
        <FloatingSelect name="สถานะ" value={status} onChange={(v) => { setStatus(v as "active" | "inactive" | "all"); setPage(1); }}
          options={[{value:"active", label:"ใช้งาน"}, {value:"inactive", label:"ปิดใช้งาน"}, {value:"all", label:"ทั้งหมด"}]}/>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">พบ <strong className="text-slate-900">{total.toLocaleString("th-TH")}</strong> รายการในเงื่อนไขนี้</p>
        <button type="button" onClick={() => setReload((n) => n + 1)} className="text-xs font-semibold text-red-700 underline">รีเฟรชข้อมูล</button>
      </div>
    </section>

    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
    {message && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</div>}

    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-100 text-xs font-semibold text-slate-700">
            <tr><th className="p-4">รหัสนักเรียน</th><th className="p-4">ชื่อ–นามสกุล</th><th className="p-4">ชั้น/ห้อง</th><th className="p-4">เลขที่</th><th className="p-4">เพศ</th><th className="p-4">สถานะ</th><th className="p-4 text-right">จัดการ</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="p-10 text-center text-slate-500">กำลังโหลดข้อมูล...</td></tr>
              : students.length === 0 ? <tr><td colSpan={7} className="p-10 text-center text-slate-500">ไม่พบข้อมูลในเงื่อนไขที่เลือก</td></tr>
              : students.map((s) => <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="p-4 font-mono font-semibold">{s.student_id_card}</td>
                <td className="p-4 font-semibold">{s.full_name || "-"}</td>
                <td className="p-4">{s.grade_level || "-"}/{s.classroom || "-"}</td>
                <td className="p-4">{s.no ?? "-"}</td>
                <td className="p-4">{s.gender || "-"}</td>
                <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${s.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>{s.is_active ? "ใช้งาน" : "ปิดใช้งาน"}</span></td>
                <td className="p-4 text-right whitespace-nowrap">
                  <button type="button" onClick={() => openEdit(s)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">แก้ไข</button>
                  <button type="button" disabled={saving} onClick={() => changeActive(s)}
                    className={`ml-2 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${s.is_active ? "bg-rose-50 text-rose-700 hover:bg-rose-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}>
                    {s.is_active ? "ปิดใช้งาน" : "คืนสถานะ"}
                  </button>
                </td>
              </tr>)}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 text-sm">
        <span className="text-slate-600">หน้า {page} / {pageCount}</span>
        <div className="flex gap-2">
          <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">ก่อนหน้า</button>
          <button type="button" disabled={page >= pageCount || loading} onClick={() => setPage((p) => p + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">ถัดไป</button>
        </div>
      </div>
    </section>

    <p className="text-xs text-amber-800">หมายเหตุ: การปิดใช้งานไม่ลบข้อมูลจริง และระบบกิจกรรมเดิมบางหน้ายังไม่กรองสถานะ is_active จนกว่าจะปรับเชื่อมฐานกลางครบทุกหน้า</p>

    {form && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-3" onClick={() => { if (!saving) setForm(null); }}>
      <div role="dialog" aria-modal="true" aria-label={editing ? "แก้ไขข้อมูลนักเรียน" : "เพิ่มนักเรียน"} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6 flex items-start justify-between gap-3">
          <div><h2 className="text-xl font-bold">{editing ? "แก้ไขข้อมูลนักเรียน" : "เพิ่มนักเรียนรายบุคคล"}</h2><p className="mt-1 text-xs text-slate-500">ข้อมูลจะบันทึกลง student_database โดยตรงผ่าน API ที่ตรวจสิทธิ์ผู้ดูแล</p></div>
          <button type="button" aria-label="ปิดหน้าต่าง" disabled={saving} onClick={() => setForm(null)} className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100">×</button>
        </div>
        {error && <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>}
        <form onSubmit={submitStudent} className="space-y-5">
          <FloatingField name="รหัสประจำตัวนักเรียน" value={form.student_id_card} onChange={(v) => updateField("student_id_card", v)} disabled={Boolean(editing)} />
          {editing && <p className="-mt-4 text-xs text-amber-700">ไม่อนุญาตให้เปลี่ยนรหัสนักเรียนหลังสร้าง เพราะอาจมีข้อมูลกิจกรรมเชื่อมอยู่แล้ว</p>}
          <FloatingField name="ชื่อ–นามสกุล" value={form.full_name} onChange={(v) => updateField("full_name", v)} />
          <div className="grid grid-cols-2 gap-4">
            <FloatingSelect name="ระดับชั้น" value={form.grade_level} onChange={(v) => updateField("grade_level", v)} options={gradeOptions.map((v) => ({value:v, label:v}))}/>
            <FloatingSelect name="ห้อง" value={form.classroom} onChange={(v) => updateField("classroom", v)} options={Array.from({length:12}, (_,i) => ({value:String(i+1), label:String(i+1)}))}/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FloatingField name="เลขที่" type="number" value={form.no} onChange={(v) => updateField("no", v)} />
            <FloatingSelect name="เพศ (ไม่บังคับ)" required={false} value={form.gender} onChange={(v) => updateField("gender", v)} options={[{value:"ชาย", label:"ชาย"}, {value:"หญิง", label:"หญิง"}, {value:"อื่น ๆ", label:"อื่น ๆ"}, {value:"ไม่ระบุ", label:"ไม่ระบุ"}]}/>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" disabled={saving} onClick={() => setForm(null)} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold">ยกเลิก</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-red-700 px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "กำลังบันทึก..." : editing ? "บันทึกการแก้ไข" : "เพิ่มนักเรียน"}</button>
          </div>
        </form>
      </div>
    </div>}
  </div>;
}
