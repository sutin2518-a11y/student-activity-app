import type { Metadata } from "next";
import CertificatesDashboard from "@/components/group-sports/CertificatesDashboard";

export const metadata: Metadata = {
  title: "บันทึกอันดับรางวัล · ภูลังกาเกมส์ 2569",
  description: "สำหรับกรรมการที่ได้รับมอบหมาย บันทึกอันดับรางวัลและประกาศผลทันที พร้อมออกเกียรติบัตรรางวัลอัตโนมัติ",
};

export default function SportsResultsPage() {
  return <CertificatesDashboard mode="manage" />;
}
