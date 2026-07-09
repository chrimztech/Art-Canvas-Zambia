import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { AuthUser } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/profile")({
  head: () => ({ meta: [{ title: "Your profile — ChrisEpic Arts" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [form, setForm] = useState({
    display_name: "", bio: "", location: "", website: "", avatar_url: "",
  });
  const [payout, setPayout] = useState({
    payout_method: "", payout_phone: "", payout_bank_name: "", payout_receiver_id: "",
  });

  useEffect(() => {
    (async () => {
      const me = await api.get<AuthUser>("/api/me");
      setEmail(me.email);
      const data = await api.get<{
        displayName: string | null; bio: string | null; location: string | null;
        website: string | null; avatarUrl: string | null;
        payoutMethod: string | null; payoutPhone: string | null;
        payoutBankName: string | null; payoutReceiverId: string | null;
      }>(`/api/profiles/${me.id}`);
      setForm({
        display_name: data.displayName ?? "",
        bio: data.bio ?? "",
        location: data.location ?? "",
        website: data.website ?? "",
        avatar_url: data.avatarUrl ?? "",
      });
      setPayout({
        payout_method: data.payoutMethod ?? "momo",
        payout_phone: data.payoutPhone ?? "",
        payout_bank_name: data.payoutBankName ?? "",
        payout_receiver_id: data.payoutReceiverId ?? "",
      });
      setLoading(false);
    })();
  }, []);

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });
  const setPayoutField = (k: string) => (e: any) => setPayout({ ...payout, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put("/api/me/profile", {
        displayName: form.display_name || null,
        bio: form.bio || null,
        location: form.location || null,
        website: form.website || null,
        avatarUrl: form.avatar_url || null,
        payoutMethod: payout.payout_method || null,
        payoutPhone: payout.payout_phone || null,
        payoutBankName: payout.payout_bank_name || null,
        payoutReceiverId: payout.payout_receiver_id || null,
      });
      toast.success("Profile updated");
      window.dispatchEvent(new Event("auth-changed"));
    } catch (e: any) {
      toast.error(e.message ?? "Could not update profile");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-background"><SiteHeader /><div className="p-10 text-muted-foreground">Loading…</div></div>;

  const initials = (form.display_name || email).slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-semibold">Your profile</h1>
        <p className="mt-1 text-muted-foreground">How buyers and other artists see you on ChrisEpic Arts.</p>

        <div className="mt-8 flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={form.avatar_url || undefined} alt={form.display_name} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{form.display_name || "Unnamed"}</p>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
        </div>

        <form onSubmit={save} className="mt-8 space-y-4">
          <div><Label>Display name</Label><Input value={form.display_name} onChange={set("display_name")} /></div>
          <div><Label>Avatar URL</Label><Input value={form.avatar_url} onChange={set("avatar_url")} placeholder="https://…" /></div>
          <div><Label>City</Label><Input value={form.location} onChange={set("location")} placeholder="Lusaka" /></div>
          <div><Label>Website</Label><Input value={form.website} onChange={set("website")} placeholder="https://…" /></div>
          <div><Label>Bio</Label><Textarea rows={4} value={form.bio} onChange={set("bio")} placeholder="A sentence or two about your practice." /></div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="font-medium">Payout account</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Used to pre-fill payout requests when you sell artworks, supplies, classes or exhibition tickets.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <Label>Method</Label>
                <select
                  value={payout.payout_method}
                  onChange={setPayoutField("payout_method")}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="momo">Mobile money</option>
                  <option value="bank">Bank transfer</option>
                </select>
              </div>
              {payout.payout_method === "bank" ? (
                <>
                  <div><Label>Bank name</Label><Input value={payout.payout_bank_name} onChange={setPayoutField("payout_bank_name")} /></div>
                  <div className="col-span-2"><Label>Account number</Label><Input value={payout.payout_receiver_id} onChange={setPayoutField("payout_receiver_id")} /></div>
                </>
              ) : (
                <div><Label>Mobile money number</Label><Input value={payout.payout_phone} onChange={setPayoutField("payout_phone")} placeholder="0971234567" /></div>
              )}
            </div>
          </div>

          <Button type="submit" size="lg" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
        </form>
      </div>
    </div>
  );
}
