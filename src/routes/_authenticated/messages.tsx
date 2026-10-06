import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Ban, MessageCircle, Send } from "lucide-react";
import { ReportButton } from "@/components/report-button";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import type { BlockedUser, ConversationDetail, ConversationSummary } from "@/lib/types";
import { cn, errorMessage } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/messages")({
  validateSearch: (search: Record<string, unknown>): { c?: string } => ({
    c: typeof search.c === "string" && search.c ? search.c : undefined,
  }),
  head: () => ({ meta: [{ title: "Messages — ChrisEpic Arts" }] }),
  component: Messages,
});

function initials(name: string | null) {
  return (name ?? "?").slice(0, 2).toUpperCase();
}

function when(iso: string) {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function Messages() {
  const { c: selected } = Route.useSearch();
  const navigate = useNavigate({ from: "/messages" });
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.get<ConversationSummary[]>("/api/me/conversations"),
    refetchInterval: 15_000,
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="page-container py-8">
        <h1 className="font-display text-3xl font-semibold">Messages</h1>
        <div className="mt-6 grid h-[70vh] overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-[20rem_1fr]">
          <aside
            className={cn(
              "overflow-y-auto border-border md:border-r",
              selected && "hidden md:block",
            )}
          >
            {isLoading ? (
              <p className="p-6 text-sm text-muted-foreground">Loading…</p>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <MessageCircle className="mx-auto h-8 w-8" />
                <p className="mt-3">No conversations yet.</p>
                <p className="mt-1">
                  Use “Message” on any artwork, listing or artist profile to start one.
                </p>
              </div>
            ) : (
              <ul>
                {conversations.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => navigate({ search: { c: c.id } })}
                      className={cn(
                        "flex w-full gap-3 border-b border-border px-4 py-3 text-left transition hover:bg-muted/40",
                        c.id === selected && "bg-muted/60",
                      )}
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={c.otherAvatarUrl ?? undefined} />
                        <AvatarFallback>{initials(c.otherDisplayName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span
                            className={cn(
                              "truncate text-sm",
                              c.unreadCount > 0 ? "font-semibold" : "font-medium",
                            )}
                          >
                            {c.otherDisplayName ?? "Member"}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {when(c.lastMessageAt)}
                          </span>
                        </div>
                        {c.subject && <p className="truncate text-xs text-primary">{c.subject}</p>}
                        <p
                          className={cn(
                            "truncate text-xs",
                            c.unreadCount > 0 ? "text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {c.lastMessageMine ? "You: " : ""}
                          {c.lastMessagePreview}
                        </p>
                      </div>
                      {c.unreadCount > 0 && (
                        <span className="mt-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[0.65rem] font-semibold text-primary-foreground">
                          {c.unreadCount}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
          <section className={cn("flex min-h-0 flex-col", !selected && "hidden md:flex")}>
            {selected ? (
              <Thread id={selected} onBack={() => navigate({ search: {} })} />
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                Select a conversation
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Thread({ id, onBack }: { id: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["conversation", id],
    queryFn: () => api.get<ConversationDetail>(`/api/conversations/${id}`),
    refetchInterval: 8_000,
  });
  const count = data?.messages.length ?? 0;
  const { data: blocks = [] } = useQuery({
    queryKey: ["blocks"],
    queryFn: () => api.get<BlockedUser[]>("/api/me/blocks"),
  });
  const otherId = data?.conversation.otherUserId;
  const blocked = !!otherId && blocks.some((b) => b.id === otherId);

  async function toggleBlock() {
    if (!otherId) return;
    if (
      !blocked &&
      !window.confirm("Block this member? Neither of you will be able to message the other.")
    ) {
      return;
    }
    try {
      if (blocked) await api.del(`/api/me/blocks/${otherId}`);
      else await api.put(`/api/me/blocks/${otherId}`);
      await queryClient.invalidateQueries({ queryKey: ["blocks"] });
      toast.success(blocked ? "Unblocked" : "Blocked");
    } catch (err) {
      toast.error(errorMessage(err, "Could not update block"));
    }
  }

  // Opening a thread marks it read on the server: refresh badges and the list.
  useEffect(() => {
    if (!data) return;
    queryClient.invalidateQueries({ queryKey: ["unread-messages"] });
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  }, [data, queryClient]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [count]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      const updated = await api.post<ConversationDetail>(`/api/conversations/${id}/messages`, {
        body,
      });
      queryClient.setQueryData(["conversation", id], updated);
      setBody("");
    } catch (err) {
      toast.error(errorMessage(err, "Could not send message"));
    } finally {
      setSending(false);
    }
  }

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  if (isError || !data)
    return <p className="p-6 text-sm text-muted-foreground">This conversation isn't available.</p>;
  const c = data.conversation;

  return (
    <>
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onBack}
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-9 w-9">
          <AvatarImage src={c.otherAvatarUrl ?? undefined} />
          <AvatarFallback>{initials(c.otherDisplayName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <Link
            to="/artists/$id"
            params={{ id: c.otherUserId }}
            className="block truncate font-medium hover:text-primary"
          >
            {c.otherDisplayName ?? "Member"}
          </Link>
          {c.subject &&
            (c.contextPath ? (
              <a
                href={c.contextPath}
                className="block truncate text-xs text-primary hover:underline"
              >
                {c.subject}
              </a>
            ) : (
              <p className="truncate text-xs text-muted-foreground">{c.subject}</p>
            ))}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <ReportButton targetType="USER" targetId={c.otherUserId} />
          <button
            type="button"
            onClick={toggleBlock}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
          >
            <Ban className="h-3 w-3" /> {blocked ? "Unblock" : "Block"}
          </button>
        </div>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {data.messages.map((m) => (
          <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                m.mine
                  ? "rounded-br-sm bg-primary text-primary-foreground"
                  : "rounded-bl-sm bg-muted",
              )}
            >
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p
                className={cn(
                  "mt-1 text-[0.65rem]",
                  m.mine ? "text-primary-foreground/70" : "text-muted-foreground",
                )}
              >
                {when(m.createdAt)}
                {m.mine && m.readAt ? " · Seen" : ""}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      {blocked && (
        <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          You've blocked this member. Unblock them to send messages.
        </p>
      )}
      <form onSubmit={send} className="flex items-end gap-2 border-t border-border p-3">
        <Textarea
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          maxLength={4000}
          placeholder="Write a message — Enter to send, Shift+Enter for a new line"
          className="min-h-0 resize-none"
          aria-label="Message"
        />
        <Button type="submit" size="icon" disabled={sending || !body.trim()} aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </>
  );
}
