import type { Metadata } from "next";
import CertificatesDashboard from "@/components/group-sports/CertificatesDashboard";

export const metadata: Metadata = {
  title: "บันทึกผลการแข่งขัน · ภูลังกาเกมส์ 2569",
  description: "สำหรับกรรมการที่ได้รับมอบหมาย บันทึกอันดับและประกาศผลทันที พร้อมออกเกียรติบัตรรางวัลอัตโนมัติ",
};

export default function SportsResultsPage() {
  return <CertificatesDashboard mode="manage" view="record" />;
}
