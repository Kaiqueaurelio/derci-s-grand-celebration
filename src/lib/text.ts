// Shared, browser-safe text helpers.

/** Lowercase, strip accents and collapse spaces so "Maria  Sílva" == "maria silva". */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

export function onlyDigits(v: string): string {
  return v.replace(/\D/g, "");
}

export function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
export const VIDEO_TYPES = ["video/mp4", "video/quicktime"];

export function guessMime(name: string, type: string): string {
  if (type) return type.toLowerCase();
  const ext = name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
    mp4: "video/mp4",
    mov: "video/quicktime",
  };
  return (ext && map[ext]) || "";
}
