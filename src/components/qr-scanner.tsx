import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DetectedCode = { rawValue: string };
type BarcodeDetectorLike = { detect: (source: HTMLVideoElement) => Promise<DetectedCode[]> };
type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike;

/**
 * Reads QR codes with the device camera (browsers with the BarcodeDetector API: Chrome/Edge on
 * Android, desktop Chrome) and always offers manual entry of the code printed under the QR.
 * Calls `onCode` once per distinct code; a code is ignored for 4 seconds after it's read.
 */
export function QrScanner({ onCode }: { onCode: (code: string) => Promise<void> | void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const recent = useRef(new Map<string, number>());

  useEffect(() => {
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
      .BarcodeDetector;
    if (!Detector) {
      setError("This browser can't scan with the camera — type the ticket code instead.");
      return;
    }
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const detector = new Detector({ formats: ["qr_code"] });

    async function tick() {
      if (stopped || !video.current) return;
      try {
        const codes = await detector.detect(video.current);
        for (const { rawValue } of codes) {
          const seen = recent.current.get(rawValue);
          if (seen && Date.now() - seen < 4000) continue;
          recent.current.set(rawValue, Date.now());
          await onCode(rawValue);
        }
      } catch {
        // frame not ready yet
      }
      timer = setTimeout(tick, 300);
    }

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        stream = s;
        if (stopped || !video.current) return;
        video.current.srcObject = s;
        void video.current.play();
        void tick();
      })
      .catch(() => setError("Camera unavailable — allow camera access or type the ticket code."));

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onCode]);

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          {error}
        </p>
      ) : (
        <video
          ref={video}
          muted
          playsInline
          className="aspect-square w-full max-w-sm rounded-lg bg-black object-cover"
        />
      )}
      <form
        className="flex max-w-sm gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!manual.trim()) return;
          await onCode(manual.trim());
          setManual("");
        }}
      >
        <Input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Ticket code"
          className="font-mono"
          aria-label="Ticket code"
        />
        <Button type="submit" variant="outline">
          Check in
        </Button>
      </form>
    </div>
  );
}
