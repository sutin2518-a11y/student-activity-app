import type {Metadata} from "next";
import CertificatesDashboard from "@/components/group-sports/CertificatesDashboard";
export const metadata:Metadata = {
  title:"ระบบเกียรติบัตร · ภูลังกาเกมส์ 2569",
  description:"บันทึกผลการแข่งขัน อนุมัติ และพิมพ์เกียรติบัตรรางวัลและการเข้าร่วม",
};
export default function CertificatesPage(){return <CertificatesDashboard/>;}
