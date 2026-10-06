import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import type { ConversationContextType, ConversationDetail } from "@/lib/types";
import { errorMessage } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

/**
 * "Message the seller" style button. Opens a compose dialog and starts (or continues) the
 * conversation about this context, then jumps to it in the inbox. Hidden for the recipient themself.
 */
export function MessageButton({
  recipientId,
  recipientName,
  contextType = "GENERAL",
  contextId,
  label = "Message",
  placeholder,
  variant = "outline",
  size,
  className,
}: {
  recipientId: string;
  recipientName?: string | null;
  contextType?: ConversationContextType;
  contextId?: string;
  label?: string;
  placeholder?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  if (user?.id === recipientId) return null;

  function openDialog() {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: window.location.pathname } });
      return;
    }
    setOpen(true);
  }

  async function send() {
    setSending(true);
    try {
      const res = await api.post<ConversationDetail>("/api/conversations", {
        recipientId,
        contextType,
        contextId,
        body,
      });
      setOpen(false);
      setBody("");
      toast.success("Message sent");
      navigate({ to: "/messages", search: { c: res.conversation.id } });
    } catch (e) {
      toast.error(errorMessage(e, "Could not send message"));
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={openDialog}>
        <MessageCircle className="h-4 w-4" />
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message {recipientName ?? "seller"}</DialogTitle>
            <DialogDescription>
              Messages are private between you two. Keep payments on the platform so you stay
              protected.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={4000}
            placeholder={placeholder ?? "Ask about size, delivery, framing, availability…"}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={send} disabled={sending || !body.trim()}>
              {sending ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
