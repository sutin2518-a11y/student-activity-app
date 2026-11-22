/** Private athlete headshots for the official two-page RoV application.
 * The photo object key is bound to both the entry and the athlete's name/code
 * and original roster position. Thus changing the roster can NEVER display
 * somebody else's previously uploaded photo by accident.
 */
import { supabase } from "@/lib/supabase";

export const ROV_PHOTO_BUCKET = "sports-athlete-photos";
export type PhotoAthlete = { full_name: string; student_code?: string | null };
export const ROV_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const JPG_MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function verifyPhotoFile(file: File) {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("รองรับเฉพาะรูป JPG, PNG หรือ WebP");
  if (!file.size || file.size > ROV_PHOTO_MAX_BYTES) throw new Error("รูปต้องมีขนาดไม่เกิน 5 MB");
}

/** Stable object key without any student name, student ID or phone in the URL. */
export async function athletePhotoPath(entryId: string, index: number, athlete: PhotoAthlete): Promise<string> {
  if (!/^[a-f0-9]{8}-[a-f0-9-]{27,}$/i.test(entryId) || index < 0 || index >= 7) {
    throw new Error("รหัสใบสมัครหรือลำดับนักกีฬาไม่ถูกต้อง");
  }
  const identity = `${athlete.full_name.normalize("NFKC").trim()}\n${(athlete.student_code || "").trim()}`;
  const bytes = new TextEncoder().encode(identity);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const tag = Array.from(digest.subarray(0, 10), byte => byte.toString(16).padStart(2, "0")).join("");
  return `${entryId}/${index + 1}-${tag}.jpg`;
}

async function encodeJpeg(input: File): Promise<Blob> {
  verifyPhotoFile(input);
  const objectUrl = URL.createObjectURL(input);
  try {
    const img = new Image();
    img.src = objectUrl;
    await img.decode();
    if (!img.naturalWidth || !img.naturalHeight) throw new Error("ไม่สามารถอ่านรูปถ่ายนี้ได้");
    const maxWidth = 900;
    const maxHeight = 1200;
    const scale = Math.min(1, maxWidth / img.naturalWidth, maxHeight / img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("ไม่สามารถแปลงรูปภาพได้");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const jpeg = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result =>
      result ? resolve(result) : reject(new Error("ไม่สามารถสร้างภาพ JPEG ได้")), "image/jpeg", 0.86));
    if (jpeg.size > JPG_MAX_BYTES) throw new Error("รูปหลังแปลงใหญ่เกิน 3 MB กรุณาลดขนาดรูป");
    return jpeg;
  } catch (cause) {
    if (cause instanceof Error && /ไม่สามารถ|ใหญ่เกิน/.test(cause.message)) throw cause;
    throw new Error("ไม่สามารถเปิดรูปนี้ได้ กรุณาเลือกไฟล์ JPG, PNG หรือ WebP ที่สมบูรณ์");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Upload is permitted by Supabase Storage RLS only to an authorized school/organizer. */
export async function uploadRovPhoto(entryId: string, index: number, athlete: PhotoAthlete, file: File) {
  const [path, jpeg] = await Promise.all([athletePhotoPath(entryId, index, athlete), encodeJpeg(file)]);
  const result = await supabase.storage.from(ROV_PHOTO_BUCKET).upload(path, jpeg, {
    contentType: "image/jpeg", cacheControl: "0", upsert: true,
  });
  if (result.error) throw new Error(`แนบรูปนักกีฬาคนที่ ${index + 1} ไม่สำเร็จ: ${result.error.message}`);
}

/** Returns a local blob URL (never a public or long-lived link). Caller revokes it. */
export async function downloadRovPhoto(entryId: string, index: number, athlete: PhotoAthlete): Promise<string | null> {
  const path = await athletePhotoPath(entryId, index, athlete);
  const result = await supabase.storage.from(ROV_PHOTO_BUCKET).download(path);
  if (result.error || !result.data) return null; // Unattached images show an empty paper frame.
  const blobUrl = URL.createObjectURL(result.data);
  try {
    const img = new Image();
    img.src = blobUrl;
    await img.decode();
    return blobUrl;
  } catch {
    URL.revokeObjectURL(blobUrl);
    return null;
  }
}
