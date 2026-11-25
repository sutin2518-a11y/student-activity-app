import * as XLSX from "xlsx";

type Row = Record<string, string | number | null>;
type Entry = {
  id: string; school: string; code: string | null; event: string; team: string;
  status: string; updated: string; phone: string | null; team_name: string | null;
  shirt: string | null; shorts: string | null; players: Row[]; staff: Row[];
};

export function registrationWorkbook(data: { exported_at: string; scope: string; entries: Entry[] }) {
  const book = XLSX.utils.book_new();
  const totals = new Map<string, number[]>();
  const keys = ["รหัสใบสมัคร","โรงเรียน","รหัสรายการ","รายการแข่งขัน"];
  const entries: (string | number | null)[][] = [[...keys,"ชื่อใบสมัคร","สถานะ","นักกีฬา (คน)","แก้ไขล่าสุด","เบอร์ติดต่อ","ชื่อทีม","สีเสื้อ","สีกางเกง"]];
  const athletes: typeof entries = [[...keys,"ลำดับ","ชื่อ–สกุล","รหัสนักเรียน","ชั้น","เพศ","วันเกิด","เบอร์เสื้อ","บทบาท","ตำแหน่ง","ชื่อในเกม","ตัวจริง/สำรอง","หมายเหตุ","น้ำหนัก (กก.)","ส่วนสูง (ซม.)","รหัสนักกีฬา"]];
  const staff: typeof entries = [[...keys,"ลำดับ","ชื่อ–สกุล","โทรศัพท์","วันเกิด","ผู้จัดการทีม","โทรศัพท์ผู้จัดการทีม","ตำแหน่ง"]];
  for (const e of data.entries) {
    const key = [e.id,e.school,e.code,e.event];
    entries.push([...key,e.team,e.status,e.players.length,e.updated,e.phone,e.team_name,e.shirt,e.shorts]);
    e.players.forEach((p,i) => athletes.push([...key,i+1,p.name,p.student,p.grade,p.gender,p.birth,p.jersey,p.role,p.position,p.ign,p.player_role,p.note,p.weight,p.height,p.id]));
    e.staff.forEach((p,i) => {
      if (!p.name && !p.manager_name) return;
      const roles = p.tt_role ? ["ผู้ฝึกสอน","ผู้ช่วยผู้ฝึกสอน","ผู้จัดการทีม"] : ["ผู้จัดการทีม","ผู้ฝึกสอน","ผู้ช่วยผู้ฝึกสอน"];
      staff.push([...key,i+1,p.name,p.phone,p.birth_date,p.manager_name,p.manager_phone,roles[Number(p.tt_role || p.takraw_role)-1] || ""]);
    });
    const group = e.status;
    const count = totals.get(group) || [0,0];
    count[0]++; count[1] += e.players.length; totals.set(group,count);
  }
  function append(name: string, rows: typeof entries, filter = true) {
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = rows[0].map((_,i) => ({wch: i < 4 ? [38,36,21,48][i] : 24}));
    if (filter) sheet["!autofilter"] = {ref: sheet["!ref"]!};
    XLSX.utils.book_append_sheet(book,sheet,name);
  }
  append("สรุป",[["ทะเบียนกีฬากลุ่ม 2569","จำนวนใบสมัคร","จำนวนรายชื่อนักกีฬา"],
    ["รวมทุกสถานะ",entries.length-1,athletes.length-1],...Array.from(totals,([s,n])=>[s,...n]),
    [],["ขอบเขต",data.scope],["ข้อมูล ณ เวลา (ประเทศไทย)",new Date(data.exported_at).toLocaleString("th-TH",{timeZone:"Asia/Bangkok"})]],false);
  append("ใบสมัคร",entries); append("นักกีฬา",athletes); append("ผู้ควบคุมทีม",staff);
  return book;
}
export function downloadRegistrationExcel(data: Parameters<typeof registrationWorkbook>[0]) {
  const stamp = new Date(data.exported_at).toISOString().replace(/[:.]/g,"-");
  XLSX.writeFile(registrationWorkbook(data),`ทะเบียนกีฬากลุ่ม-2569-${stamp}.xlsx`,{compression:true});
}
