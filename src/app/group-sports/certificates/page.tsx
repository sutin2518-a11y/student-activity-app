import type {Metadata} from "next";
import CertificatesDashboard from "@/components/group-sports/CertificatesDashboard";
export const metadata:Metadata = {
  title:"พิมพ์เกียรติบัตร · ภูลังกาเกมส์ 2569",
  description:"สำหรับโรงเรียน เลือกพิมพ์เกียรติบัตรรางวัลและเกียรติบัตรเข้าร่วมการแข่งขัน",
};
export default function CertificatesPage(){return <CertificatesDashboard mode="print"/>;}
