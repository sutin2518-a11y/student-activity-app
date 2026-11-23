import type { Metadata } from "next";
import CertificatesDashboard from "@/components/group-sports/CertificatesDashboard";

export const metadata: Metadata = {
  title: "ตรวจสอบและอนุมัติผล · ภูลังกาเกมส์ 2569",
  description: "สำหรับผู้ดูแลการแข่งขัน ตรวจสอบ อนุมัติ หรือส่งผลกลับแก้ไข ก่อนเผยแพร่",
};

export default function SportsResultsReviewPage() {
  return <CertificatesDashboard mode="manage" view="review" />;
}
