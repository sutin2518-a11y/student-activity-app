import type { Metadata } from "next";
import SportsAdminFullControl from "@/components/group-sports/SportsAdminFullControl";

export const metadata:Metadata={
  title:"Admin Full Control · ระบบกีฬากลุ่ม พะเยา 2569",
  description:"ผู้ดูแลหลักจัดการใบสมัครทุกโรงเรียน พร้อมประวัติการแก้ไขและการจัดการเกียรติบัตร",
};
export default function SportsAdminPage(){return <SportsAdminFullControl/>;}
