import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { errorMessage } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";

/** Follow an artist to get their new work in your feed and notifications. Hidden on your own profile. */
export function FollowButton({
  artistId,
  following: initial,
  followerCount,
  size,
}: {
  artistId: string;
  following: boolean;
  followerCount?: number;
  size?: ButtonProps["size"];
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [following, setFollowing] = useState(initial);
  const [count, setCount] = useState(followerCount ?? 0);
  const [busy, setBusy] = useState(false);
  if (user?.id === artistId) return null;

  async function toggle() {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: window.location.pathname } });
      return;
    }
    setBusy(true);
    try {
      if (following) await api.del(`/api/me/follows/${artistId}`);
      else await api.put(`/api/me/follows/${artistId}`);
      setFollowing(!following);
      setCount((c) => c + (following ? -1 : 1));
      if (!following) toast.success("Following — new work will show up in your feed");
    } catch (e) {
      toast.error(errorMessage(e, "Could not update follow"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant={following ? "secondary" : "outline"}
      size={size}
      onClick={toggle}
      disabled={busy}
      aria-pressed={following}
    >
      {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
      {following ? "Following" : "Follow"}
      {followerCount !== undefined && (
        <span className="text-xs text-muted-foreground">· {count}</span>
      )}
    </Button>
  );
}
