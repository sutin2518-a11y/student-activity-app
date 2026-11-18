"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const SCHOOL_DOMAIN = "@chiangkham.ac.th";
const PATH_BY_ROLE: Record<string, string> = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
};

/**
 * Client callback for a browser Supabase client. Supports an implicit session,
 * and attempts a PKCE code exchange only when no session was recovered.
 * No profile is auto-created and no role is auto-granted.
 */
export default function AuthCompletePage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [status, setStatus] = useState("กำลังตรวจสอบการเข้าสู่ระบบ...");
  const [needsProvisioning, setNeedsProvisioning] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function completeLogin() {
      try {
        const params = new URLSearchParams(window.location.search);
        const providerError = params.get("error_description") || params.get("error");
        if (providerError) throw new Error(providerError);

        let { data: userData, error: userError } = await supabase.auth.getUser();
        // When a browser client uses PKCE, an authorization code can be present.
        const code = params.get("code");
        if ((!userData.user || userError) && code) {
          const exchanged = await supabase.auth.exchangeCodeForSession(code);
          if (exchanged.error) throw exchanged.error;
          ({ data: userData, error: userError } = await supabase.auth.getUser());
        }
        if (userError || !userData.user) {
          throw new Error("ไม่พบการเข้าสู่ระบบ กรุณากลับไปกดปุ่ม Google Workspace อีกครั้ง");
        }

        const user = userData.user;
        const email = (user.email ?? "").trim().toLowerCase();
        const googleIdentity = user.identities?.some((identity) => identity.provider === "google");
        if (!email.endsWith(SCHOOL_DOMAIN) || !googleIdentity || !user.email_confirmed_at) {
          await supabase.auth.signOut();
          throw new Error("ต้องเข้าสู่ระบบด้วยบัญชี Google Workspace @chiangkham.ac.th ที่ยืนยันแล้วเท่านั้น");
        }

        if (mounted) setStatus("ยืนยันบัญชีโรงเรียนแล้ว กำลังตรวจสอบบทบาท...");
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        if (profileError) throw new Error("อ่านข้อมูลสิทธิ์ผู้ใช้ไม่สำเร็จ: " + profileError.message);

        const role = typeof profile?.role === "string" ? profile.role.toLowerCase().trim() : "";
        const destination = PATH_BY_ROLE[role];
        if (!destination) {
          if (mounted) {
            setNeedsProvisioning(true);
            setError("บัญชีโรงเรียนผ่านการยืนยันแล้ว แต่ยังไม่ได้เชื่อมสิทธิ์ในระบบกิจกรรม กรุณาติดต่อผู้ดูแลเพื่อจับคู่บัญชีครู/นักเรียนเดิม ไม่ต้องสมัครด้วยรหัสผ่านใหม่");
          }
          return;
        }
        if (mounted) router.replace(destination);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
      }
    }

    void completeLogin();
    return () => { mounted = false; };
  }, [router]);

  async function resetAndLogin() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="mb-3 text-lg font-bold text-slate-900">ยืนยันบัญชีโรงเรียน</h1>
        <p className="text-sm text-slate-600" aria-live="polite">{status}</p>
        {error && <div role="alert" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{error}</div>}
        {error && <div className="mt-5 flex gap-3">
          <button type="button" onClick={resetAndLogin} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white">{needsProvisioning ? "ใช้บัญชีอื่น" : "ลองเข้าสู่ระบบใหม่"}</button>
          <Link href="/" className="rounded-lg border px-4 py-2 text-sm text-slate-700">หน้าหลัก</Link>
        </div>}
      </section>
    </main>
  );
}
