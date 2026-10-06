import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { ArtistDetail } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ArtworkCard } from "@/components/artwork-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BadgeCheck,
  Brush,
  Facebook,
  Globe,
  Instagram,
  MapPin,
  Megaphone,
  Music2,
  Palmtree,
  Twitter,
} from "lucide-react";
import { FollowButton } from "@/components/follow-button";
import { ReportButton } from "@/components/report-button";
import { MessageButton } from "@/components/message-button";
import { SellerReviews } from "@/components/seller-reviews";
import { RatingBadge } from "@/components/star-rating";

export const Route = createFileRoute("/artists/$id")({
  head: () => ({ meta: [{ title: "Artist — ChrisEpic Arts" }] }),
  component: ArtistProfile,
});

function safeUrl(url: string | null) {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function ArtistProfile() {
  const { id } = Route.useParams();
  const [profile, setProfile] = useState<ArtistDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<ArtistDetail>(`/api/artists/${id}`)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="p-10 text-muted-foreground">Loading…</div>
      </div>
    );
  if (!profile)
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="p-10">
          Artist not found.{" "}
          <Link to="/artists" className="text-primary hover:underline">
            Back
          </Link>
        </div>
      </div>
    );

  const initials = (profile.displayName ?? "A").slice(0, 2).toUpperCase();
  const available = profile.artworks.filter((a) => a.status === "published");
  const sold = profile.artworks.filter((a) => a.status === "sold");
  const links = [
    { href: safeUrl(profile.website), icon: Globe, label: "Website" },
    {
      href: profile.instagram
        ? `https://instagram.com/${profile.instagram.replace(/^@/, "")}`
        : null,
      icon: Instagram,
      label: profile.instagram ? `@${profile.instagram.replace(/^@/, "")}` : "",
    },
    { href: safeUrl(profile.facebookUrl), icon: Facebook, label: "Facebook" },
    { href: safeUrl(profile.twitterUrl), icon: Twitter, label: "X" },
    { href: safeUrl(profile.tiktokUrl), icon: Music2, label: "TikTok" },
  ].filter((l) => l.href);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="h-48 w-full overflow-hidden bg-gradient-to-br from-card to-muted sm:h-64">
        {profile.coverImageUrl && (
          <img src={profile.coverImageUrl} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="page-container">
        <div className="-mt-12 flex flex-col items-center gap-4 sm:flex-row sm:items-end">
          <Avatar className="h-28 w-28 border-4 border-background">
            <AvatarImage src={profile.avatarUrl ?? undefined} />
            <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center sm:pb-2 sm:text-left">
            <h1 className="flex items-center justify-center gap-2 font-display text-3xl font-semibold sm:justify-start">
              {profile.displayName ?? "Unnamed artist"}
              {profile.verified && (
                <BadgeCheck className="h-6 w-6 text-primary" aria-label="Verified artist" />
              )}
            </h1>
            <div className="mt-1 flex flex-wrap justify-center gap-3 text-sm text-muted-foreground sm:justify-start">
              {profile.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {profile.location}
                </span>
              )}
              {profile.yearsExperience != null && (
                <span>{profile.yearsExperience}+ years practising</span>
              )}
              <RatingBadge average={profile.averageRating} count={profile.reviewCount} />
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-2 sm:mb-2">
            <FollowButton
              artistId={profile.id}
              following={profile.followedByMe}
              followerCount={profile.followerCount}
            />
            <MessageButton recipientId={profile.id} recipientName={profile.displayName} />
            <Button asChild>
              <Link
                to="/commissions"
                search={{ artist: profile.id, artistName: profile.displayName ?? undefined }}
              >
                <Brush className="h-4 w-4" />
                Commission
              </Link>
            </Button>
          </div>
        </div>

        {profile.vacationMode && (
          <p className="mt-6 flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <Palmtree className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              {profile.displayName ?? "This artist"} is away and not taking orders right now.
              {profile.vacationMessage && ` “${profile.vacationMessage}”`}
            </span>
          </p>
        )}
        {profile.shopAnnouncement && (
          <p className="mt-6 flex gap-2 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">
            <Megaphone className="h-4 w-4 shrink-0 text-primary" />
            <span className="whitespace-pre-line">{profile.shopAnnouncement}</span>
          </p>
        )}
        <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div>
            {profile.bio && <p className="whitespace-pre-line text-foreground/90">{profile.bio}</p>}
          </div>
          <div className="space-y-4">
            {profile.specialties.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {profile.specialties.map((s) => (
                  <Badge key={s} variant="secondary">
                    {s}
                  </Badge>
                ))}
              </div>
            )}
            {links.length > 0 && (
              <div className="flex flex-wrap gap-3 text-sm">
                {links.map((l) => (
                  <a
                    key={l.label}
                    href={l.href!}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-1 text-muted-foreground hover:text-primary"
                  >
                    <l.icon className="h-4 w-4" />
                    {l.label}
                  </a>
                ))}
              </div>
            )}
            {profile.returnPolicy && (
              <div className="rounded-lg border border-border bg-card p-3 text-sm">
                <p className="font-medium">Return policy</p>
                <p className="mt-1 whitespace-pre-line text-muted-foreground">
                  {profile.returnPolicy}
                </p>
              </div>
            )}
            <ReportButton targetType="USER" targetId={profile.id} label="Report this member" />
          </div>
        </div>

        <h2 className="mt-12 font-display text-2xl font-semibold">
          Available works ({available.length})
        </h2>
        {available.length === 0 ? (
          <p className="mt-4 text-muted-foreground">
            No works for sale right now — try commissioning a piece.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {available.map((a) => (
              <ArtworkCard key={a.id} artwork={a} showArtist={false} />
            ))}
          </div>
        )}
        {sold.length > 0 && (
          <>
            <h2 className="mt-12 font-display text-2xl font-semibold">Sold ({sold.length})</h2>
            <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {sold.map((a) => (
                <ArtworkCard key={a.id} artwork={a} showArtist={false} />
              ))}
            </div>
          </>
        )}
        <div className="mt-16">
          <SellerReviews sellerId={profile.id} />
        </div>
        <div className="pb-16" />
      </div>
      <SiteFooter />
    </div>
  );
}
