import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";
import { api, hasSession } from "@/lib/api-client";
import { errorMessage } from "@/lib/utils";

const FAVORITE_IDS_KEY = ["favorite-ids"];

/** The signed-in user's saved artwork ids, with an optimistic toggle. */
export function useFavorites() {
  const queryClient = useQueryClient();
  const signedIn = typeof window !== "undefined" && !!hasSession();

  const { data: ids = [] } = useQuery({
    queryKey: FAVORITE_IDS_KEY,
    queryFn: () => api.get<string[]>("/api/me/favorites/ids"),
    enabled: signedIn,
    staleTime: 60_000,
  });

  const toggle = useCallback(
    async (artworkId: string) => {
      if (!hasSession()) {
        toast.error("Sign in to save artworks to your favorites");
        return;
      }
      const saved = ids.includes(artworkId);
      queryClient.setQueryData<string[]>(FAVORITE_IDS_KEY, (current = []) =>
        saved ? current.filter((id) => id !== artworkId) : [artworkId, ...current],
      );
      try {
        if (saved) await api.del(`/api/me/favorites/${artworkId}`);
        else await api.put(`/api/me/favorites/${artworkId}`);
        queryClient.invalidateQueries({ queryKey: ["favorites"] });
        toast.success(saved ? "Removed from favorites" : "Saved to favorites");
      } catch (error) {
        queryClient.invalidateQueries({ queryKey: FAVORITE_IDS_KEY });
        toast.error(errorMessage(error, "Could not update favorites"));
      }
    },
    [ids, queryClient],
  );

  return { ids, isFavorite: (artworkId: string) => ids.includes(artworkId), toggle };
}
