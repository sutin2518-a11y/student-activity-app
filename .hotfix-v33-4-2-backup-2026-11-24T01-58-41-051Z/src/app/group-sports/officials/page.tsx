import type { Metadata } from "next";
import CertificatesDashboard from "@/components/group-sports/CertificatesDashboard";

export const metadata: Metadata = {
  title: "มอบหมายกรรมการกีฬา · ภูลังกาเกมส์ 2569",
  description: "สำหรับผู้ดูแลการแข่งขัน กำหนดกรรมการเป็นรายรายการแข่งขัน",
};

export default function SportsOfficialsPage() {
  return <CertificatesDashboard mode="manage" view="officials" />;
}
