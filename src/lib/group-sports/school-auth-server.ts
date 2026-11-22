import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHmac, randomInt, randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

export const SPORTS_SLUG = "phayao-secondary-group-sports-2569";
const usernamePattern = /^[a-z][a-z0-9._-]{3,31}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizedUsername(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}
export function validUsername(name: string): boolean { return usernamePattern.test(name); }
export function validUUID(value: unknown): value is string { return typeof value === "string" && uuidPattern.test(value); }
// Legacy accounts created before v11 can have passwords longer than 8 characters.
// Keep login validation backward-compatible; do not invalidate existing logins.
export function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8 && value.length <= 128;
}

// New school credentials are deliberately exactly 8 readable alphanumeric characters.
// Existing credentials are never shortened automatically; admins can reset them.
export function validNewSchoolPassword(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9]{8}$/.test(value);
}

const PASSWORD_UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const PASSWORD_LOWER = "abcdefghjkmnpqrstuvwxyz";
const PASSWORD_DIGITS = "23456789";
const PASSWORD_ALPHABET = PASSWORD_UPPER + PASSWORD_LOWER + PASSWORD_DIGITS;

export function generatePassword(): string {
  const pick = (chars: string) => chars[randomInt(chars.length)];
  // Require upper/lowercase letters and a digit, then cryptographically shuffle.
  const chars = [pick(PASSWORD_UPPER), pick(PASSWORD_LOWER), pick(PASSWORD_DIGITS)];
  for (let i = chars.length; i < 8; i++) chars.push(pick(PASSWORD_ALPHABET));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function urlAndPublicKey(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("ยังไม่ได้ตั้งค่า Supabase URL / Anon Key บนเซิร์ฟเวอร์");
  return { url, key };
}
export function createPublicServerAuth() {
  const { url, key } = urlAndPublicKey();
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
export function createSportsAdminClient(): SupabaseClient {
  const { url } = urlAndPublicKey();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY บนเซิร์ฟเวอร์");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
export function getSportsAccountEmailDomain() {
  const domain = process.env.SPORTS_ACCOUNT_EMAIL_DOMAIN?.trim().toLowerCase();
  if (!domain || !/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i.test(domain)) {
    throw new Error("ตั้งค่า SPORTS_ACCOUNT_EMAIL_DOMAIN เป็นโดเมนขององค์กรก่อนสร้างบัญชี");
  }
  return domain;
}
export function generateInternalEmail() {
  return `sports-${randomUUID().replaceAll("-", "")}@${getSportsAccountEmailDomain()}`;
}
export function fingerprint(request: NextRequest, username: string) {
  const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim()
    || request.headers.get("x-forwarded-for")?.split(",")[0].trim()
    || "unknown";
  return createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY || "missing-secret")
    .update(`${ip}|${username}`).digest("hex");
}
export function readBearer(request: NextRequest) {
  const value = request.headers.get("authorization") || "";
  return /^Bearer [a-z0-9._-]+$/i.test(value) ? value.slice(7) : null;
}

export async function requireSportsOrganizer(request: NextRequest, admin: SupabaseClient) {
  const jwt = readBearer(request);
  if (!jwt) return null;
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) return null;
  const competitionResult = await admin.from("sports_competitions").select("id,name").eq("slug", SPORTS_SLUG).maybeSingle();
  if (competitionResult.error) throw competitionResult.error;
  const comp = competitionResult.data;
  if (!comp) throw new Error("ไม่พบการแข่งขันภูลังกาเกมส์ 2569");
  const permissionResult = await admin.from("sports_user_roles")
    .select("role,competition_id").eq("user_id", userData.user.id).eq("is_active", true)
    .in("role", ["super_admin", "competition_admin"]);
  if (permissionResult.error) throw permissionResult.error;
  const permitted = (permissionResult.data || []).some(({role,competition_id}) =>
    (role === "super_admin" && (!competition_id || competition_id === comp.id))
    || (role === "competition_admin" && competition_id === comp.id));
  return permitted ? { userId: userData.user.id, competitionId: comp.id, competitionName: comp.name } : null;
}

export function messageOf(error: unknown) { return error instanceof Error ? error.message : "ไม่สามารถดำเนินการได้"; }
