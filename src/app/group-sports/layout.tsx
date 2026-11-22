import type { ReactNode } from "react";
import "./sports-red-theme.css";

// Theme scope is intentionally restricted to group sports, keeping the
// school's existing student activity application unaffected.
export default function GroupSportsLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="sports-red-theme">{children}</div>;
}
