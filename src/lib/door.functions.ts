import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { normalizeName } from "./text";
import { getCheckInTarget } from "./workflow-rules";

const S = () => import("./server/core.server");

export type DoorGroup = {
  id: string;
  responsibleName: string;
  attending: boolean | null;
  guests: { id: string; fullName: string; isResponsible: boolean; checkedInAt: string | null }[];
};

/** Door staff see only names, status and check-in — never phones or notes. */
export const doorSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ q: z.string().max(80), onlyCheckedIn: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<DoorGroup[]> => {
    const { assertRole, admin, getEvent } = await S();
    await assertRole(context.supabase, context.userId, ["admin", "door"]);
    const db = await admin();
    const ev = await getEvent();
    let groupIds: string[] = [];
    if (data.onlyCheckedIn) {
      const { data: g, error } = await db
        .from("guests")
        .select("group_id")
        .not("checked_in_at", "is", null)
        .limit(500);
      if (error) throw new Error("Não foi possível pesquisar a portaria. Tente novamente.");
      groupIds = [...new Set((g ?? []).map((x) => x.group_id))];
    } else {
      const q = normalizeName(data.q);
      if (q.length < 2) return [];
      const terms = q.split(" ").filter(Boolean).slice(0, 4);
      let query = db.from("guests").select("group_id");
      for (const t of terms) query = query.ilike("normalized_name", `%${t}%`);
      const { data: g, error } = await query.limit(100);
      if (error) throw new Error("Não foi possível pesquisar a portaria. Tente novamente.");
      groupIds = [...new Set((g ?? []).map((x) => x.group_id))];
    }
    if (!groupIds.length) return [];
    const { data: groups, error } = await db
      .from("guest_groups")
      .select(
        "id, responsible_name, attending, guests(id, full_name, is_responsible, position, checked_in_at)",
      )
      .in("id", groupIds.slice(0, 60))
      .eq("event_id", ev.id)
      .order("responsible_name");
    if (error) throw new Error("Não foi possível carregar os convidados. Tente novamente.");
    return (groups ?? []).map((g) => ({
      id: g.id,
      responsibleName: g.responsible_name,
      attending: g.attending,
      guests: [...g.guests]
        .sort((a, b) => a.position - b.position)
        .map((x) => ({
          id: x.id,
          fullName: x.full_name,
          isResponsible: x.is_responsible,
          checkedInAt: x.checked_in_at,
        })),
    }));
  });

export const doorCheckIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ guestId: z.string().uuid(), undo: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { assertRole, admin, getEvent } = await S();
    await assertRole(context.supabase, context.userId, ["admin", "door"]);
    const db = await admin();
    const ev = await getEvent();
    const { data: guest, error: guestError } = await db
      .from("guests")
      .select("id, group_id, guest_groups!inner(event_id)")
      .eq("id", data.guestId)
      .eq("guest_groups.event_id", ev.id)
      .maybeSingle();
    if (guestError) throw new Error("Não foi possível localizar o convidado. Tente novamente.");
    if (!guest) throw new Error("Convidado não encontrado neste evento.");
    const email = (context.claims as { email?: string }).email ?? null;
    const target = getCheckInTarget(Boolean(data.undo));
    const update = data.undo ? target.update : { ...target.update, checked_in_by: context.userId };
    // Conditional update makes check-in idempotent even with two devices at the door.
    const q = data.undo
      ? db
          .from("guests")
          .update(update)
          .eq("id", data.guestId)
          .eq("group_id", guest.group_id)
          .not("checked_in_at", "is", null)
      : db
          .from("guests")
          .update(update)
          .eq("id", data.guestId)
          .eq("group_id", guest.group_id)
          .is("checked_in_at", null);
    const { data: rows, error } = await q.select("id, checked_in_at");
    if (error) throw new Error("Não foi possível registrar. Tente de novo.");
    if (!rows?.length) {
      const { data: cur, error: currentError } = await db
        .from("guests")
        .select("checked_in_at")
        .eq("id", data.guestId)
        .eq("group_id", guest.group_id)
        .maybeSingle();
      if (currentError)
        throw new Error("Não foi possível confirmar o estado da entrada. Tente novamente.");
      if (!cur) throw new Error("Convidado não encontrado.");
      return { changed: false, checkedInAt: cur.checked_in_at };
    }
    const { error: logError } = await db.from("check_in_logs").insert({
      guest_id: data.guestId,
      action: target.action,
      performed_by: context.userId,
      performed_by_email: email,
    });
    if (logError) console.error("Check-in saved but audit log insert failed", logError);
    return { changed: true, checkedInAt: rows[0]?.checked_in_at ?? null };
  });
