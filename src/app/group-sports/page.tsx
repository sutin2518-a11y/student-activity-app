import type { Metadata } from "next";
import GroupSportsDashboard from "@/components/group-sports/GroupSportsDashboard";

export const metadata: Metadata = {
  title: "ระบบกีฬากลุ่มมัธยมศึกษาจังหวัดพะเยา",
  description: "ระบบบริหารจัดการแข่งขันกีฬากลุ่มระหว่างโรงเรียน",
};

export default function GroupSportsPage() {
  return <GroupSportsDashboard />;
}
