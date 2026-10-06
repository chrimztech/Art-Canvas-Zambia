import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import type { WaitlistEntry } from "@/lib/types";
import { errorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** Join/leave the waitlist for a sold-out class or exhibition; members are notified when a place opens. */
export function WaitlistButton({
  itemType,
  itemId,
}: {
  itemType: "CLASS" | "EXHIBITION";
  itemId: string;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { data = [] } = useQuery({
    queryKey: ["waitlist"],
    queryFn: () => api.get<WaitlistEntry[]>("/api/me/waitlist"),
    enabled: !!user,
  });
  const joined = data.some((w) => w.itemType === itemType && w.itemId === itemId);

  async function toggle() {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: window.location.pathname } });
      return;
    }
    setBusy(true);
    try {
      if (joined) await api.del(`/api/me/waitlist/${itemType}/${itemId}`);
      else await api.put(`/api/me/waitlist/${itemType}/${itemId}`);
      await queryClient.invalidateQueries({ queryKey: ["waitlist"] });
      toast.success(
        joined
          ? "Removed from the waitlist"
          : "You're on the waitlist — we'll notify you if a place opens",
      );
    } catch (e) {
      toast.error(errorMessage(e, "Could not update waitlist"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant={joined ? "secondary" : "outline"}
      className="w-full"
      onClick={toggle}
      disabled={busy}
    >
      <BellRing className="h-4 w-4" />
      {joined ? "On the waitlist — leave" : "Join the waitlist"}
    </Button>
  );
}
