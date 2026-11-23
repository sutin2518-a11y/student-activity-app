import type { Metadata } from "next";
import FootballDashboard from "@/components/group-sports/FootballDashboard";
export const metadata: Metadata = { title: "ฟุตบอล 4 ประเภท · ภูลังกาเกมส์ 2569", description: "สมัครนักกีฬา โปรแกรม ผลการแข่งขัน และตารางคะแนนฟุตบอล" };
export default function FootballPage(){return <FootballDashboard/>;}
