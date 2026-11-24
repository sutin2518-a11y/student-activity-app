import type { Metadata } from "next";
import SportsOfficialsAccessManager from "@/components/group-sports/SportsOfficialsAccessManager";

export const metadata: Metadata = {
  title: "มอบหมายกรรมการกีฬา · ภูลังกาเกมส์ 2569",
  description: "สำหรับผู้ดูแลการแข่งขัน กำหนดกรรมการเป็นรายรายการแข่งขัน",
};

export default function SportsOfficialsPage() {
  return <SportsOfficialsAccessManager />;
}
