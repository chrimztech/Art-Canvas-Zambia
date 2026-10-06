import { useState } from "react";
import { Sofa } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

/** Reads "60 x 90 cm" / "24 × 36 in" style dimensions as width × height in centimetres. */
function parseDimensionsCm(dimensions: string | null | undefined) {
  if (!dimensions) return null;
  const m = dimensions.match(
    /(\d+(?:[.,]\d+)?)\s*(?:cm|in|")?\s*[x×X]\s*(\d+(?:[.,]\d+)?)\s*(cm|in|")?/,
  );
  if (!m) return null;
  const factor = /in|"/.test(m[3] ?? dimensions) ? 2.54 : 1;
  const w = parseFloat(m[1].replace(",", ".")) * factor;
  const h = parseFloat(m[2].replace(",", ".")) * factor;
  return w > 0 && h > 0 ? { w, h } : null;
}

const WALLS = [
  { id: "living", label: "Living room", wall: "#d9d2c5", floor: "#8b6b4a", furniture: "sofa" },
  { id: "office", label: "Office", wall: "#c9d0d6", floor: "#5b5e63", furniture: "desk" },
  { id: "gallery", label: "Gallery", wall: "#f4f2ee", floor: "#b9b3aa", furniture: "bench" },
] as const;

/**
 * A 2D "see it on a wall" preview: the artwork drawn to scale above a 2 m sofa (or desk/bench),
 * so buyers can judge size before buying. Scale comes from the listed dimensions when available.
 */
export function ViewOnWall({
  imageUrl,
  dimensions,
  title,
}: {
  imageUrl: string;
  dimensions: string | null;
  title: string;
}) {
  const parsed = parseDimensionsCm(dimensions);
  const [open, setOpen] = useState(false);
  const [room, setRoom] = useState<(typeof WALLS)[number]["id"]>("living");
  const [size, setSize] = useState(parsed ? 100 : 60); // % of true size (or of a default 60 cm width)
  const wall = WALLS.find((w) => w.id === room)!;
  // Scene is 400 cm wide; the furniture is 200 cm wide and 85 cm tall.
  const scale = (parsed ? 1 : 0.6) * (size / 100);
  const widthCm = (parsed?.w ?? 100) * scale;
  const heightCm = parsed ? parsed.h * scale : undefined;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Sofa className="h-4 w-4" /> View on a wall
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{title} — on a wall</DialogTitle>
            <DialogDescription>
              {parsed
                ? `Shown to scale (${Math.round(parsed.w)} × ${Math.round(parsed.h)} cm) above a 2 m sofa.`
                : "The artist hasn't listed exact dimensions, so this is an approximate preview — adjust the size."}
            </DialogDescription>
          </DialogHeader>
          <div
            className="relative aspect-[16/9] w-full overflow-hidden rounded-lg"
            style={{ background: wall.wall }}
          >
            <div
              className="absolute inset-x-0 bottom-0 h-[14%]"
              style={{ background: wall.floor }}
            />
            <img
              src={imageUrl}
              alt={title}
              className="absolute left-1/2 -translate-x-1/2 object-contain shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
              style={{
                width: `${(widthCm / 400) * 100}%`,
                ...(heightCm ? { height: `${(heightCm / 225) * 100}%` } : {}),
                bottom: "52%",
                maxHeight: "46%",
              }}
            />
            <Furniture kind={wall.furniture} />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-1">
              {WALLS.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setRoom(w.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs",
                    room === w.id ? "border-primary bg-accent" : "border-border",
                  )}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <div className="flex min-w-48 flex-1 items-center gap-3 text-xs text-muted-foreground">
              Size
              <Slider
                value={[size]}
                min={30}
                max={parsed ? 150 : 200}
                step={5}
                onValueChange={([v]) => setSize(v)}
                aria-label="Preview size"
              />
              {parsed && <span className="w-10">{size}%</span>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Furniture({ kind }: { kind: string }) {
  // 200 cm wide (50% of the 400 cm scene), sitting on the floor line.
  if (kind === "desk") {
    return (
      <div className="absolute bottom-[14%] left-1/4 h-[33%] w-1/2">
        <div className="h-[12%] w-full rounded-sm bg-[#3f3a35]" />
        <div className="absolute bottom-0 left-[4%] h-[88%] w-[3%] bg-[#3f3a35]" />
        <div className="absolute bottom-0 right-[4%] h-[88%] w-[3%] bg-[#3f3a35]" />
      </div>
    );
  }
  if (kind === "bench") {
    return (
      <div className="absolute bottom-[14%] left-[30%] h-[20%] w-[40%]">
        <div className="h-[25%] w-full rounded-sm bg-[#6b5640]" />
        <div className="absolute bottom-0 left-[6%] h-[75%] w-[4%] bg-[#4a3b2c]" />
        <div className="absolute bottom-0 right-[6%] h-[75%] w-[4%] bg-[#4a3b2c]" />
      </div>
    );
  }
  return (
    <div className="absolute bottom-[14%] left-1/4 h-[38%] w-1/2">
      <div className="absolute inset-x-0 top-0 h-[55%] rounded-t-2xl bg-[#56606b]" />
      <div className="absolute inset-x-[-3%] bottom-[12%] h-[45%] rounded-xl bg-[#4a535d]" />
      <div className="absolute bottom-0 left-[3%] h-[12%] w-[3%] bg-[#2b2f33]" />
      <div className="absolute bottom-0 right-[3%] h-[12%] w-[3%] bg-[#2b2f33]" />
    </div>
  );
}
