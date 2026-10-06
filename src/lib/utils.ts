import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats a Kwacha amount the way the site displays prices, e.g. "K1,250". */
export function formatZmw(value: number | string | null | undefined) {
  return `K${Number(value ?? 0).toLocaleString()}`;
}

/** Best-effort message from an unknown thrown value (api-client throws Error with the server message). */
export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
