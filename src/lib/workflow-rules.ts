import { cleanName, normalizeName, onlyDigits } from "./text";

export function validateRsvpGroupRules(
  input: { responsibleName: string; phone?: string; attending: boolean; companions: string[] },
  phoneRequired: boolean,
  maxCompanions: number,
) {
  const phone = onlyDigits(input.phone ?? "");
  if (phoneRequired && phone.length < 10) throw new Error("Informe um telefone/WhatsApp com DDD.");
  if (phone && (phone.length < 10 || phone.length > 13))
    throw new Error("Telefone inválido. Use DDD + número.");
  const responsibleName = cleanName(input.responsibleName);
  const companions = input.attending ? input.companions.map(cleanName) : [];
  if (companions.length > maxCompanions)
    throw new Error(`Máximo de ${maxCompanions} acompanhantes por grupo.`);
  const names = [responsibleName, ...companions];
  const normalized = names.map(normalizeName);
  if (new Set(normalized).size !== normalized.length)
    throw new Error("Há nomes repetidos no grupo. Revise os acompanhantes.");
  return { phone: phone || null, names, normalized };
}

export function getCheckInTarget(undo: boolean, now = new Date().toISOString()) {
  return {
    update: undo
      ? { checked_in_at: null, checked_in_by: null }
      : { checked_in_at: now, checked_in_by: "" },
    action: undo ? ("undo" as const) : ("check_in" as const),
  };
}

export function validateGalleryUpload(
  mimeType: string,
  size: number,
  maxImageMb: number,
  maxVideoMb: number,
) {
  const mime = mimeType.toLowerCase();
  const isImage = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(
    mime,
  );
  const isVideo = ["video/mp4", "video/quicktime"].includes(mime);
  if (!isImage && !isVideo)
    throw new Error("Formato não aceito. Envie JPEG, PNG, WebP, HEIC, MP4 ou MOV.");
  const maxMb = isVideo ? maxVideoMb : maxImageMb;
  if (size > maxMb * 1024 * 1024) throw new Error(`Arquivo maior que ${maxMb} MB.`);
  if (size <= 0) throw new Error("Arquivo vazio ou inválido.");
  return { kind: isVideo ? ("video" as const) : ("image" as const), mime, maxMb };
}

type SnapshotGroup = { responsible_name: string; attending: boolean | null; guests?: { full_name: string; checked_in_at: string | null }[] | null };

/** Data sent to the staff assistant: names, status and check-in only (no phones or notes). */
export function buildRsvpSnapshot(
  ev: { honoree: string; event_date: string; event_time: string; location: string },
  groups: SnapshotGroup[],
) {
  const rows = groups.map((g) => ({
    responsible: g.responsible_name,
    status: g.attending === true ? "confirmado" : g.attending === false ? "não comparecerá" : "pendente",
    guests: (g.guests ?? []).map((x) => ({ name: x.full_name, checkedIn: Boolean(x.checked_in_at) })),
  }));
  const count = (s: string) => rows.filter((g) => g.status === s).reduce((n, g) => n + g.guests.length, 0);
  return {
    event: ev.honoree, eventDate: ev.event_date, eventTime: ev.event_time, location: ev.location,
    totals: {
      groups: rows.length,
      confirmedPeople: count("confirmado"),
      declinedPeople: count("não comparecerá"),
      pendingPeople: count("pendente"),
      checkedInPeople: rows.reduce((n, g) => n + g.guests.filter((x) => x.checkedIn).length, 0),
    },
    groups: rows,
  };
}
