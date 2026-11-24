import type { Metadata } from "next";
import SportsResetManager from "@/components/group-sports/SportsResetManager";

export const metadata: Metadata = {
  title: "รีเซตข้อมูลจริงกีฬากลุ่ม (ระวัง)",
  robots: { index: false, follow: false },
};

export default function SportsResetPage() {
  return <SportsResetManager />;
}
