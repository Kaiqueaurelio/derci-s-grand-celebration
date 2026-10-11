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
  .inputValidator((d: unknown) => z.object({ q: z.string().max(80), onlyCheckedIn: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }): Promise<DoorGroup[]> => {
    const { assertRole, admin, getEvent } = await S();
    await assertRole(context.supabase, context.userId, ["admin", "door"]);
    const db = await admin();
    const ev = await getEvent();
    let groupIds: string[] = [];
    if (data.onlyCheckedIn) {
      const { data: g } = await db.from("guests").select("group_id").not("checked_in_at", "is", null).limit(500);
      groupIds = [...new Set((g ?? []).map((x) => x.group_id))];
    } else {
      const q = normalizeName(data.q);
      if (q.length < 2) return [];
      const terms = q.split(" ").filter(Boolean).slice(0, 4);
      let query = db.from("guests").select("group_id");
      for (const t of terms) query = query.ilike("normalized_name", `%${t}%`);
      const { data: g } = await query.limit(100);
      groupIds = [...new Set((g ?? []).map((x) => x.group_id))];
    }
    if (!groupIds.length) return [];
    const { data: groups } = await db
      .from("guest_groups")
      .select("id, responsible_name, attending, guests(id, full_name, is_responsible, position, checked_in_at)")
      .in("id", groupIds.slice(0, 60))
      .eq("event_id", ev.id)
      .order("responsible_name");
    return (groups ?? []).map((g) => ({
      id: g.id,
      responsibleName: g.responsible_name,
      attending: g.attending,
      guests: [...g.guests]
        .sort((a, b) => a.position - b.position)
        .map((x) => ({ id: x.id, fullName: x.full_name, isResponsible: x.is_responsible, checkedInAt: x.checked_in_at })),
    }));
  });

export const doorCheckIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ guestId: z.string().uuid(), undo: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { assertRole, admin } = await S();
    await assertRole(context.supabase, context.userId, ["admin", "door"]);
    const db = await admin();
    const email = (context.claims as { email?: string }).email ?? null;
    const target = getCheckInTarget(Boolean(data.undo));
    const update = data.undo ? target.update : { ...target.update, checked_in_by: context.userId };
    // Conditional update makes check-in idempotent even with two devices at the door.
    const q = data.undo
      ? db.from("guests").update(update).eq("id", data.guestId).not("checked_in_at", "is", null)
      : db.from("guests").update(update).eq("id", data.guestId).is("checked_in_at", null);
    const { data: rows, error } = await q.select("id, checked_in_at");
    if (error) throw new Error("Não foi possível registrar. Tente de novo.");
    if (!rows?.length) {
      const { data: cur } = await db.from("guests").select("checked_in_at").eq("id", data.guestId).maybeSingle();
      if (!cur) throw new Error("Convidado não encontrado.");
      return { changed: false, checkedInAt: cur.checked_in_at };
    }
    await db.from("check_in_logs").insert({
      guest_id: data.guestId,
      action: target.action,
      performed_by: context.userId,
      performed_by_email: email,
    });
    return { changed: true, checkedInAt: rows[0].checked_in_at };
  });
