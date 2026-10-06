// robots.txt and sitemap.xml, generated on request from the live catalogue so search engines can
// discover every public artwork, artist, class, exhibition, supply and collection.

const API_BASE = process.env.VITE_API_URL || "http://localhost:8090";

const STATIC_PATHS = [
  "/",
  "/browse",
  "/artists",
  "/exhibitions",
  "/classes",
  "/supplies",
  "/commissions",
  "/collections",
  "/gift-cards",
  "/sell",
  "/about",
  "/contact",
  "/help",
  "/terms",
  "/privacy",
];

type Listed = { slug?: string; id?: string; createdAt?: string };

async function list(path: string): Promise<Listed[]> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { headers: { Accept: "application/json" } });
    return res.ok ? ((await res.json()) as Listed[]) : [];
  } catch {
    return [];
  }
}

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function robotsTxt(origin: string) {
  return new Response(
    [
      "User-agent: *",
      "Allow: /",
      "Disallow: /admin",
      "Disallow: /dashboard",
      "Disallow: /orders",
      "Disallow: /messages",
      "Disallow: /cart",
      "Disallow: /sales",
      "Disallow: /notifications",
      "",
      `Sitemap: ${origin}/sitemap.xml`,
      "",
    ].join("\n"),
    {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    },
  );
}

export async function sitemapXml(origin: string) {
  const [artworks, artists, classes, exhibitions, supplies, collections] = await Promise.all([
    list("/api/artworks"),
    list("/api/artists"),
    list("/api/classes"),
    list("/api/exhibitions"),
    list("/api/supplies"),
    list("/api/collections"),
  ]);
  const urls: { loc: string; lastmod?: string }[] = [
    ...STATIC_PATHS.map((p) => ({ loc: p })),
    ...artworks
      .filter((a) => a.slug)
      .map((a) => ({ loc: `/artworks/${a.slug}`, lastmod: a.createdAt })),
    ...artists.filter((a) => a.id).map((a) => ({ loc: `/artists/${a.id}` })),
    ...classes.filter((c) => c.slug).map((c) => ({ loc: `/classes/${c.slug}` })),
    ...exhibitions.filter((e) => e.slug).map((e) => ({ loc: `/exhibitions/${e.slug}` })),
    ...supplies.filter((s) => s.slug).map((s) => ({ loc: `/supplies/${s.slug}` })),
    ...collections.filter((c) => c.slug).map((c) => ({ loc: `/collections/${c.slug}` })),
  ];
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      (u) =>
        `  <url><loc>${escapeXml(origin + u.loc)}</loc>${
          u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ""
        }</url>`,
    ),
    "</urlset>",
    "",
  ].join("\n");
  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
