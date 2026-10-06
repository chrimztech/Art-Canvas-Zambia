import { Link } from "@tanstack/react-router";
import { AdminRefunds } from "@/components/admin-refunds";
import { AdminReviews } from "@/components/admin-reviews";
import { AdminCollections, AdminInbox, AdminReports } from "@/components/admin-marketplace";
import { CouponManager } from "@/components/coupon-manager";
import { PaymentGateways } from "@/components/payment-gateways";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type {
  AdminCommission,
  AdminOrder,
  AdminSupply,
  AdminUser,
  ArtworkSummary,
  AuditLog,
  Category,
  ClassItem,
  Exhibition,
  PayoutRequest,
  PlatformBalance,
  PlatformSettings,
  Session,
  WalletBalance,
} from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Banknote,
  Fingerprint,
  GraduationCap,
  Lock,
  Package,
  Palette,
  Plus,
  ScrollText,
  Settings,
  Shield,
  Ticket,
  Trash2,
  type LucideIcon,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/utils";

type CategoryDraft = {
  name: string;
  slug: string;
  description: string;
  sortOrder: string;
};

const COMMISSION_STATUSES = [
  "requested",
  "quoted",
  "accepted",
  "in_progress",
  "delivered",
  "completed",
  "cancelled",
] as const;

const ORDER_STATUS_OPTIONS = ["paid", "fulfilled", "cancelled", "refunded"] as const;

export function AdminPanel() {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, CategoryDraft>>({});
  const [newCategory, setNewCategory] = useState<CategoryDraft>({
    name: "",
    slug: "",
    description: "",
    sortOrder: "0",
  });
  const [artworks, setArtworks] = useState<ArtworkSummary[]>([]);
  const [supplies, setSupplies] = useState<AdminSupply[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [commissions, setCommissions] = useState<AdminCommission[]>([]);
  const [commissionStatusDrafts, setCommissionStatusDrafts] = useState<Record<string, string>>({});
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [orderStatusDrafts, setOrderStatusDrafts] = useState<Record<string, string>>({});
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [platformFee, setPlatformFee] = useState("");
  const [royalty, setRoyalty] = useState("");
  const [currency, setCurrency] = useState("");
  const [paymentProvider, setPaymentProvider] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [developerAccount, setDeveloperAccount] = useState({
    method: "momo",
    phone: "",
    bankName: "",
    receiverId: "",
  });
  const [ownerAccount, setOwnerAccount] = useState({
    method: "momo",
    phone: "",
    bankName: "",
    receiverId: "",
  });
  const [developerBalance, setDeveloperBalance] = useState<PlatformBalance | null>(null);
  const [ownerBalance, setOwnerBalance] = useState<PlatformBalance | null>(null);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  const isAdmin = roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
  const isSuper = roles.includes("SUPER_ADMIN");

  async function load() {
    setLoading(true);
    try {
      const me = await api.get<{ roles: string[] }>("/api/me");
      setRoles(me.roles);
      if (!me.roles.includes("ADMIN") && !me.roles.includes("SUPER_ADMIN")) {
        return;
      }

      const [
        s,
        u,
        c,
        a,
        supplyData,
        classData,
        exhibitionData,
        commissionData,
        orderData,
        payoutData,
        w,
      ] = await Promise.all([
        api.get<PlatformSettings>("/api/admin/settings"),
        api.get<AdminUser[]>("/api/admin/users"),
        api.get<Category[]>("/api/admin/categories"),
        api.get<ArtworkSummary[]>("/api/admin/artworks"),
        api.get<AdminSupply[]>("/api/admin/supplies"),
        api.get<ClassItem[]>("/api/admin/classes"),
        api.get<Exhibition[]>("/api/admin/exhibitions"),
        api.get<AdminCommission[]>("/api/admin/commissions"),
        api.get<AdminOrder[]>("/api/admin/orders"),
        api.get<PayoutRequest[]>("/api/admin/payouts"),
        // The wallet lookup calls the payment provider; a provider outage must not blank the whole panel.
        api.get<WalletBalance>("/api/admin/wallet-balance").catch((e: Error) => ({
          disbursementBalance: null,
          collectionBalance: null,
          message: e.message || "Wallet balance is unavailable right now",
        })),
      ]);

      setSettings(s);
      setPlatformFee(String(s.platformFeePercent));
      setRoyalty(String(s.developerRoyaltyPercent));
      setCurrency(s.currency ?? "");
      setPaymentProvider(s.paymentProvider ?? "");
      setHeroImageUrl(s.heroImageUrl ?? null);
      setDeveloperAccount({
        method: s.developerPayoutMethod ?? "momo",
        phone: s.developerPayoutPhone ?? "",
        bankName: s.developerPayoutBankName ?? "",
        receiverId: s.developerPayoutReceiverId ?? "",
      });
      setOwnerAccount({
        method: s.ownerPayoutMethod ?? "momo",
        phone: s.ownerPayoutPhone ?? "",
        bankName: s.ownerPayoutBankName ?? "",
        receiverId: s.ownerPayoutReceiverId ?? "",
      });
      setUsers(u);
      setCategories(c);
      setCategoryDrafts(
        Object.fromEntries(c.map((category) => [category.id, toCategoryDraft(category)])),
      );
      setArtworks(a);
      setSupplies(supplyData);
      setClasses(classData);
      setExhibitions(exhibitionData);
      setCommissions(commissionData);
      setCommissionStatusDrafts(
        Object.fromEntries(commissionData.map((item) => [item.id, item.status])),
      );
      setOrders(orderData);
      setOrderStatusDrafts(Object.fromEntries(orderData.map((item) => [item.id, item.status])));
      setPayouts(payoutData);
      setWalletBalance(w);

      try {
        setSessions(await api.get<Session[]>("/api/admin/sessions"));
      } catch {
        // current admin may not hold PERM_USERS_MANAGE_SESSIONS - not fatal
      }
      try {
        setAuditLogs(await api.get<AuditLog[]>("/api/admin/audit-logs"));
      } catch {
        // not fatal - just skip the audit log tab's data
      }
      try {
        const [devBal, ownerBal] = await Promise.all([
          api.get<PlatformBalance>("/api/admin/platform-payouts/balance?payeeType=DEVELOPER"),
          api.get<PlatformBalance>("/api/admin/platform-payouts/balance?payeeType=OWNER"),
        ]);
        setDeveloperBalance(devBal);
        setOwnerBalance(ownerBal);
      } catch {
        // platform payouts are super-admin only - not fatal for other admins
      }
    } catch (error) {
      toast.error(errorMessage(error, "Could not load admin data"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function approvePayout(id: string) {
    try {
      await api.post(`/api/admin/payouts/${id}/approve`);
      toast.success("Payout submitted to ZynlePay");
      await load();
    } catch (error) {
      toast.error(errorMessage(error, "Could not approve payout"));
    }
  }

  async function rejectPayout(id: string) {
    const note = window.prompt("Reason for rejecting this payout (optional):") ?? undefined;
    try {
      await api.post(`/api/admin/payouts/${id}/reject`, { note });
      toast.success("Payout rejected");
      await load();
    } catch (error) {
      toast.error(errorMessage(error, "Could not reject payout"));
    }
  }

  async function saveSettings() {
    if (!settings) return;
    setSavingSettings(true);
    try {
      let nextHeroImageUrl = heroImageUrl;
      if (heroFile) {
        setUploadingHero(true);
        const uploaded = await api.upload<{ url: string }>("/api/uploads", heroFile);
        nextHeroImageUrl = uploaded.url;
        setUploadingHero(false);
      }
      await api.put("/api/admin/settings", {
        platformFeePercent: Number(platformFee),
        currency: currency.trim().toUpperCase(),
        paymentProvider: paymentProvider.trim() || "zynlepay",
        heroImageUrl: nextHeroImageUrl,
        ownerPayoutMethod: ownerAccount.method,
        ownerPayoutPhone: ownerAccount.phone || null,
        ownerPayoutBankName: ownerAccount.bankName || null,
        ownerPayoutReceiverId: ownerAccount.receiverId || null,
        ...(isSuper
          ? {
              developerRoyaltyPercent: Number(royalty),
              developerPayoutMethod: developerAccount.method,
              developerPayoutPhone: developerAccount.phone || null,
              developerPayoutBankName: developerAccount.bankName || null,
              developerPayoutReceiverId: developerAccount.receiverId || null,
            }
          : {}),
      });
      setHeroFile(null);
      toast.success("Settings saved");
      await load();
    } catch (error) {
      toast.error(errorMessage(error, "Could not save settings"));
    } finally {
      setSavingSettings(false);
      setUploadingHero(false);
    }
  }

  async function withdrawPlatformBalance(payeeType: "DEVELOPER" | "OWNER") {
    setWithdrawing(payeeType);
    try {
      await api.post(`/api/admin/platform-payouts?payeeType=${payeeType}`);
      toast.success("Withdrawal requested");
      await load();
    } catch (error) {
      toast.error(errorMessage(error, "Could not request withdrawal"));
    } finally {
      setWithdrawing(null);
    }
  }

  async function toggleRole(
    userId: string,
    role: "ARTIST" | "ADMIN" | "SUPER_ADMIN",
    hasRole: boolean,
  ) {
    try {
      if (hasRole) {
        await api.del(`/api/admin/users/${userId}/roles/${role}`);
      } else {
        await api.post(`/api/admin/users/${userId}/roles`, { role });
      }
      toast.success("Role updated");
      await load();
    } catch (error) {
      toast.error(errorMessage(error, "Could not update role"));
    }
  }

  async function setVerified(userId: string, verified: boolean) {
    try {
      await api.patch(`/api/admin/users/${userId}/verify`, { verified });
      toast.success(verified ? "Verified badge granted" : "Verification removed");
      await load();
    } catch (error) {
      toast.error(errorMessage(error, "Could not update verification"));
    }
  }

  async function deleteUser(userId: string, displayName: string | null) {
    if (
      !window.confirm(`Delete the account "${displayName ?? "this user"}"? This can't be undone.`)
    )
      return;
    try {
      await api.del(`/api/admin/users/${userId}`);
      toast.success("User deleted");
      await load();
    } catch (error) {
      toast.error(errorMessage(error, "Could not delete user"));
    }
  }

  async function revokeSession(id: string) {
    try {
      await api.del(`/api/admin/sessions/${id}`);
      toast.success("Session revoked");
      await load();
    } catch (error) {
      toast.error(errorMessage(error, "Could not revoke session"));
    }
  }

  async function revokeAllSessions(userId: string) {
    if (!window.confirm("Sign this user out of every device?")) return;
    try {
      await api.post(`/api/admin/users/${userId}/sessions/revoke-all`);
      toast.success("All sessions revoked");
      await load();
    } catch (error) {
      toast.error(errorMessage(error, "Could not revoke sessions"));
    }
  }

  async function setArtworkStatus(id: string, status: "published" | "draft" | "archived") {
    try {
      await api.patch(`/api/artworks/${id}/status`, { status });
      toast.success(`Artwork marked ${formatStatus(status)}`);
      await load();
    } catch (error) {
      toast.error(errorMessage(error, "Could not update artwork"));
    }
  }

  async function patchAdminStatus(path: string, status: string, successMessage: string) {
    try {
      await api.patch(path, { status });
      toast.success(successMessage);
      await load();
    } catch (error) {
      toast.error(errorMessage(error, "Could not update status"));
    }
  }

  async function syncOrder(id: string) {
    try {
      await api.post(`/api/orders/${id}/sync-status`);
      toast.success("Order status synced");
      await load();
    } catch (error) {
      toast.error(errorMessage(error, "Could not sync order"));
    }
  }

  async function createCategory() {
    try {
      await api.post("/api/admin/categories", {
        name: newCategory.name,
        slug: newCategory.slug || null,
        description: newCategory.description || null,
        sortOrder: Number(newCategory.sortOrder),
      });
      toast.success("Category created");
      setNewCategory({ name: "", slug: "", description: "", sortOrder: "0" });
      await load();
    } catch (error) {
      toast.error(errorMessage(error, "Could not create category"));
    }
  }

  async function saveCategory(categoryId: string) {
    const draft = categoryDrafts[categoryId];
    if (!draft) return;
    try {
      await api.put(`/api/admin/categories/${categoryId}`, {
        name: draft.name,
        slug: draft.slug || null,
        description: draft.description || null,
        sortOrder: Number(draft.sortOrder),
      });
      toast.success("Category updated");
      await load();
    } catch (error) {
      toast.error(errorMessage(error, "Could not update category"));
    }
  }

  async function deleteCategory(categoryId: string, categoryName: string) {
    if (!window.confirm(`Delete category "${categoryName}"?`)) return;
    try {
      await api.del(`/api/admin/categories/${categoryId}`);
      toast.success("Category deleted");
      await load();
    } catch (error) {
      toast.error(errorMessage(error, "Could not delete category"));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="page-container py-10 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="page-container py-20 text-center">
          <Shield className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <h1 className="mt-4 font-display text-2xl font-semibold">Admin access required</h1>
          <p className="mt-2 text-muted-foreground">
            Your account does not have admin privileges. Ask a super-admin to grant the role.
          </p>
          <Button variant="outline" className="mt-6" asChild>
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const royaltyNum = Number(royalty) || 0;
  const feeNum = Number(platformFee) || 0;
  const artistShare = Math.max(0, 100 - royaltyNum - feeNum);
  const catalogCount = artworks.length + supplies.length + classes.length + exhibitions.length;
  const openOperationsCount =
    commissions.filter((item) => item.status !== "completed" && item.status !== "cancelled")
      .length + orders.filter((item) => item.status === "paid").length;
  const pendingPayouts = payouts.filter((item) => item.status === "requested").length;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="page-container py-10">
        <div className="space-y-8">
          <Card className="overflow-hidden">
            <CardContent className="relative p-8 sm:p-10">
              <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(215,182,95,0.28),transparent_72%)]" />
              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[0.68rem] uppercase tracking-[0.22em] text-primary">
                    <Shield className="h-3.5 w-3.5" />
                    Platform operations
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <h1 className="font-display text-4xl leading-none sm:text-5xl">Admin panel</h1>
                    {isSuper && <Badge>Super Admin</Badge>}
                  </div>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                    Manage platform settings, users, taxonomy, moderation, payouts, and operational
                    health from one executive workspace.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/dashboard">Back to dashboard</Link>
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => void load()}>
                    Refresh data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AdminSnapshotCard
              icon={Users}
              label="User access"
              value={users.length.toLocaleString()}
              detail="Accounts with role and platform access controls."
            />
            <AdminSnapshotCard
              icon={Palette}
              label="Live catalog"
              value={catalogCount.toLocaleString()}
              detail="Artworks, supplies, classes, and exhibitions under management."
            />
            <AdminSnapshotCard
              icon={Package}
              label="Open queues"
              value={openOperationsCount.toLocaleString()}
              detail="Commissions and orders that still need operational attention."
            />
            <AdminSnapshotCard
              icon={Banknote}
              label="Pending payouts"
              value={pendingPayouts.toLocaleString()}
              detail="Requests waiting on payout review or approval."
            />
          </div>

          <Tabs defaultValue="settings">
            <TabsList className="flex h-auto flex-wrap gap-2">
              <TabsTrigger value="settings">
                <Settings className="mr-1.5 h-4 w-4" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="users">
                <Users className="mr-1.5 h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="content">
                <Palette className="mr-1.5 h-4 w-4" />
                Content
              </TabsTrigger>
              <TabsTrigger value="commissions">Commissions</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="payouts">
                <Banknote className="mr-1.5 h-4 w-4" />
                Payouts
              </TabsTrigger>
              <TabsTrigger value="refunds">Refunds</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="collections">Collections</TabsTrigger>
              <TabsTrigger value="coupons">Coupons</TabsTrigger>
              <TabsTrigger value="inbox">Inbox</TabsTrigger>
              <TabsTrigger value="sessions">
                <Fingerprint className="mr-1.5 h-4 w-4" />
                Sessions
              </TabsTrigger>
              <TabsTrigger value="audit">
                <ScrollText className="mr-1.5 h-4 w-4" />
                Audit log
              </TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="mt-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Revenue and platform settings</CardTitle>
                    <CardDescription>
                      Control the sale split plus the main payment and currency settings used across
                      the platform.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div>
                      <Label htmlFor="fee">Platform fee (%)</Label>
                      <Input
                        id="fee"
                        type="number"
                        step="0.1"
                        min="0"
                        max="50"
                        value={platformFee}
                        onChange={(event) => setPlatformFee(event.target.value)}
                        className="mt-1.5 max-w-xs"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Platform commission on each sale.
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="roy" className="flex items-center gap-1.5">
                        Developer royalty (%)
                        {!isSuper && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </Label>
                      <Input
                        id="roy"
                        type="number"
                        step="0.1"
                        min="0"
                        max="50"
                        value={royalty}
                        onChange={(event) => setRoyalty(event.target.value)}
                        disabled={!isSuper}
                        className="mt-1.5 max-w-xs"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {isSuper
                          ? "Restricted to super-admins. Contractual default: 7%."
                          : "Only the super-admin can change this. Default: 7%."}
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="currency">Currency</Label>
                        <Input
                          id="currency"
                          value={currency}
                          onChange={(event) => setCurrency(event.target.value)}
                          className="mt-1.5"
                          placeholder="ZMW"
                          maxLength={8}
                        />
                      </div>
                      <div>
                        <Label htmlFor="provider">Payment provider</Label>
                        <select
                          id="provider"
                          value={paymentProvider || "zynlepay"}
                          onChange={(event) => setPaymentProvider(event.target.value)}
                          className="mt-1.5 h-11 w-full rounded-2xl border border-input/90 bg-card/55 px-4 text-sm"
                        >
                          <option value="zynlepay">ZynlePay</option>
                          <option value="lenco">Lenco</option>
                        </select>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Handles new checkouts and payout approvals. Orders already in progress
                          finish on the gateway they started with.
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="hero-image">Landing page cover image</Label>
                      {heroImageUrl && (
                        <div className="mt-2 aspect-[16/9] max-w-sm overflow-hidden rounded-lg border border-border">
                          <img
                            src={heroImageUrl}
                            alt="Landing page cover"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                      <Input
                        id="hero-image"
                        type="file"
                        accept="image/*"
                        className="mt-2 max-w-sm"
                        onChange={(event) => setHeroFile(event.target.files?.[0] ?? null)}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Replaces the cover photo shown in the homepage hero. Saved when you click
                        "Save changes".
                      </p>
                    </div>

                    <Button onClick={saveSettings} disabled={savingSettings || uploadingHero}>
                      {uploadingHero ? "Uploading…" : savingSettings ? "Saving..." : "Save changes"}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Split preview</CardTitle>
                    <CardDescription>For every K100 in sales</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Row label="Artist payout" value={artistShare} color="bg-primary" />
                    <Row label="Platform fee" value={feeNum} color="bg-secondary" />
                    <Row
                      label="Developer royalty"
                      value={royaltyNum}
                      color="bg-accent-foreground/70"
                    />
                    {artistShare < 0 && (
                      <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        Total exceeds 100%. Adjust the values before saving.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle>ZynlePay wallet</CardTitle>
                    <CardDescription>
                      Live balance from the platform merchant account.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {walletBalance?.message && !walletBalance.collectionBalance && (
                      <p className="text-sm text-destructive">{walletBalance.message}</p>
                    )}
                    {(walletBalance?.collectionBalance || walletBalance?.disbursementBalance) && (
                      <div className="grid gap-4 text-sm sm:grid-cols-2">
                        <div>
                          <p className="text-muted-foreground">Collection balance</p>
                          <p className="font-display text-xl font-semibold">
                            K{walletBalance.collectionBalance}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Disbursement balance</p>
                          <p className="font-display text-xl font-semibold">
                            K{walletBalance.disbursementBalance}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Platform owner payout account</CardTitle>
                    <CardDescription>
                      Where the platform fee share of every sale is withdrawn to.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <PayoutAccountFields
                      account={ownerAccount}
                      onChange={setOwnerAccount}
                      idPrefix="owner"
                    />
                    <PlatformBalanceRow
                      balance={ownerBalance}
                      withdrawing={withdrawing === "OWNER"}
                      onWithdraw={() => void withdrawPlatformBalance("OWNER")}
                    />
                  </CardContent>
                </Card>

                {isSuper && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-1.5">
                        Developer payout account <Lock className="h-3 w-3 text-muted-foreground" />
                      </CardTitle>
                      <CardDescription>
                        Where the developer royalty share of every sale is withdrawn to. Super-admin
                        only.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <PayoutAccountFields
                        account={developerAccount}
                        onChange={setDeveloperAccount}
                        idPrefix="developer"
                      />
                      <PlatformBalanceRow
                        balance={developerBalance}
                        withdrawing={withdrawing === "DEVELOPER"}
                        onWithdraw={() => void withdrawPlatformBalance("DEVELOPER")}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
              {isSuper && (
                <div className="mt-6">
                  <PaymentGateways onSaved={() => void load()} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="users" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Users ({users.length})</CardTitle>
                  <CardDescription>
                    Grant or revoke roles. Super-admin role changes are restricted to super-admins,
                    and the last super-admin cannot be removed.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {users.map((user) => {
                      const userRoles = user.roles;
                      return (
                        <div key={user.id} className="flex flex-wrap items-center gap-3 p-4">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">
                              {user.displayName ?? "Unnamed user"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {user.email ?? "No email on file"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Joined {new Date(user.createdAt).toLocaleString()}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {userRoles.map((role) => (
                                <Badge key={role} variant="secondary" className="text-xs">
                                  {role.toLowerCase()}
                                </Badge>
                              ))}
                              {user.verified && <Badge className="text-xs">verified</Badge>}
                              {!user.verified && user.verificationRequestedAt && (
                                <Badge
                                  variant="outline"
                                  className="border-primary text-xs text-primary"
                                >
                                  verification requested{" "}
                                  {new Date(user.verificationRequestedAt).toLocaleDateString()}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant={user.verified ? "default" : "outline"}
                              onClick={() => void setVerified(user.id, !user.verified)}
                            >
                              {user.verified ? "Verified" : "Verify"}
                            </Button>
                            <Button
                              size="sm"
                              variant={userRoles.includes("ARTIST") ? "default" : "outline"}
                              onClick={() =>
                                void toggleRole(user.id, "ARTIST", userRoles.includes("ARTIST"))
                              }
                            >
                              Artist
                            </Button>
                            <Button
                              size="sm"
                              variant={userRoles.includes("ADMIN") ? "default" : "outline"}
                              onClick={() =>
                                void toggleRole(user.id, "ADMIN", userRoles.includes("ADMIN"))
                              }
                            >
                              Admin
                            </Button>
                            {isSuper && (
                              <Button
                                size="sm"
                                variant={userRoles.includes("SUPER_ADMIN") ? "default" : "outline"}
                                onClick={() =>
                                  void toggleRole(
                                    user.id,
                                    "SUPER_ADMIN",
                                    userRoles.includes("SUPER_ADMIN"),
                                  )
                                }
                              >
                                Super
                              </Button>
                            )}
                            {isSuper && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => void deleteUser(user.id, user.displayName)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categories" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Create category</CardTitle>
                  <CardDescription>
                    Maintain the artwork taxonomy used across browsing and upload flows.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-4">
                  <Input
                    value={newCategory.name}
                    onChange={(event) =>
                      setNewCategory({ ...newCategory, name: event.target.value })
                    }
                    placeholder="Name"
                  />
                  <Input
                    value={newCategory.slug}
                    onChange={(event) =>
                      setNewCategory({ ...newCategory, slug: event.target.value })
                    }
                    placeholder="Slug (optional)"
                  />
                  <Input
                    value={newCategory.description}
                    onChange={(event) =>
                      setNewCategory({ ...newCategory, description: event.target.value })
                    }
                    placeholder="Description"
                  />
                  <div className="flex gap-2">
                    <Input
                      value={newCategory.sortOrder}
                      onChange={(event) =>
                        setNewCategory({ ...newCategory, sortOrder: event.target.value })
                      }
                      type="number"
                      placeholder="Sort order"
                    />
                    <Button
                      onClick={() => void createCategory()}
                      disabled={!newCategory.name.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Categories ({categories.length})</CardTitle>
                  <CardDescription>Edit names, slugs and ordering inline.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {categories.map((category) => {
                    const draft = categoryDrafts[category.id] ?? toCategoryDraft(category);
                    return (
                      <div
                        key={category.id}
                        className="grid gap-3 rounded-xl border border-border p-4 lg:grid-cols-[1.2fr_1fr_1.5fr_120px_auto_auto]"
                      >
                        <Input
                          value={draft.name}
                          onChange={(event) =>
                            setCategoryDrafts({
                              ...categoryDrafts,
                              [category.id]: { ...draft, name: event.target.value },
                            })
                          }
                          placeholder="Name"
                        />
                        <Input
                          value={draft.slug}
                          onChange={(event) =>
                            setCategoryDrafts({
                              ...categoryDrafts,
                              [category.id]: { ...draft, slug: event.target.value },
                            })
                          }
                          placeholder="Slug"
                        />
                        <Input
                          value={draft.description}
                          onChange={(event) =>
                            setCategoryDrafts({
                              ...categoryDrafts,
                              [category.id]: { ...draft, description: event.target.value },
                            })
                          }
                          placeholder="Description"
                        />
                        <Input
                          value={draft.sortOrder}
                          onChange={(event) =>
                            setCategoryDrafts({
                              ...categoryDrafts,
                              [category.id]: { ...draft, sortOrder: event.target.value },
                            })
                          }
                          type="number"
                          placeholder="Order"
                        />
                        <Button variant="outline" onClick={() => void saveCategory(category.id)}>
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => void deleteCategory(category.id, category.name)}
                        >
                          Delete
                        </Button>
                      </div>
                    );
                  })}
                  {categories.length === 0 && (
                    <p className="p-8 text-center text-sm text-muted-foreground">
                      No categories yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="content" className="mt-6 space-y-6">
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle>Artworks ({artworks.length})</CardTitle>
                    <CardDescription>
                      Moderate artist listings already in the marketplace.
                    </CardDescription>
                  </div>
                  <Button size="sm" asChild>
                    <Link to="/dashboard/upload">
                      <Plus className="h-4 w-4" />
                      Add artwork
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {artworks.map((artwork) => (
                      <div key={artwork.id} className="flex flex-wrap items-center gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <Link
                            to="/artworks/$slug"
                            params={{ slug: artwork.slug }}
                            className="block truncate font-medium hover:text-primary"
                          >
                            {artwork.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            by {artwork.artistDisplayName ?? "Unknown artist"} ·{" "}
                            {formatMoney(artwork.priceZmw)}
                          </p>
                        </div>
                        <Badge variant={artwork.status === "published" ? "default" : "secondary"}>
                          {formatStatus(artwork.status)}
                        </Badge>
                        <div className="flex gap-2">
                          {artwork.status !== "published" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void setArtworkStatus(artwork.id, "published")}
                            >
                              Publish
                            </Button>
                          )}
                          {artwork.status !== "draft" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void setArtworkStatus(artwork.id, "draft")}
                            >
                              Draft
                            </Button>
                          )}
                          {artwork.status !== "archived" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void setArtworkStatus(artwork.id, "archived")}
                            >
                              Archive
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {artworks.length === 0 && (
                      <p className="p-8 text-center text-sm text-muted-foreground">
                        No artworks yet.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      Supplies ({supplies.length})
                    </CardTitle>
                    <CardDescription>Review and moderate supply listings.</CardDescription>
                  </div>
                  <Button size="sm" asChild>
                    <Link to="/dashboard/new-supply">
                      <Plus className="h-4 w-4" />
                      Add supply
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {supplies.map((supply) => (
                      <div key={supply.id} className="flex flex-wrap items-center gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{supply.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {supply.sellerDisplayName ?? "Unknown seller"} ·{" "}
                            {formatMoney(supply.priceZmw)} · {supply.stock} in stock
                          </p>
                        </div>
                        <Badge variant={supply.status === "published" ? "default" : "secondary"}>
                          {formatStatus(supply.status)}
                        </Badge>
                        <div className="flex gap-2">
                          {supply.status !== "published" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                void patchAdminStatus(
                                  `/api/admin/supplies/${supply.id}/status`,
                                  "published",
                                  "Supply published",
                                )
                              }
                            >
                              Publish
                            </Button>
                          )}
                          {supply.status !== "draft" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                void patchAdminStatus(
                                  `/api/admin/supplies/${supply.id}/status`,
                                  "draft",
                                  "Supply moved to draft",
                                )
                              }
                            >
                              Draft
                            </Button>
                          )}
                          {supply.status !== "archived" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                void patchAdminStatus(
                                  `/api/admin/supplies/${supply.id}/status`,
                                  "archived",
                                  "Supply archived",
                                )
                              }
                            >
                              Archive
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {supplies.length === 0 && (
                      <p className="p-8 text-center text-sm text-muted-foreground">
                        No supplies yet.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      Classes ({classes.length})
                    </CardTitle>
                    <CardDescription>
                      Control visibility and completion state for classes.
                    </CardDescription>
                  </div>
                  <Button size="sm" asChild>
                    <Link to="/dashboard/new-class">
                      <Plus className="h-4 w-4" />
                      Add class
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {classes.map((item) => (
                      <div key={item.id} className="flex flex-wrap items-center gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <Link
                            to="/classes/$slug"
                            params={{ slug: item.slug }}
                            className="block truncate font-medium hover:text-primary"
                          >
                            {item.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {item.instructorDisplayName ?? "Unknown instructor"} ·{" "}
                            {new Date(item.startsAt).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant={item.status === "published" ? "default" : "secondary"}>
                          {formatStatus(item.status)}
                        </Badge>
                        <div className="flex gap-2">
                          {item.status !== "published" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                void patchAdminStatus(
                                  `/api/admin/classes/${item.id}/status`,
                                  "published",
                                  "Class published",
                                )
                              }
                            >
                              Publish
                            </Button>
                          )}
                          {item.status !== "completed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                void patchAdminStatus(
                                  `/api/admin/classes/${item.id}/status`,
                                  "completed",
                                  "Class marked completed",
                                )
                              }
                            >
                              Complete
                            </Button>
                          )}
                          {item.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                void patchAdminStatus(
                                  `/api/admin/classes/${item.id}/status`,
                                  "cancelled",
                                  "Class cancelled",
                                )
                              }
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {classes.length === 0 && (
                      <p className="p-8 text-center text-sm text-muted-foreground">
                        No classes yet.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-primary" />
                      Exhibitions ({exhibitions.length})
                    </CardTitle>
                    <CardDescription>
                      Moderate exhibition listings and event lifecycle status.
                    </CardDescription>
                  </div>
                  <Button size="sm" asChild>
                    <Link to="/dashboard/new-exhibition">
                      <Plus className="h-4 w-4" />
                      Add exhibition
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {exhibitions.map((item) => (
                      <div key={item.id} className="flex flex-wrap items-center gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <Link
                            to="/exhibitions/$slug"
                            params={{ slug: item.slug }}
                            className="block truncate font-medium hover:text-primary"
                          >
                            {item.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {item.organizerDisplayName ?? "Unknown organizer"} · {item.venue}
                            {item.city ? `, ${item.city}` : ""}
                          </p>
                        </div>
                        <Badge variant={item.status === "published" ? "default" : "secondary"}>
                          {formatStatus(item.status)}
                        </Badge>
                        <div className="flex gap-2">
                          {item.status !== "published" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                void patchAdminStatus(
                                  `/api/admin/exhibitions/${item.id}/status`,
                                  "published",
                                  "Exhibition published",
                                )
                              }
                            >
                              Publish
                            </Button>
                          )}
                          {item.status !== "completed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                void patchAdminStatus(
                                  `/api/admin/exhibitions/${item.id}/status`,
                                  "completed",
                                  "Exhibition marked completed",
                                )
                              }
                            >
                              Complete
                            </Button>
                          )}
                          {item.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                void patchAdminStatus(
                                  `/api/admin/exhibitions/${item.id}/status`,
                                  "cancelled",
                                  "Exhibition cancelled",
                                )
                              }
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {exhibitions.length === 0 && (
                      <p className="p-8 text-center text-sm text-muted-foreground">
                        No exhibitions yet.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="commissions" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Commissions ({commissions.length})</CardTitle>
                  <CardDescription>
                    See every commission request and override status when moderation or support is
                    needed.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {commissions.map((commission) => {
                    const selectedStatus =
                      commissionStatusDrafts[commission.id] ?? commission.status;
                    return (
                      <div
                        key={commission.id}
                        className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-4"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{commission.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Customer: {commission.customerDisplayName ?? commission.customerId}
                            {" · "}
                            Artist: {commission.artistDisplayName ?? "Unclaimed"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Budget:{" "}
                            {commission.budgetZmw ? formatMoney(commission.budgetZmw) : "Not set"}
                            {commission.quotedPriceZmw
                              ? ` · Quote: ${formatMoney(commission.quotedPriceZmw)}`
                              : ""}
                          </p>
                        </div>
                        <Badge
                          variant={commission.status === "completed" ? "default" : "secondary"}
                        >
                          {formatStatus(commission.status)}
                        </Badge>
                        <select
                          value={selectedStatus}
                          onChange={(event) =>
                            setCommissionStatusDrafts({
                              ...commissionStatusDrafts,
                              [commission.id]: event.target.value,
                            })
                          }
                          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                        >
                          {COMMISSION_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {formatStatus(status)}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={selectedStatus === commission.status}
                          onClick={() =>
                            void patchAdminStatus(
                              `/api/admin/commissions/${commission.id}/status`,
                              selectedStatus,
                              `Commission marked ${formatStatus(selectedStatus)}`,
                            )
                          }
                        >
                          Update
                        </Button>
                      </div>
                    );
                  })}
                  {commissions.length === 0 && (
                    <p className="p-8 text-center text-sm text-muted-foreground">
                      No commissions yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Orders ({orders.length})</CardTitle>
                  <CardDescription>
                    Monitor checkout outcomes, sync pending payments and update downstream order
                    state.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {orders.map((order) => {
                    const selectedStatus = orderStatusDrafts[order.id] ?? order.status;
                    return (
                      <div
                        key={order.id}
                        className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-4"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{order.orderNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            Buyer: {order.buyerDisplayName ?? "Unknown buyer"}
                            {order.buyerEmail ? ` (${order.buyerEmail})` : ""}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatMoney(order.totalZmw)}
                            {order.paymentProvider ? ` · ${order.paymentProvider}` : ""}
                            {order.paymentReference ? ` · Ref: ${order.paymentReference}` : ""}
                          </p>
                        </div>
                        <Badge
                          variant={
                            order.status === "fulfilled" || order.status === "paid"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {formatStatus(order.status)}
                        </Badge>
                        {order.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void syncOrder(order.id)}
                          >
                            Sync payment
                          </Button>
                        )}
                        <select
                          value={selectedStatus}
                          onChange={(event) =>
                            setOrderStatusDrafts({
                              ...orderStatusDrafts,
                              [order.id]: event.target.value,
                            })
                          }
                          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                        >
                          {!ORDER_STATUS_OPTIONS.includes(
                            order.status as (typeof ORDER_STATUS_OPTIONS)[number],
                          ) && <option value={order.status}>{formatStatus(order.status)}</option>}
                          {ORDER_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {formatStatus(status)}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={selectedStatus === order.status}
                          onClick={() =>
                            void patchAdminStatus(
                              `/api/admin/orders/${order.id}/status`,
                              selectedStatus,
                              `Order marked ${formatStatus(selectedStatus)}`,
                            )
                          }
                        >
                          Update
                        </Button>
                      </div>
                    );
                  })}
                  {orders.length === 0 && (
                    <p className="p-8 text-center text-sm text-muted-foreground">No orders yet.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payouts" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Payout requests ({payouts.length})</CardTitle>
                  <CardDescription>
                    {isSuper
                      ? "Approving triggers a live disbursement via ZynlePay."
                      : "Only a super-admin can approve payouts. Admins can still reject requests."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {payouts.map((payout) => (
                      <div key={payout.id} className="flex flex-wrap items-center gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">
                            {payout.payeeType === "SELLER"
                              ? (payout.artistDisplayName ?? "Seller")
                              : formatStatus(payout.payeeType).toLowerCase()}{" "}
                            · {formatMoney(payout.amountZmw)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {payout.referenceNo} ·{" "}
                            {payout.method === "momo"
                              ? payout.phone
                              : `${payout.bankName ?? "Bank"} · ${payout.receiverId ?? "No account"}`}
                          </p>
                          {payout.adminNote && (
                            <p className="mt-1 text-xs text-destructive">{payout.adminNote}</p>
                          )}
                        </div>
                        <Badge
                          variant={
                            payout.status === "paid"
                              ? "default"
                              : payout.status === "requested"
                                ? "outline"
                                : "secondary"
                          }
                          className="capitalize"
                        >
                          {formatStatus(payout.status)}
                        </Badge>
                        {payout.status === "requested" && (
                          <div className="flex gap-2">
                            {isSuper && (
                              <Button size="sm" onClick={() => void approvePayout(payout.id)}>
                                Approve
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void rejectPayout(payout.id)}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                    {payouts.length === 0 && (
                      <p className="p-8 text-center text-sm text-muted-foreground">
                        No payout requests yet.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sessions" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Active sessions ({sessions.length})</CardTitle>
                  <CardDescription>
                    Every signed-in device across the platform. Revoke a session to sign that device
                    out immediately.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {sessions.map((session) => (
                      <div key={session.id} className="flex flex-wrap items-center gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {session.userDisplayName ?? "Unnamed user"}
                            {session.userEmail ? ` · ${session.userEmail}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session.ipAddress ?? "Unknown IP"} ·{" "}
                            {session.userAgent ?? "Unknown device"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Last seen {new Date(session.lastSeenAt).toLocaleString()} · Expires{" "}
                            {new Date(session.expiresAt).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant={session.active ? "default" : "secondary"}>
                          {session.active ? "Active" : "Revoked/expired"}
                        </Badge>
                        {session.active && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void revokeSession(session.id)}
                            >
                              Revoke
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => void revokeAllSessions(session.userId)}
                            >
                              Sign out everywhere
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                    {sessions.length === 0 && (
                      <p className="p-8 text-center text-sm text-muted-foreground">
                        No sessions to show.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="refunds" className="mt-6">
              <AdminRefunds />
            </TabsContent>

            <TabsContent value="reviews" className="mt-6">
              <AdminReviews />
            </TabsContent>

            <TabsContent value="reports" className="mt-6">
              <AdminReports />
            </TabsContent>

            <TabsContent value="collections" className="mt-6">
              <AdminCollections />
            </TabsContent>

            <TabsContent value="coupons" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Platform discount codes</CardTitle>
                  <CardDescription>
                    Site-wide codes apply to every seller's items. The discount comes out of the
                    platform's share, never the seller's payout.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CouponManager basePath="/api/admin/coupons" canDelete={false} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="inbox" className="mt-6">
              <AdminInbox />
            </TabsContent>

            <TabsContent value="audit" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Audit log ({auditLogs.length})</CardTitle>
                  <CardDescription>
                    Recent administrative actions across the platform, most recent first.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {auditLogs.map((entry) => (
                      <div key={entry.id} className="flex flex-wrap items-center gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{formatStatus(entry.action)}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.actorLabel ?? "System"}
                            {entry.targetLabel
                              ? ` → ${entry.targetType?.toLowerCase() ?? "target"}: ${entry.targetLabel}`
                              : ""}
                          </p>
                          {entry.details && (
                            <p className="mt-1 text-xs text-muted-foreground">{entry.details}</p>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                    {auditLogs.length === 0 && (
                      <p className="p-8 text-center text-sm text-muted-foreground">
                        No audit log entries yet.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-semibold">{value.toFixed(1)}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
        <div className={color} style={{ width: `${pct}%`, height: "100%" }} />
      </div>
    </div>
  );
}

function AdminSnapshotCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="font-display text-3xl leading-none text-foreground">{value}</div>
        </div>
        <div>
          <p className="text-[0.72rem] uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

function formatMoney(value: number) {
  return `K${Number(value).toLocaleString()}`;
}

type PayoutAccountState = { method: string; phone: string; bankName: string; receiverId: string };

function PayoutAccountFields({
  account,
  onChange,
  idPrefix,
}: {
  account: PayoutAccountState;
  onChange: (next: PayoutAccountState) => void;
  idPrefix: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <Label htmlFor={`${idPrefix}-method`}>Method</Label>
        <select
          id={`${idPrefix}-method`}
          value={account.method}
          onChange={(event) => onChange({ ...account, method: event.target.value })}
          className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="momo">Mobile money</option>
          <option value="bank">Bank transfer</option>
        </select>
      </div>
      {account.method === "bank" ? (
        <>
          <div>
            <Label htmlFor={`${idPrefix}-bank`}>Bank name</Label>
            <Input
              id={`${idPrefix}-bank`}
              value={account.bankName}
              onChange={(event) => onChange({ ...account, bankName: event.target.value })}
            />
          </div>
          <div>
            <Label htmlFor={`${idPrefix}-account`}>Account number</Label>
            <Input
              id={`${idPrefix}-account`}
              value={account.receiverId}
              onChange={(event) => onChange({ ...account, receiverId: event.target.value })}
            />
          </div>
        </>
      ) : (
        <div className="col-span-2">
          <Label htmlFor={`${idPrefix}-phone`}>Mobile money number</Label>
          <Input
            id={`${idPrefix}-phone`}
            value={account.phone}
            onChange={(event) => onChange({ ...account, phone: event.target.value })}
            placeholder="0971234567"
          />
        </div>
      )}
    </div>
  );
}

function PlatformBalanceRow({
  balance,
  withdrawing,
  onWithdraw,
}: {
  balance: PlatformBalance | null;
  withdrawing: boolean;
  onWithdraw: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3">
      <div>
        <p className="text-xs text-muted-foreground">Available to withdraw</p>
        <p className="font-display text-xl font-semibold">
          {balance ? formatMoney(balance.availableBalance) : "—"}
        </p>
      </div>
      <Button
        size="sm"
        disabled={withdrawing || !balance || balance.availableBalance <= 0}
        onClick={onWithdraw}
      >
        {withdrawing ? "Requesting…" : "Withdraw"}
      </Button>
    </div>
  );
}

function toCategoryDraft(category: Category): CategoryDraft {
  return {
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
    sortOrder: String(category.sortOrder),
  };
}
