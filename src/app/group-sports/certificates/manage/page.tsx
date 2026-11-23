import type {Metadata} from "next";
import CertificatesDashboard from "@/components/group-sports/CertificatesDashboard";
export const metadata:Metadata = {
  title:"จัดการผลและเกียรติบัตร · ภูลังกาเกมส์ 2569",
  description:"เฉพาะกรรมการที่ได้รับมอบหมายและผู้ดูแลการแข่งขัน บันทึกผล อนุมัติ และตั้งค่าการออกเกียรติบัตร",
};
export default function CertificatesManagePage(){return <CertificatesDashboard mode="manage"/>;}
