import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/terms")({ component: () => <ComingSoon title="Terms of service" desc="The legal stuff. Coming soon." /> });
