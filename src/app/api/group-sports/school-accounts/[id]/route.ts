import { NextRequest, NextResponse } from "next/server";
import { createSportsAdminClient, generatePassword, messageOf, requireSportsOrganizer, validPassword, validUUID } from "@/lib/group-sports/school-auth-server";

const reply = (body:object,status=200) => NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});

export async function PATCH(request:NextRequest, context:{params:Promise<{id:string}>}) {
  try {
    const admin = createSportsAdminClient();
    const access = await requireSportsOrganizer(request,admin);
    if (!access) return reply({error:"ไม่มีสิทธิ์แก้ไขบัญชีโรงเรียน"},403);
    const {id} = await context.params;
    if (!validUUID(id)) return reply({error:"บัญชีไม่ถูกต้อง"},400);
    const json = await request.json();
    const action = json.action as unknown;
    if (!["reset_password","disable","enable"].includes(String(action))) return reply({error:"คำสั่งไม่ถูกต้อง"},400);
    const found = await admin.from("sports_school_accounts").select("id,user_id,school_id,is_active")
      .eq("id",id).eq("competition_id",access.competitionId).maybeSingle();
    if (found.error) throw found.error;
    if (!found.data) return reply({error:"ไม่พบบัญชีโรงเรียน"},404);
    const account = found.data;
    if (action === "reset_password") {
      if (!account.is_active) return reply({error:"กรุณาเปิดใช้งานบัญชีก่อนรีเซ็ตรหัสผ่าน"},400);
      const password = typeof json.password === "string" && json.password.length ? json.password : generatePassword();
      if (!validPassword(password)) return reply({error:"รหัสผ่านต้องยาว 12–128 ตัวอักษร"},400);
      const change = await admin.auth.admin.updateUserById(account.user_id,{password});
      if (change.error) throw change.error;
      return reply({message:"ตั้งรหัสผ่านใหม่แล้ว",one_time_password:password});
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
