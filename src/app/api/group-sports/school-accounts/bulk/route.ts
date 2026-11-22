import { NextRequest, NextResponse } from "next/server";
import { nextSchoolUsername } from "@/lib/group-sports/school-username-generator";
import {
  createSportsAdminClient, generateInternalEmail, generatePassword, getSportsAccountEmailDomain,
  messageOf, requireSportsOrganizer, validUUID,
} from "@/lib/group-sports/school-auth-server";

const reply = (body: object, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "private, no-store, max-age=0" },
});

type CreatedAccount = {
  school_id: string;
  school_name: string;
  username: string;
  one_time_password: string;
};
type SkippedAccount = {school_id: string; school_name: string; reason: string};
type FailedAccount = {school_id: string; school_name: string; error: string};

// Small batches prevent a long-running serverless request from leaving the admin
// with unknown passwords if a deployment/network timeout interrupts a large job.
const MAX_BATCH = 4;

export async function POST(request: NextRequest) {
  try {
    const admin = createSportsAdminClient();
    const access = await requireSportsOrganizer(request, admin);
    if (!access) return reply({error: "ไม่มีสิทธิ์สร้างบัญชีโรงเรียน"}, 403);
    // Fail before any account is created if the provisioned email domain is missing.
    getSportsAccountEmailDomain();

    const body: unknown = await request.json();
    const ids = body && typeof body === "object" && "school_ids" in body
      ? (body as {school_ids: unknown}).school_ids : null;
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > MAX_BATCH ||
      !ids.every(validUUID) || new Set(ids).size !== ids.length) {
      return reply({error: `กรุณาระบุรหัสโรงเรียนที่ไม่ซ้ำกัน 1–${MAX_BATCH} โรงเรียน`}, 400);
    }
    const schoolIds = ids as string[];

    // All IDs are rechecked on the server. The client-provided list cannot grant
    // access to schools outside this competition or to inactive schools.
    const [links, schools, registered] = await Promise.all([
      admin.from("sports_competition_schools").select("school_id")
        .eq("competition_id", access.competitionId).in("school_id", schoolIds),
      admin.from("sports_schools").select("id,name,status").in("id", schoolIds),
      admin.from("sports_school_accounts").select("school_id,username")
        .eq("competition_id", access.competitionId),
    ]);
    if (links.error) throw links.error;
    if (schools.error) throw schools.error;
    if (registered.error) throw registered.error;

    const participants = new Set((links.data || []).map(s => s.school_id));
    const schoolById = new Map((schools.data || []).map(s => [s.id, s]));
    const existingSchools = new Set((registered.data || []).map(a => a.school_id));
    const usedUsernames = new Set((registered.data || []).map(a => a.username.toLowerCase()));

    const created: CreatedAccount[] = [];
    const skipped: SkippedAccount[] = [];
    const failed: FailedAccount[] = [];

    for (const schoolId of schoolIds) {
      const school = schoolById.get(schoolId);
      const schoolName = school?.name || "โรงเรียนที่ไม่พบ";
      if (!school || !participants.has(schoolId) || school.status === "inactive") {
        skipped.push({school_id: schoolId, school_name: schoolName, reason: "โรงเรียนไม่อยู่ในทะเบียนที่เปิดใช้งาน"});
        continue;
      }
      if (existingSchools.has(schoolId)) {
        skipped.push({school_id: schoolId, school_name: schoolName, reason: "มีบัญชีอยู่แล้ว ไม่เปลี่ยนรหัสผ่านเดิม"});
        continue;
      }
      const username = nextSchoolUsername(usedUsernames);
      const password = generatePassword();
      let newUserId: string | null = null;
      try {
        const email = generateInternalEmail();
        const user = await admin.auth.admin.createUser({
          email, password, email_confirm: true,
          app_metadata: { sports_school_account: true },
          user_metadata: { school_label: schoolName },
        });
        if (user.error || !user.data.user) throw user.error || new Error("สร้างผู้ใช้ไม่สำเร็จ");
        newUserId = user.data.user.id;

        const account = await admin.from("sports_school_accounts").insert({
          competition_id: access.competitionId,
          school_id: schoolId,
          user_id: newUserId,
          username,
          auth_email: email,
          is_active: true,
          created_by: access.userId,
        }).select("id").single();
        if (account.error) throw account.error;

        const role = await admin.from("sports_user_roles").insert({
          user_id: newUserId,
          competition_id: access.competitionId,
          school_id: schoolId,
          role: "school_manager",
          is_active: true,
        });
        if (role.error) throw role.error;

        existingSchools.add(schoolId);
        usedUsernames.add(username);
        created.push({school_id: schoolId, school_name: schoolName, username, one_time_password: password});
      } catch (err) {
        if (newUserId) {
          // FK cascade deletes the account/role if a later insert failed.
          const cleanup = await admin.auth.admin.deleteUser(newUserId);
          if (cleanup.error) {
            console.error("bulk school account cleanup failed", {schoolId, userId: newUserId, error: cleanup.error.message});
          }
        }
        // A different admin might have created this school while the batch ran.
        const current = await admin.from("sports_school_accounts")
          .select("id").eq("competition_id", access.competitionId)
          .eq("school_id", schoolId).maybeSingle();
        if (!current.error && current.data) {
          existingSchools.add(schoolId);
          skipped.push({school_id: schoolId, school_name: schoolName, reason: "มีบัญชีจากผู้ดูแลอีกคนแล้ว"});
        } else {
          console.error("bulk school account create failed", {schoolId, error: messageOf(err)});
          failed.push({school_id: schoolId, school_name: schoolName, error: "สร้างไม่สำเร็จ โปรดตรวจสอบการตั้งค่าและลองอีกครั้ง"});
        }
      }
    }
    // Passwords exist only in this one-time HTTPS response, never in the DB.
    return reply({created, skipped, failed});
  } catch (err) {
    const message = messageOf(err);
    if (/SPORTS_ACCOUNT_EMAIL_DOMAIN|SUPABASE_SERVICE_ROLE_KEY|Supabase URL/.test(message)) {
      return reply({error: message}, 503);
    }
    console.error("bulk school account setup failed", message);
    return reply({error: "ไม่สามารถสร้างบัญชีเป็นชุดได้ กรุณาตรวจสอบสิทธิ์และฐานข้อมูล"}, 503);
  }
}
