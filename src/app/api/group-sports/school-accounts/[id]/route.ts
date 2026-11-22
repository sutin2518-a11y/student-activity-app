import { NextRequest, NextResponse } from "next/server";
import { assertCredentialVaultReady, decryptSchoolPassword, encryptSchoolPassword } from "@/lib/group-sports/school-credential-vault";
import { createSportsAdminClient, generatePassword, messageOf, requireSportsOrganizer, validNewSchoolPassword, validUUID } from "@/lib/group-sports/school-auth-server";

const reply = (body:object,status=200) => NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache"}});

export async function PATCH(request:NextRequest, context:{params:Promise<{id:string}>}) {
  try {
    const admin = createSportsAdminClient();
    const access = await requireSportsOrganizer(request,admin);
    if (!access) return reply({error:"ไม่มีสิทธิ์แก้ไขบัญชีโรงเรียน"},403);
    const {id} = await context.params;
    if (!validUUID(id)) return reply({error:"บัญชีไม่ถูกต้อง"},400);
    const json = await request.json();
    const action = json.action as unknown;
    if (!["reset_password","disable","enable","reveal_password"].includes(String(action))) return reply({error:"คำสั่งไม่ถูกต้อง"},400);
    const found = await admin.from("sports_school_accounts").select("id,user_id,school_id,is_active")
      .eq("id",id).eq("competition_id",access.competitionId).maybeSingle();
    if (found.error) throw found.error;
    if (!found.data) return reply({error:"ไม่พบบัญชีโรงเรียน"},404);
    const account = found.data;
    if (action === "reveal_password") {
      assertCredentialVaultReady();
      const record = await admin.from("sports_school_credential_vault")
        .select("ciphertext,iv,auth_tag").eq("account_id",id).maybeSingle();
      if (record.error) throw record.error;
      if (!record.data) return reply({error:"บัญชีนี้ยังไม่มีรหัสผ่านที่เก็บไว้ กรุณารีเซ็ตรหัสใหม่"},404);
      // Audit the reveal before releasing any decrypted credential.
      const audit = await admin.from("sports_school_credential_audit")
        .insert({account_id:id,actor_user_id:access.userId,action:"reveal_password"});
      if (audit.error) throw audit.error;
      const password = decryptSchoolPassword(record.data,id);
      return reply({message:"เปิดดูรหัสผ่านสำหรับผู้ดูแลแล้ว",one_time_password:password});
    }
    if (action === "reset_password") {
      assertCredentialVaultReady();
      if (!account.is_active) return reply({error:"กรุณาเปิดใช้งานบัญชีก่อนรีเซ็ตรหัสผ่าน"},400);
      const vaultReady = await admin.from("sports_school_credential_vault")
        .select("account_id").eq("account_id",id).maybeSingle();
      if (vaultReady.error) throw vaultReady.error;
      const password = typeof json.password === "string" && json.password.length ? json.password : generatePassword();
      if (!validNewSchoolPassword(password)) return reply({error:"รหัสผ่านใหม่ต้องมี 8 ตัวอักษรภาษาอังกฤษหรือตัวเลขเท่านั้น"},400);
      const encrypted = encryptSchoolPassword(password,id);
      const change = await admin.auth.admin.updateUserById(account.user_id,{password});
      if (change.error) throw change.error;
      const vault = await admin.from("sports_school_credential_vault").upsert({
        account_id:id,...encrypted,updated_by:access.userId,updated_at:new Date().toISOString(),
      },{onConflict:"account_id"});
      if (vault.error) {
        // The Auth password has already changed; return it so the admin can still
        // communicate the new password, rather than losing it behind a 503.
        console.error("password reset succeeded but vault update failed",vault.error.message);
        return reply({message:"เปลี่ยนรหัสผ่านแล้ว แต่จัดเก็บในคลังไม่สำเร็จ โปรดคัดลอกรหัสนี้ทันที",one_time_password:password,storage_warning:true});
      }
      const audit = await admin.from("sports_school_credential_audit")
        .insert({account_id:id,actor_user_id:access.userId,action:"reset_password"});
      if (audit.error) console.error("password reset audit failed",audit.error.message);
      return reply({message:"ตั้งรหัสผ่านใหม่และเก็บแบบเข้ารหัสแล้ว",one_time_password:password});
    }
    if (action === "disable") {
      // Revoke database rights first, regardless of whether the optional auth ban succeeds.
      const role = await admin.from("sports_user_roles").update({is_active:false})
        .eq("user_id",account.user_id).eq("school_id",account.school_id).eq("competition_id",access.competitionId).eq("role","school_manager");
      if (role.error) throw role.error;
      const change = await admin.from("sports_school_accounts").update({is_active:false,updated_at:new Date().toISOString()}).eq("id",id);
      if (change.error) throw change.error;
      const ban = await admin.auth.admin.updateUserById(account.user_id,{ban_duration:"876000h"});
      if (ban.error) console.error("sports school user ban failed:",ban.error.message);
      return reply({message:"ปิดบัญชีและสิทธิ์ลงทะเบียนแล้ว"});
    }
    // Enable: unban before restoring the role; denied access if any step fails.
    const unban = await admin.auth.admin.updateUserById(account.user_id,{ban_duration:"none"});
    if (unban.error) throw unban.error;
    const role = await admin.from("sports_user_roles").update({is_active:true})
      .eq("user_id",account.user_id).eq("school_id",account.school_id).eq("competition_id",access.competitionId).eq("role","school_manager").select("user_id");
    if (role.error) throw role.error;
    if (!role.data?.length) return reply({error:"ไม่พบบทบาท school_manager กรุณาให้ผู้ดูแลตรวจข้อมูล"},409);
    const change = await admin.from("sports_school_accounts").update({is_active:true,updated_at:new Date().toISOString()}).eq("id",id);
    if (change.error) {
      await admin.from("sports_user_roles").update({is_active:false}).eq("user_id",account.user_id).eq("role","school_manager").eq("competition_id",access.competitionId);
      throw change.error;
    }
    return reply({message:"เปิดใช้งานบัญชีแล้ว"});
  } catch (e) {return reply({error:messageOf(e)},503);}
}
