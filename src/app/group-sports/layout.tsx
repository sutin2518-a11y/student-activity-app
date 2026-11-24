import type { ReactNode } from "react";
import "./sports-red-theme.css";
import "./sports-games-theme.css";
import "./sports-multicolor-theme.css";

// Stadium theme applies only to the group-sports subsystem; student activity
// pages keep their existing brand and styles.
export default function GroupSportsLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="sports-red-theme sports-stadium-theme sports-multicolor-theme">{children}</div>;
}
