import type { Metadata } from "next";
import SportsResultCorrections from "@/components/group-sports/SportsResultCorrections";

export const metadata: Metadata = {
  title: "แก้ไขผลที่ประกาศแล้ว · ภูลังกาเกมส์ 2569",
  description: "สำหรับผู้ดูแลหลัก แก้ไขผลการแข่งขันย้อนหลังพร้อมประวัติ ตารางเหรียญ และเกียรติบัตรใหม่",
};

export default function SportsResultsCorrectionsPage() {
  return <SportsResultCorrections />;
}
