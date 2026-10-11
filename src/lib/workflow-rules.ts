import { normalizeName, onlyDigits } from "./text";

export function validateRsvpGroupRules(
  input: { responsibleName: string; phone?: string; attending: boolean; companions: string[] },
  phoneRequired: boolean,
  maxCompanions: number,
) {
  const phone = onlyDigits(input.phone ?? "");
  if (phoneRequired && phone.length < 10) throw new Error("Informe um telefone/WhatsApp com DDD.");
  if (phone && (phone.length < 10 || phone.length > 13)) throw new Error("Telefone inválido. Use DDD + número.");
  const companions = input.attending ? input.companions : [];
  if (companions.length > maxCompanions) throw new Error(`Máximo de ${maxCompanions} acompanhantes por grupo.`);
  const names = [input.responsibleName, ...companions];
  const normalized = names.map(normalizeName);
  if (new Set(normalized).size !== normalized.length) throw new Error("Há nomes repetidos no grupo. Revise os acompanhantes.");
  return { phone: phone || null, names, normalized };
}

export function getCheckInTarget(undo: boolean, now = new Date().toISOString()) {
  return {
    update: undo ? { checked_in_at: null, checked_in_by: null } : { checked_in_at: now, checked_in_by: "" },
    action: undo ? "undo" as const : "check_in" as const,
  };
}

export function validateGalleryUpload(mimeType: string, size: number, maxImageMb: number, maxVideoMb: number) {
  const mime = mimeType.toLowerCase();
  const isImage = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(mime);
  const isVideo = ["video/mp4", "video/quicktime"].includes(mime);
  if (!isImage && !isVideo) throw new Error("Formato não aceito. Envie JPEG, PNG, WebP, HEIC, MP4 ou MOV.");
  const maxMb = isVideo ? maxVideoMb : maxImageMb;
  if (size > maxMb * 1024 * 1024) throw new Error(`Arquivo maior que ${maxMb} MB.`);
  if (size <= 0) throw new Error("Arquivo vazio ou inválido.");
  return { kind: isVideo ? "video" as const : "image" as const, mime, maxMb };
}
