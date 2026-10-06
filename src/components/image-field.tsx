import { useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import type { UploadResponse } from "@/lib/types";
import { errorMessage } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

async function uploadFile(file: File) {
  return (await api.upload<UploadResponse>("/api/uploads", file)).url;
}

/** Single image picker that uploads immediately and reports the hosted URL. */
export function ImageField({
  value,
  onChange,
  label = "Cover image",
  aspect = "aspect-video",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  aspect?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadFile(file));
    } catch (e) {
      toast.error(errorMessage(e, "Upload failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="text-sm font-medium">{label}</span>
      <label
        className={`relative mt-1 flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/40 hover:border-primary ${aspect}`}
      >
        {value ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
            <ImagePlus className="h-6 w-6" />
            Click to upload (JPG, PNG, WEBP)
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="h-6 w-6 animate-spin" />
          </span>
        )}
        <input
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => {
            void pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {value && (
        <p className="mt-1 text-xs text-muted-foreground">Click the image to replace it.</p>
      )}
    </div>
  );
}

/** Multi-image gallery picker (additional photos beyond the cover). */
export function GalleryField({
  value,
  onChange,
  max = 6,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}) {
  const [busy, setBusy] = useState(false);

  async function pick(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const urls = await Promise.all(
        Array.from(files)
          .slice(0, max - value.length)
          .map(uploadFile),
      );
      onChange([...value, ...urls]);
    } catch (e) {
      toast.error(errorMessage(e, "Upload failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="text-sm font-medium">
        More photos{" "}
        <span className="font-normal text-muted-foreground">
          (details, back, in a room — up to {max})
        </span>
      </span>
      <div className="mt-1 flex flex-wrap gap-2">
        {value.map((url, i) => (
          <div
            key={`${i}-${url}`}
            className="relative h-24 w-24 overflow-hidden rounded-md border border-border"
          >
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="absolute right-1 top-1 rounded-full bg-background/90 p-0.5"
              aria-label="Remove photo"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:border-primary">
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
            Add
            <input
              type="file"
              accept={ACCEPT}
              multiple
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                void pick(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}
