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
        const isCkwAccount = email.endsWith(SCHOOL_DOMAIN);
        const googleIdentity = user.identities?.some((identity) => identity.provider === "google");
        if (!googleIdentity || !user.email_confirmed_at) {
          await supabase.auth.signOut();
          throw new Error("กรุณาเข้าสู่ระบบด้วยบัญชี Google ที่ยืนยันอีเมลแล้ว");
        }

        if (mounted) setStatus("ยืนยันบัญชี Google แล้ว กำลังตรวจสอบสิทธิ์การใช้งาน...");
        // Delegated officials are approved by their exact, verified Google email.
        // Do not require a CKW staff profile just to enter an assigned sports page.
        const [esportsCheck, certificateCheck, sportsRoleCheck, eventRefereeCheck, centralCheck] = await Promise.all([
          supabase.rpc("sports_esports_my_access"),
          supabase.rpc("sports_cert_my_access"),
          supabase.from("sports_user_roles").select("role").eq("user_id", user.id).eq("is_active", true),
          supabase.rpc("sports_event_referee_my_events"),
          supabase.rpc("sports_central_cert_my_access"),
        ]);
        if (esportsCheck.error) throw new Error("ตรวจสอบสิทธิ์ผู้ดูแล E-Sport ไม่สำเร็จ: " + esportsCheck.error.message);
        // A pending SQL migration should not lock out existing school/E-Sport accounts.
        const certificateRpcMissing = !!certificateCheck.error &&
          ["PGRST202", "42883"].includes(String(certificateCheck.error.code));
        if (certificateCheck.error && !certificateRpcMissing) {
          throw new Error("ตรวจสอบสิทธิ์กรรมการบันทึกอันดับรางวัลไม่สำเร็จ: " + certificateCheck.error.message);
        }
        const refereeRpcMissing = !!eventRefereeCheck.error &&
          ["PGRST202", "42883"].includes(String(eventRefereeCheck.error.code));
        if (eventRefereeCheck.error && !refereeRpcMissing) {
          throw new Error("ตรวจสอบสิทธิ์กรรมการกีฬารายการไม่สำเร็จ: " + eventRefereeCheck.error.message);
        }
        const hasEventRefereeAccess = Array.isArray(eventRefereeCheck.data) && eventRefereeCheck.data.length > 0;
        const hasCentralAccess = !centralCheck.error && centralCheck.data === true;
        const hasEsportsAccess = esportsCheck.data === true;
        const hasCertificateAccess = !certificateRpcMissing && certificateCheck.data === true;
        const missingRoleTable = sportsRoleCheck.error?.code === "42P01" || sportsRoleCheck.error?.code === "PGRST205";
        if (sportsRoleCheck.error && !missingRoleTable && !hasEsportsAccess && !hasCertificateAccess && !hasEventRefereeAccess && !hasCentralAccess) {
          throw new Error("ตรวจสอบสิทธิ์ระบบกีฬากลุ่มไม่สำเร็จ: " + sportsRoleCheck.error.message);
        }
        const sportsRoles = sportsRoleCheck.data || [];
        const hasSportsAccess = sportsRoles.some((item: { role: string }) =>
          ["super_admin", "competition_admin", "school_manager", "referee", "viewer"].includes(String(item.role))
        );
        // A missing/blocked CKW staff profile must not prevent an authorized external referee login.
        const { data: profile, error: profileError } = await supabase
          .from("profiles").select("role").eq("id", user.id).maybeSingle();
        if (profileError && !hasEsportsAccess && !hasCertificateAccess && !hasEventRefereeAccess && !hasCentralAccess) {
          throw new Error("อ่านข้อมูลสิทธิ์ผู้ใช้ไม่สำเร็จ: " + profileError.message);
        }
        const role = typeof profile?.role === "string" ? profile.role.toLowerCase().trim() : "";
        const destination = PATH_BY_ROLE[role];

        const isPrincipalSportsAdmin = (sportsRoles || []).some((item: { role: string }) =>
          ["super_admin", "competition_admin"].includes(String(item.role))
        );
        // A delegated RoV administrator may also be a teacher or school manager;
        // prefer the E-Sport dashboard unless they are already a principal admin.
        if (hasEsportsAccess && !isPrincipalSportsAdmin) {
          if (mounted) router.replace("/group-sports/esports");
          return;
        }
        if (hasCertificateAccess && !isPrincipalSportsAdmin) {
          if (mounted) router.replace("/group-sports/certificates/manage");
          return;
        }
        if (hasEventRefereeAccess && !isPrincipalSportsAdmin) {
          if (mounted) router.replace("/group-sports/officials/my");
          return;
        }
        if (hasCentralAccess && !isPrincipalSportsAdmin) {
          if (mounted) router.replace("/group-sports/certificates/central");
          return;
        }
        if (isCkwAccount && destination) {
          if (mounted) router.replace(destination);
          return;
        }
        if (hasSportsAccess) {
          if (mounted) router.replace("/group-sports");
          return;
        }
        if (!isCkwAccount) {
          await supabase.auth.signOut();
          throw new Error("บัญชีนี้ยังไม่ได้รับสิทธิ์เข้าระบบกีฬากลุ่ม กรุณาติดต่อผู้ประสานงานการแข่งขันให้เพิ่มบัญชีในทะเบียนผู้ใช้งานก่อน");
        }
        if (mounted) {
          setNeedsProvisioning(true);
          setError("บัญชีโรงเรียนผ่านการยืนยันแล้ว แต่ยังไม่ได้เชื่อมสิทธิ์ในระบบกิจกรรม กรุณาติดต่อผู้ดูแลเพื่อจับคู่บัญชีครู/นักเรียนเดิม ไม่ต้องสมัครด้วยรหัสผ่านใหม่");
        }
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
