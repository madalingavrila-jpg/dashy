import { permanentRedirect } from "next/navigation";

// Alias for the month-filtered Overview, which lives at /pipeline.
export default function MonthlyOverviewPage() {
  permanentRedirect("/pipeline");
}
