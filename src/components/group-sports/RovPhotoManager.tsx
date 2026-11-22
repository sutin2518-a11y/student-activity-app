"use client";

import { useEffect, useState } from "react";
import { downloadRovPhoto, uploadRovPhoto, verifyPhotoFile, type PhotoAthlete } from "@/lib/group-sports/rov-photos";

/** Attach/retry photographs after registration, without creating duplicate entries. */
export default function RovPhotoManager({ entryId, athletes }: { entryId: string; athletes: PhotoAthlete[] }) {
  const [photos, setPhotos] = useState<Record<number, string>>({});
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];
    setPhotos({});
    setLoading(true);
    void (async () => {
      const entries = await Promise.all(athletes.slice(0, 7).map(async (player, index) => {
        const url = await downloadRovPhoto(entryId, index, player).catch(() => null);
        if (url) objectUrls.push(url);
        return [index, url] as const;
      }));
      if (!cancelled) {
        setPhotos(Object.fromEntries(entries.filter(([, url]) => Boolean(url))) as Record<number, string>);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      for (const url of objectUrls) URL.revokeObjectURL(url);
    };
  }, [entryId, athletes, revision]);

  return (
    <section className="mt-4 rounded-xl border border-rose-200 bg-white p-4">
      <h3 className="font-black text-red-900">รูปถ่ายนักกีฬา RoV สำหรับใบสมัครหน้า 2</h3>
      <p className="mt-1 text-xs text-slate-600">แนบรูป JPG / PNG / WebP ไม่เกิน 5 MB ต่อคน รูปถูกเก็บส่วนตัว และจะแสดงในใบสมัคร PDF ตามลำดับผู้เล่นโดยอัตโนมัติ</p>
      {message && <p role="status" className="my-2 rounded-lg bg-rose-50 p-2 text-sm font-semibold text-red-800">{message}</p>}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {athletes.slice(0, 7).map((player, index) => (
          <div key={`${index}-${player.student_code || player.full_name}`} className="rounded-lg border border-slate-200 p-2 text-center">
            <div className="mx-auto flex h-28 w-20 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50">
              {photos[index] ? <img src={photos[index]} alt={`รูป ${player.full_name}`} className="h-full w-full object-cover"/> : <span className="text-xs text-slate-400">{loading ? "กำลังโหลด" : "ยังไม่มีรูป"}</span>}
            </div>
            <p className="mt-2 truncate text-xs font-bold" title={player.full_name}>คนที่ {index + 1} · {player.full_name}</p>
            <label className="mt-2 block cursor-pointer rounded-md bg-red-700 p-2 text-xs font-bold text-white hover:bg-red-800">
              {uploading === index ? "กำลังอัปโหลด..." : photos[index] ? "เปลี่ยนรูป" : "แนบรูป"}
              <input aria-label={`แนบรูป ${player.full_name}`} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading !== null} onChange={event => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (!file) return;
                setMessage("");
                setUploading(index);
                void (async () => {
                  try {
                    verifyPhotoFile(file);
                    await uploadRovPhoto(entryId, index, player, file);
                    setRevision(value => value + 1);
                    setMessage(`บันทึกรูปนักกีฬาคนที่ ${index + 1} เรียบร้อยแล้ว`);
                  } catch (cause) {
                    setMessage(cause instanceof Error ? cause.message : "อัปโหลดรูปไม่สำเร็จ");
                  } finally {
                    setUploading(null);
                  }
                })();
              }}/>
            </label>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-600">หลังแนบรูป กด “พิมพ์ / บันทึก PDF” อีกครั้ง ระบบจะใช้รูปที่บันทึกแล้ว โดยไม่ต้องลงทะเบียนทีมใหม่</p>
    </section>
  );
}
