import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cleanName, normalizeName } from "./text";
import { validateRsvpGroupRules } from "./workflow-rules";

const nameSchema = z
  .string()
  .transform(cleanName)
  .pipe(z.string().min(3, "Informe o nome completo.").max(120))
  .refine((v) => v.includes(" "), "Informe nome e sobrenome.");

const rsvpSchema = z.object({
  submissionId: z.string().uuid(),
  responsibleName: nameSchema,
  phone: z.string().max(30).optional().default(""),
  attending: z.boolean(),
  companions: z.array(nameSchema).max(30).default([]),
  notes: z.string().max(1000).optional().default(""),
});

export type PublicEvent = {
  honoree: string;
  eventDate: string;
  eventTime: string;
  weekdayLabel: string | null;
  location: string;
  mapsUrl: string | null;
  rsvpOpen: boolean;
  phoneRequired: boolean;
  maxCompanions: number;
  galleryEnabled: boolean;
  galleryAccess: "link" | "code" | "auth";
  uploadsEnabled: boolean;
  maxImageMb: number;
  maxVideoMb: number;
};

export const getPublicEvent = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicEvent> => {
    const { getEvent } = await import("./server/core.server");
    const e = await getEvent();
    return {
      honoree: e.honoree,
      eventDate: e.event_date,
      eventTime: e.event_time,
      weekdayLabel: e.weekday_label,
      location: e.location,
      mapsUrl: e.maps_url,
      rsvpOpen: e.rsvp_open,
      phoneRequired: e.phone_required,
      maxCompanions: e.max_companions,
      galleryEnabled: e.gallery_enabled,
      galleryAccess: e.gallery_access,
      uploadsEnabled: e.uploads_enabled,
      maxImageMb: e.max_image_mb,
      maxVideoMb: e.max_video_mb,
    };
  },
);

type RsvpInput = z.infer<typeof rsvpSchema>;

function validateGroup(input: RsvpInput, phoneRequired: boolean, maxCompanions: number) {
  return validateRsvpGroupRules(input, phoneRequired, maxCompanions);
}

async function findConflicts(normalized: string[], exceptGroupId?: string) {
  const { admin, getEvent } = await import("./server/core.server");
  const db = await admin();
  const ev = await getEvent();
  const { data } = await db
    .from("guests")
    .select("full_name, normalized_name, group_id, guest_groups!inner(event_id)")
    .in("normalized_name", normalized)
    .eq("guest_groups.event_id", ev.id);
  return (data ?? []).filter((g) => g.group_id !== exceptGroupId).map((g) => g.full_name);
}

export const submitRsvp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => rsvpSchema.parse(d))
  .handler(async ({ data }) => {
    const { admin, getEvent, randomToken, sha256 } = await import("./server/core.server");
    const db = await admin();
    const ev = await getEvent();
    if (!ev.rsvp_open) throw new Error("As confirmações estão encerradas. Fale com a organização.");

    // Idempotent resubmission (double tap / flaky network).
    const { data: prior } = await db
      .from("guest_groups")
      .select("id")
      .eq("submission_id", data.submissionId)
      .maybeSingle();
    if (prior) throw new Error("Esta confirmação já foi enviada. Use o link de edição recebido.");

    const { phone, names, normalized } = validateGroup(data, ev.phone_required, ev.max_companions);
    const conflicts = await findConflicts(normalized);
    if (conflicts.length)
      throw new Error(
        `Já existe confirmação para: ${conflicts.join(", ")}. Se precisar corrigir, use o seu link de edição ou fale com a organização.`,
      );

    const token = randomToken();
    const { data: group, error } = await db
      .from("guest_groups")
      .insert({
        event_id: ev.id,
        responsible_name: names[0]!,
        normalized_name: normalized[0]!,
        phone,
        attending: data.attending,
        notes: data.notes?.trim() || null,
        edit_token_hash: await sha256(token),
        submission_id: data.submissionId,
        source: "rsvp",
      })
      .select("id")
      .single();
    if (error || !group) {
      if (error?.code === "23505")
        throw new Error("Já existe uma confirmação com este nome de responsável.");
      throw new Error("Não foi possível salvar. Tente novamente.");
    }
    const { error: gErr } = await db.from("guests").insert(
      names.map((n, i) => ({
        group_id: group.id,
        full_name: n,
        normalized_name: normalized[i]!,
        is_responsible: i === 0,
        position: i,
      })),
    );
    if (gErr) {
      await db.from("guest_groups").delete().eq("id", group.id);
      throw new Error("Não foi possível salvar os nomes. Tente novamente.");
    }
    return { token, attending: data.attending, names };
  });

const tokenSchema = z.object({ token: z.string().min(20).max(100) });

async function groupByToken(token: string) {
  const { admin, sha256 } = await import("./server/core.server");
  const db = await admin();
  const { data } = await db
    .from("guest_groups")
    .select(
      "id, responsible_name, phone, attending, notes, guests(id, full_name, is_responsible, position, normalized_name, checked_in_at)",
    )
    .eq("edit_token_hash", await sha256(token))
    .maybeSingle();
  if (!data) throw new Error("Link de edição inválido ou expirado.");
  return data;
}

export const getRsvpByToken = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => tokenSchema.parse(d))
  .handler(async ({ data }) => {
    const g = await groupByToken(data.token);
    const guests = [...(g.guests ?? [])].sort((a, b) => a.position - b.position);
    return {
      responsibleName: g.responsible_name,
      phone: g.phone ?? "",
      attending: g.attending ?? true,
      notes: g.notes ?? "",
      companions: guests.filter((x) => !x.is_responsible).map((x) => x.full_name),
    };
  });

export const updateRsvpByToken = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    rsvpSchema.extend({ token: z.string().min(20).max(100) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { admin, getEvent } = await import("./server/core.server");
    const db = await admin();
    const ev = await getEvent();
    const g = await groupByToken(data.token);
    const { phone, names, normalized } = validateGroup(data, ev.phone_required, ev.max_companions);
    const conflicts = await findConflicts(normalized, g.id);
    if (conflicts.length)
      throw new Error(`Já existe confirmação em outro grupo para: ${conflicts.join(", ")}.`);
    await (
      await import("./server/rsvp-guest-sync.server")
    ).replaceGroupGuests(g.id, names, normalized);
    const { error } = await db
      .from("guest_groups")
      .update({
        responsible_name: names[0]!,
        normalized_name: normalized[0]!,
        phone,
        attending: data.attending,
        notes: data.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", g.id);
    if (error) throw new Error("Não foi possível atualizar. Tente novamente.");
    return { attending: data.attending, names };
  });

export const deleteRsvpByToken = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => tokenSchema.parse(d))
  .handler(async ({ data }) => {
    const { admin } = await import("./server/core.server");
    const g = await groupByToken(data.token);
    const db = await admin();
    await db.from("guest_groups").delete().eq("id", g.id);
    return { ok: true };
  });
