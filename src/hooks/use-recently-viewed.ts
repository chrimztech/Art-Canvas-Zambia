import { useEffect, useState } from "react";
import type { ArtworkSummary } from "@/lib/types";

const KEY = "acz_recently_viewed";
const MAX = 12;

function read(): ArtworkSummary[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ArtworkSummary[]) : [];
  } catch {
    return [];
  }
}

/** Remembers an artwork as recently viewed (this browser only). */
export function rememberViewed(artwork: ArtworkSummary) {
  try {
    const list = [artwork, ...read().filter((a) => a.id !== artwork.id)].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // storage unavailable (private mode): nothing to remember
  }
}

/** Recently viewed artworks, newest first, excluding `exceptId`. Empty during SSR and the first render. */
export function useRecentlyViewed(exceptId?: string) {
  const [items, setItems] = useState<ArtworkSummary[]>([]);
  useEffect(() => {
    setItems(read().filter((a) => a.id !== exceptId));
  }, [exceptId]);
  return items;
}
