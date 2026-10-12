import { describe, expect, it } from "vitest";
import { getCheckInTarget, validateGalleryUpload, validateRsvpGroupRules } from "@/lib/workflow-rules";

describe("RSVP confirmation", () => {
  it("normalizes phone and names", () => {
    const result = validateRsvpGroupRules({ responsibleName: "Maria Silva", phone: "(11) 99999-0000", attending: true, companions: ["João Silva"] }, true, 3);
    expect(result.phone).toBe("11999990000");
    expect(result.normalized).toEqual(["maria silva", "joao silva"]);
  });
  it("rejects duplicate names", () => {
    expect(() => validateRsvpGroupRules({ responsibleName: "João Silva", attending: true, companions: ["Joao Silva"] }, false, 3)).toThrow(/nomes repetidos/i);
  });
  it("requires phone and enforces companion limit", () => {
    expect(() => validateRsvpGroupRules({ responsibleName: "Maria Silva", attending: true, companions: [] }, true, 3)).toThrow(/telefone/i);
    expect(() => validateRsvpGroupRules({ responsibleName: "Maria Silva", attending: true, companions: ["Ana Silva", "Bia Silva"] }, false, 1)).toThrow(/Máximo/);
  });
  it("drops companions when declining", () => {
    expect(validateRsvpGroupRules({ responsibleName: "Maria Silva", attending: false, companions: ["Ana Silva"] }, false, 3).names).toEqual(["Maria Silva"]);
  });
});

describe("Portaria check-in", () => {
  it("sets timestamp and action", () => {
    expect(getCheckInTarget(false, "2026-10-11T15:00:00.000Z")).toEqual({ update: { checked_in_at: "2026-10-11T15:00:00.000Z", checked_in_by: "" }, action: "check_in" });
  });
  it("undoes a check-in", () => {
    expect(getCheckInTarget(true).update).toEqual({ checked_in_at: null, checked_in_by: null });
    expect(getCheckInTarget(true).action).toBe("undo");
  });
});

describe("Gallery uploads", () => {
  it("accepts images and videos", () => {
    expect(validateGalleryUpload("IMAGE/WEBP", 1024, 10, 100)).toMatchObject({ kind: "image", mime: "image/webp" });
    expect(validateGalleryUpload("video/quicktime", 1024, 10, 100).kind).toBe("video");
  });
  it("rejects unsupported formats and oversized files", () => {
    expect(() => validateGalleryUpload("application/pdf", 1024, 10, 100)).toThrow(/Formato não aceito/);
    expect(() => validateGalleryUpload("image/jpeg", 11 * 1024 * 1024, 10, 100)).toThrow(/maior que 10 MB/);
    expect(() => validateGalleryUpload("video/mp4", 101 * 1024 * 1024, 10, 100)).toThrow(/maior que 100 MB/);
  });
});

import { buildRsvpSnapshot } from "@/lib/workflow-rules";

describe("Assistente de confirmações", () => {
  const ev = { honoree: "Derci", event_date: "2026-10-12", event_time: "13:00", location: "Avenida Santa Marina, 1495" };
  const groups = [
    { responsible_name: "Maria Silva", attending: true, guests: [{ full_name: "Maria Silva", checked_in_at: "2026-10-12T16:00:00Z" }, { full_name: "João Silva", checked_in_at: null }] },
    { responsible_name: "Ana Souza", attending: false, guests: [{ full_name: "Ana Souza", checked_in_at: null }] },
    { responsible_name: "Pedro Lima", attending: null, guests: [{ full_name: "Pedro Lima", checked_in_at: null }] },
  ];
  it("counts confirmed, declined, pending and checked-in people", () => {
    expect(buildRsvpSnapshot(ev, groups).totals).toEqual({ groups: 3, confirmedPeople: 2, declinedPeople: 1, pendingPeople: 1, checkedInPeople: 1 });
  });
  it("never includes phones or notes", () => {
    const json = JSON.stringify(buildRsvpSnapshot(ev, [{ ...groups[0], phone: "11999990000", notes: "segredo" } as never]));
    expect(json).not.toContain("11999990000");
    expect(json).not.toContain("segredo");
  });
});
