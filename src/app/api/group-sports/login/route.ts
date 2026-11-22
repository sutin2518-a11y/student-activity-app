import { NextRequest, NextResponse } from "next/server";
import { createPublicServerAuth, createSportsAdminClient, fingerprint, normalizedUsername, SPORTS_SLUG, validPassword, validUsername } from "@/lib/group-sports/school-auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const response = (body: object, status: number) => NextResponse.json(body, {status,headers:{"Cache-Control":"no-store"}});

export async function POST(request: NextRequest) {
  let name = "";
  let password = "";
  try {
    const json = await request.json();
    name = normalizedUsername(json.username);
    password = typeof json.password === "string" ? json.password : "";
    if (!validUsername(name) || !validPassword(password)) return response({error:"ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"},401);
    const admin = createSportsAdminClient();
    const key = fingerprint(request,name);
    const allowed = await admin.rpc("sports_school_login_allowed",{p_fingerprint:key});
    if (allowed.error) throw allowed.error;
    if (allowed.data !== true) return response({error:"มีการพยายามเข้าสู่ระบบหลายครั้ง กรุณาลองใหม่อีกครั้งใน 15 นาที"},429);
    const competition = await admin.from("sports_competitions").select("id").eq("slug",SPORTS_SLUG).maybeSingle();
    if (competition.error) throw competition.error;
    if (!competition.data) throw new Error("ไม่พบข้อมูลการแข่งขัน");
    const account = await admin.from("sports_school_accounts")
      .select("user_id,auth_email,school_id,is_active")
      .eq("competition_id",competition.data.id).eq("username",name).maybeSingle();
    let session = null;
    if (account.data?.is_active) {
      const role = await admin.from("sports_user_roles").select("user_id").eq("user_id", account.data.user_id)
        .eq("role","school_manager").eq("school_id",account.data.school_id)
        .eq("competition_id",competition.data.id).eq("is_active",true).maybeSingle();
      if (role.error) throw role.error;
      if (role.data) {
        const result = await createPublicServerAuth().auth.signInWithPassword({email:account.data.auth_email,password});
        if (!result.error && result.data.user?.id === account.data.user_id) session = result.data.session;
      }
    }
    const recorded = await admin.rpc("sports_school_login_record",{p_fingerprint:key,p_success:Boolean(session)});
    if (recorded.error) throw recorded.error;
    if (!session) return response({error:"ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"},401);
    return response({access_token:session.access_token,refresh_token:session.refresh_token},200);
  } catch (err) {
    // Never disclose service-role configuration or user-existence information to a login caller.
    console.error("sports school login failed:", err instanceof Error ? err.message : "unknown");
    return response({error:"ระบบเข้าสู่ระบบไม่พร้อมใช้งาน กรุณาติดต่อผู้จัดการแข่งขัน"},503);
  }
}
