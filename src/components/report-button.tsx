import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import type { ReportTarget } from "@/lib/types";
import { cn, errorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const REASONS: [string, string][] = [
  ["counterfeit", "Counterfeit or not the seller's own work"],
  ["copyright", "Copyright infringement"],
  ["scam", "Scam or fraud"],
  ["inappropriate", "Inappropriate or offensive"],
  ["harassment", "Harassment"],
  ["spam", "Spam"],
  ["other", "Something else"],
];

/** Small "Report" link that sends a listing, member, review or message to the moderation queue. */
export function ReportButton({
  targetType,
  targetId,
  label = "Report",
  className,
}: {
  targetType: ReportTarget;
  targetId: string;
  label?: string;
  className?: string;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  function start() {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: window.location.pathname } });
      return;
    }
    setOpen(true);
  }

  async function send() {
    setSending(true);
    try {
      await api.post("/api/reports", {
        targetType,
        targetId,
        reason,
        details: details || undefined,
      });
      toast.success("Thanks — our team will review this.");
      setOpen(false);
      setReason("");
      setDetails("");
    } catch (e) {
      toast.error(errorMessage(e, "Could not send report"));
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={start}
        className={cn(
          "inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive",
          className,
        )}
      >
        <Flag className="h-3 w-3" /> {label}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report a problem</DialogTitle>
            <DialogDescription>
              Reports are confidential. The member isn't told who reported them.
            </DialogDescription>
          </DialogHeader>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">What's wrong?</legend>
            {REASONS.map(([value, text]) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="report-reason"
                  value={value}
                  checked={reason === value}
                  onChange={() => setReason(value)}
                />
                {text}
              </label>
            ))}
          </fieldset>
          <div>
            <Label htmlFor="report-details">Details (optional)</Label>
            <Textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={2000}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={send} disabled={!reason || sending}>
              {sending ? "Sending…" : "Send report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
