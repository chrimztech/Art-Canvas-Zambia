import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { ArtistDetail } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Globe, Instagram } from "lucide-react";

export const Route = createFileRoute("/artists/$id")({
  head: () => ({ meta: [{ title: "Artist — ChrisEpic Arts" }] }),
  component: ArtistProfile,
});

function ArtistProfile() {
  const { id } = Route.useParams();
  const [profile, setProfile] = useState<ArtistDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get<ArtistDetail>(`/api/artists/${id}`)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen bg-background"><SiteHeader /><div className="p-10 text-muted-foreground">Loading…</div></div>;
  if (!profile) return <div className="min-h-screen bg-background"><SiteHeader /><div className="p-10">Artist not found. <Link to="/artists" className="text-primary hover:underline">Back</Link></div></div>;

  const initials = (profile.displayName ?? "A").slice(0, 2).toUpperCase();
  const artworks = profile.artworks;
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <Avatar className="h-24 w-24"><AvatarImage src={profile.avatarUrl ?? undefined} /><AvatarFallback className="text-xl">{initials}</AvatarFallback></Avatar>
          <div className="text-center sm:text-left">
            <h1 className="font-display text-3xl font-semibold">{profile.displayName ?? "Unnamed artist"}</h1>
            <div className="mt-2 flex flex-wrap justify-center gap-3 text-sm text-muted-foreground sm:justify-start">
              {profile.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{profile.location}</span>}
              {profile.website && <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary"><Globe className="h-4 w-4" />Website</a>}
              {profile.instagram && <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary"><Instagram className="h-4 w-4" />{profile.instagram}</a>}
            </div>
            {profile.bio && <p className="mt-4 max-w-2xl text-foreground/90">{profile.bio}</p>}
          </div>
        </div>

        <h2 className="mt-12 font-display text-2xl font-semibold">Works ({artworks.length})</h2>
        {artworks.length === 0 ? (
          <p className="mt-4 text-muted-foreground">No published works yet.</p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {artworks.map((a) => (
              <Link key={a.id} to="/artworks/$slug" params={{ slug: a.slug }} className="group">
                <div className="aspect-square overflow-hidden rounded-xl bg-muted">
                  {a.coverImageUrl && <img src={a.coverImageUrl} alt={a.title} className="h-full w-full object-cover transition group-hover:scale-105" />}
                </div>
                <p className="mt-2 font-medium group-hover:text-primary">{a.title}</p>
                <p className="text-sm text-muted-foreground">K{Number(a.priceZmw).toLocaleString()}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
