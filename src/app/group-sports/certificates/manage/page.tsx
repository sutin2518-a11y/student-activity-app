import type {Metadata} from "next";
import CertificatesDashboard from "@/components/group-sports/CertificatesDashboard";
export const metadata:Metadata = {
  title:"จัดการเกียรติบัตร · ภูลังกาเกมส์ 2569",
  description:"เฉพาะผู้ดูแลการแข่งขัน จัดการเกียรติบัตรและตั้งค่า โดยกรรมการประกาศผลได้ทันที",
};
export default function CertificatesManagePage(){return <CertificatesDashboard mode="manage"/>;}
