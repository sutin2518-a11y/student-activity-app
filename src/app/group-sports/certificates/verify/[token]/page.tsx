import { Suspense } from "react";
import VerifyCertificateClient from "./verify-certificate-client";

function VerifyCertificateFallback() {
  return (
    <main className="min-h-screen bg-[#f4f6f9] px-4 py-16 text-slate-900">
      <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-xl">
        <header className="bg-gradient-to-r from-red-900 to-slate-900 px-6 py-7 text-white">
          <div className="text-xs font-bold tracking-widest text-amber-300">PHULANGKA GAMES 2026</div>
          <h1 className="mt-2 text-2xl font-extrabold">ตรวจสอบเกียรติบัตร</h1>
        </header>
        <div className="px-6 py-7">
          <p role="status" aria-live="polite">กำลังโหลดข้อมูลตรวจสอบเกียรติบัตร...</p>
        </div>
      </div>
    </main>
  );
}

export default function VerifyCertificatePage() {
  return (
    <Suspense fallback={<VerifyCertificateFallback />}>
      <VerifyCertificateClient />
    </Suspense>
  );
}
