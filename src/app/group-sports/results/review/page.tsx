import { redirect } from "next/navigation";

// Backward-compatible redirect: the competition no longer has an Admin review step.
export default function LegacySportsResultsReviewPage() {
  redirect("/group-sports/results");
}
