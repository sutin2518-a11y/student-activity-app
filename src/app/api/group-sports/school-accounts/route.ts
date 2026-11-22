import { NextRequest, NextResponse } from "next/server";
import { assertCredentialVaultReady, encryptSchoolPassword } from "@/lib/group-sports/school-credential-vault";
import { createSportsAdminClient, generateInternalEmail, generatePassword, getSportsAccountEmailDomain, messageOf, normalizedUsername, requireSportsOrganizer, validNewSchoolPassword, validUsername, validUUID } from "@/lib/group-sports/school-auth-server";

const reply = (body: object, status = 200) => NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});

export async function GET(request:NextRequest) {
  try {
    const admin = createSportsAdminClient();
    const access = await requireSportsOrganizer(request,admin);
    if (!access) return reply({error:"ไม่มีสิทธิ์จัดการบัญชีโรงเรียน"},403);
    const [accounts,schools,links,vault] = await Promise.all([
      admin.from("sports_school_accounts").select("id,username,school_id,is_active,created_at,updated_at").eq("competition_id",access.competitionId).order("created_at"),
      admin.from("sports_schools").select("id,name,school_code,status").order("name"),
      admin.from("sports_competition_schools").select("school_id").eq("competition_id",access.competitionId),
      admin.from("sports_school_credential_vault").select("account_id"),
    ]);
    if (accounts.error) throw accounts.error;
    if (schools.error) throw schools.error;
    if (links.error) throw links.error;
    const vaultMigrationMissing = Boolean(vault.error && (vault.error.code === "42P01" || vault.error.code === "PGRST205"));
    if (vault.error && !vaultMigrationMissing) throw vault.error;
    const participants = new Set((links.data||[]).map(r=>r.school_id));
    let configError: string | null = null;
    try { getSportsAccountEmailDomain(); assertCredentialVaultReady(); } catch (err) { configError = messageOf(err); }
    if (vaultMigrationMissing) configError = "ยังไม่ได้รัน SQL Migration 0013 สำหรับคลังรหัสผ่านโรงเรียน";
    const recoverable = new Set((vault.data || []).map(row=>row.account_id));
    return reply({accounts:(accounts.data || []).map(a=>({...a,has_saved_password:recoverable.has(a.id)})),schools:(schools.data || []).filter(s=>participants.has(s.id)&&s.status!=="inactive"),config_error:configError});
  } catch (e) { return reply({error:messageOf(e)},503); }
}

export async function POST(request:NextRequest) {
  try {
    const admin = createSportsAdminClient();
    const access = await requireSportsOrganizer(request,admin);
    if (!access) return reply({error:"ไม่มีสิทธิ์สร้างบัญชีโรงเรียน"},403);
    getSportsAccountEmailDomain();
    assertCredentialVaultReady();
    const json = await request.json();
    const username = normalizedUsername(json.username);
    const schoolId = json.school_id;
    if (!validUUID(schoolId) || !validUsername(username)) return reply({error:"กรุณาเลือกโรงเรียนและใช้ Username ภาษาอังกฤษ 4–32 ตัว เริ่มต้นด้วยตัวอักษร"},400);
    const password = typeof json.password === "string" && json.password.length ? json.password : generatePassword();
    if (!validNewSchoolPassword(password)) return reply({error:"รหัสผ่านใหม่ต้องมี 8 ตัวอักษรภาษาอังกฤษหรือตัวเลขเท่านั้น"},400);
    const schoolLink = await admin.from("sports_competition_schools").select("school_id")
      .eq("competition_id",access.competitionId).eq("school_id",schoolId).maybeSingle();
    if (schoolLink.error) throw schoolLink.error;
    if (!schoolLink.data) return reply({error:"โรงเรียนนี้ยังไม่ได้อยู่ในทะเบียนการแข่งขัน"},400);
    const school = await admin.from("sports_schools").select("id,name,status").eq("id",schoolId).maybeSingle();
    if (school.error) throw school.error;
    if (!school.data || school.data.status === "inactive") return reply({error:"โรงเรียนไม่พร้อมใช้งาน"},400);
    const existing = await admin.from("sports_school_accounts").select("id").eq("competition_id",access.competitionId)
      .or(`username.eq.${username},school_id.eq.${schoolId}`).limit(1);
    if (existing.error) throw existing.error;
    if (existing.data?.length) return reply({error:"โรงเรียนหรือชื่อผู้ใช้นี้มีบัญชีอยู่แล้ว กรุณาใช้เมนูรีเซ็ตรหัสผ่าน"},409);
    const email = generateInternalEmail();
    const created = await admin.auth.admin.createUser({email,password,email_confirm:true,
      app_metadata:{sports_school_account:true},user_metadata:{school_label:school.data.name}});
    if (created.error || !created.data.user) throw created.error || new Error("สร้างผู้ใช้ไม่สำเร็จ");
    const userId = created.data.user.id;
    try {
      const account = await admin.from("sports_school_accounts").insert({
        competition_id:access.competitionId,school_id:schoolId,user_id:userId,username,auth_email:email,is_active:true,created_by:access.userId,
      }).select("id,username,school_id,is_active,created_at").single();
      if (account.error) throw account.error;
      const vault = await admin.from("sports_school_credential_vault").insert({
        account_id:account.data.id,...encryptSchoolPassword(password,account.data.id),updated_by:access.userId,
      });
      if (vault.error) throw vault.error;
      const role = await admin.from("sports_user_roles").insert({
        user_id:userId,competition_id:access.competitionId,school_id:schoolId,role:"school_manager",is_active:true,
      });
      if (role.error) throw role.error;
      const audit = await admin.from("sports_school_credential_audit").insert({
        account_id:account.data.id,actor_user_id:access.userId,action:"created",
      });
      if (audit.error) throw audit.error;
      return reply({account:account.data,one_time_password:password},201);
    } catch (e) {
      // Account insert or role setup failed: don't leave orphaned credentialed users.
      const cleaned = await admin.auth.admin.deleteUser(userId);
      if (cleaned.error) console.error("school account cleanup failed:",cleaned.error.message,userId);
      throw e;
    }
  } catch (e) {
    const message = messageOf(e);
    if (/duplicate key|unique constraint/i.test(message)) return reply({error:"โรงเรียนหรือ Username นี้มีบัญชีอยู่แล้ว"},409);
    return reply({error:message},503);
  }
}
