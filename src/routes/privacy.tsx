import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/privacy")({ component: () => <ComingSoon title="Privacy policy" desc="How we handle your data. Coming soon." /> });
