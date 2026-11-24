import type { Metadata } from "next";
import SportsPracticeCenter from "@/components/group-sports/SportsPracticeCenter";
export const metadata: Metadata = {title:"ศูนย์ทดสอบระบบกีฬากลุ่ม · TEST",robots:{index:false,follow:false}};
export default function SportsPracticePage(){return <SportsPracticeCenter/>;}
