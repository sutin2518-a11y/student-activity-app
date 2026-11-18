"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * CKW Student Activity: Google Workspace only.
 * IMPORTANT: Client redirects are not authorization. Protect API and data with
 * server-side checks and RLS. Do not grant roles from user_metadata.
 */
export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    async function detectExistingLogin() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!mounted) return;
        if (!error && data.user) {
          // Revalidate domain and user profile on the completion page.
          router.replace("/auth/complete");
          return;
        }
      } catch {
        // User can still initiate a new OAuth sign-in below.
      } finally {
        if (mounted) setChecking(false);
      }
    }
    void detectExistingLogin();
    return () => { mounted = false; };
  }, [router]);

  async function loginWithGoogle() {
    if (loading) return;
    setErrorMessage("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/complete`,
          queryParams: {
            hd: "chiangkham.ac.th", // UX hint only; not an access-control check.
            prompt: "select_account",
          },
        },
      });
      if (error) throw error;
      // Browser navigates away to Google's login page.
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "ไม่สามารถเชื่อมต่อ Google ได้");
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 p-4 font-sans">
      <div className="absolute inset-0">
        <Image src="/images/banner.jpg" alt="บรรยากาศโรงเรียนเชียงคำวิทยาคม" fill sizes="100vw" priority className="object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 to-red-900/80 backdrop-blur-sm" />
      </div>
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="bg-red-800 px-6 py-7 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl shadow-sm">🏫</div>
          <h1 className="text-xl font-bold text-white">เข้าสู่ระบบกิจกรรมพัฒนาผู้เรียน</h1>
          <p className="mt-1 text-xs text-red-100">โรงเรียนเชียงคำวิทยาคม</p>
        </header>
        <div className="space-y-4 p-6">
          <p className="text-center text-sm text-slate-700">ใช้บัญชี Google Workspace ของโรงเรียน<br /><span className="font-semibold">@chiangkham.ac.th</span></p>
          {errorMessage && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{errorMessage}</p>}
          <button type="button" onClick={loginWithGoogle} disabled={loading || checking}
            className="w-full rounded-xl bg-red-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-800 disabled:opacity-50">
            {checking ? "กำลังตรวจสอบบัญชี..." : loading ? "กำลังเชื่อมต่อ Google..." : "เข้าสู่ระบบด้วย Google Workspace"}
          </button>
          <p className="text-center text-xs text-slate-500">ไม่ต้องใช้รหัสผ่าน 12345678 หรือสมัครบัญชีด้วยตนเอง</p>
          <div className="border-t border-slate-100 pt-4 text-center">
            <Link href="/" className="text-xs font-semibold text-slate-600 hover:text-red-700">← กลับไปหน้าหลัก</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
