/** Keep guest rows with unchanged names so existing check-ins remain attached. */
export async function replaceGroupGuests(groupId: string, names: string[], normalized: string[]) {
  const { admin } = await import("./core.server");
  const db = await admin();
  const { data: existing } = await db
    .from("guests")
    .select("id, normalized_name")
    .eq("group_id", groupId);
  const keep = new Map((existing ?? []).map((guest) => [guest.normalized_name, guest.id]));
  const toDelete = (existing ?? [])
    .filter((guest) => !normalized.includes(guest.normalized_name))
    .map((guest) => guest.id);
  if (toDelete.length) {
    const { error } = await db.from("guests").delete().in("id", toDelete);
    if (error) throw new Error("Não foi possível atualizar os acompanhantes.");
  }

  for (let i = 0; i < names.length; i++) {
    const id = keep.get(normalized[i]!);
    if (id) {
      const { error } = await db
        .from("guests")
        .update({ full_name: names[i]!, is_responsible: i === 0, position: i })
        .eq("id", id);
      if (error) throw new Error("Não foi possível atualizar os acompanhantes.");
    } else {
      const { error } = await db.from("guests").insert({
        group_id: groupId,
        full_name: names[i]!,
        normalized_name: normalized[i]!,
        is_responsible: i === 0,
        position: i,
      });
      if (error) throw new Error("Não foi possível salvar os nomes.");
    }
  }
}
