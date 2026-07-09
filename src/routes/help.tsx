import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/help")({ component: () => <ComingSoon title="Help center" desc="FAQs and support — coming soon." /> });
