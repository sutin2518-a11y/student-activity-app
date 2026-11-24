import type { Metadata } from "next";
import SportsOfficialsAccessManager from "@/components/group-sports/SportsOfficialsAccessManager";
export const metadata: Metadata = {
  title: "มอบหมายกรรมการกีฬา · ภูลังกาเกมส์ 2569",
  description: "กำหนดสิทธิ์กรรมการบันทึกผลเกียรติบัตรและผู้ดูแล E-Sport ในหน้าจอเดียว",
};
export default function SportsOfficialsPage() {
  return <SportsOfficialsAccessManager />;
}
