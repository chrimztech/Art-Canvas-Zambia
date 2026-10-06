/** ISO timestamp -> value for an <input type="datetime-local"> in the viewer's timezone. */
export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Comma-separated text <-> string[] for simple tag inputs. */
export const splitTags = (s: string) =>
  s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
