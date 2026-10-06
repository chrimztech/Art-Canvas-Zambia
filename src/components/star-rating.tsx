import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Read-only stars; supports halves via a clipped overlay. */
export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`${value.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, value - (n - 1)));
        return (
          <span key={n} className="relative inline-block h-4 w-4">
            <Star className="absolute inset-0 h-4 w-4 text-muted-foreground/40" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="h-4 w-4 fill-primary text-primary" />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** Compact "★ 4.8 (12)" badge; renders nothing when there are no reviews. */
export function RatingBadge({
  average,
  count,
  className,
}: {
  average: number;
  count: number;
  className?: string;
}) {
  if (!count) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)}>
      <Star className="h-4 w-4 fill-primary text-primary" />
      <span className="font-medium">{average.toFixed(1)}</span>
      <span className="text-muted-foreground">({count})</span>
    </span>
  );
}

/** Clickable 1–5 star picker. */
export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onClick={() => onChange(n)}
          className="rounded p-0.5 transition hover:scale-110"
        >
          <Star
            className={cn(
              "h-6 w-6",
              n <= value ? "fill-primary text-primary" : "text-muted-foreground/50",
            )}
          />
        </button>
      ))}
    </div>
  );
}
