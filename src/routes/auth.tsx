import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { hasSession } from "@/lib/api-client";
import { login, register } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { errorMessage } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  // Only same-site paths are honoured, so the parameter can't be used as an open redirect.
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect:
      typeof search.redirect === "string" &&
      search.redirect.startsWith("/") &&
      !search.redirect.startsWith("//")
        ? search.redirect
        : undefined,
  }),
  head: () => ({ meta: [{ title: "Sign in — ChrisEpic Arts" }] }),
  component: Auth,
});

const ROLE_OPTIONS = [
  { value: "customer", label: "Buy art", hint: "Collect work, commission artists" },
  { value: "artist", label: "Sell art", hint: "Publish artworks, take commissions" },
  { value: "instructor", label: "Teach", hint: "Run classes and workshops" },
  { value: "supplier", label: "Sell supplies", hint: "Paint, brushes, canvas, tools" },
];

function Auth() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const destination = redirect ?? "/dashboard";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [intendedRole, setIntendedRole] = useState("customer");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hasSession()) navigate({ href: destination, replace: true });
  }, [navigate, destination]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        await register(email, password, name, intendedRole, { phone, location, bio });
        toast.success("Account created!");
      } else {
        await login(email, password);
      }
      navigate({ href: destination, replace: true });
    } catch (err) {
      toast.error(errorMessage(err, "Something went wrong"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto flex max-w-md flex-col px-4 py-16">
        <h1 className="font-display text-3xl font-semibold">
          {mode === "signin" ? "Welcome back" : "Join ChrisEpic Arts"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Sign in to your account"
            : "Create an account to buy, sell, learn and commission art."}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {mode === "signup" && (
            <>
              <div>
                <Label htmlFor="name">Display name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <Label>I'm joining to…</Label>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ROLE_OPTIONS.map((r) => (
                    <button
                      type="button"
                      key={r.value}
                      onClick={() => setIntendedRole(r.value)}
                      className={`rounded-md border p-3 text-left text-sm transition-colors ${intendedRole === r.value ? "border-primary bg-accent" : "border-border hover:border-primary/50"}`}
                    >
                      <div className="font-medium">{r.label}</div>
                      <div className="text-xs text-muted-foreground">{r.hint}</div>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  You can add more roles later from your dashboard.
                </p>
              </div>
            </>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {mode === "signin" && (
                <Link
                  to="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          {mode === "signup" && (
            <>
              <div>
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="location">Location (optional)</Label>
                <Input
                  id="location"
                  placeholder="e.g. Lusaka, Zambia"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="bio">Short bio (optional)</Label>
                <Input
                  id="bio"
                  placeholder="A line about you"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>
            </>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-6 text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin"
            ? "Don't have an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
