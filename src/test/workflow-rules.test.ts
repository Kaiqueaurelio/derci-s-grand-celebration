import { describe, expect, it } from "vitest";
import {
  buildRsvpSnapshot,
  getCheckInTarget,
  validateGalleryUpload,
  validateRsvpGroupRules,
} from "@/lib/workflow-rules";

describe("Fluxo de confirmação de presença", () => {
  it("normaliza telefone e nomes mantendo os nomes exibidos", () => {
    const result = validateRsvpGroupRules(
      { responsibleName: "Maria Silva", phone: "(11) 99999-0000", attending: true, companions: ["João Silva"] },
      true,
      3,
    );
    expect(result.phone).toBe("11999990000");
    expect(result.names).toEqual(["Maria Silva", "João Silva"]);
    expect(result.normalized).toEqual(["maria silva", "joao silva"]);
  });

  it("rejeita nomes duplicados mesmo com diferenças de acento", () => {
    expect(() =>
      validateRsvpGroupRules(
        { responsibleName: "João Silva", attending: true, companions: ["Joao Silva"] },
        false,
        3,
      ),
    ).toThrow(/nomes repetidos/i);
  });

  it("exige telefone quando configurado e valida número informado", () => {
    expect(() =>
      validateRsvpGroupRules({ responsibleName: "Maria Silva", attending: true, companions: [] }, true, 3),
    ).toThrow(/telefone/i);
    expect(() =>
      validateRsvpGroupRules(
        { responsibleName: "Maria Silva", phone: "123", attending: true, companions: [] },
        false,
        3,
      ),
    ).toThrow(/Telefone inválido/i);
  });

  it("impede exceder o limite de acompanhantes", () => {
    expect(() =>
      validateRsvpGroupRules(
        { responsibleName: "Maria Silva", attending: true, companions: ["Ana Silva", "Bia Silva"] },
        false,
        1,
      ),
    ).toThrow(/Máximo/);
  });

  it("não inclui acompanhantes quando o responsável não comparecerá", () => {
    expect(
      validateRsvpGroupRules(
        { responsibleName: "Maria Silva", attending: false, companions: ["Ana Silva"] },
        false,
        3,
      ).names,
    ).toEqual(["Maria Silva"]);
  });

  it("aceita grupo sem acompanhantes quando o limite é zero", () => {
    expect(
      validateRsvpGroupRules(
        { responsibleName: "Maria Silva", attending: true, companions: [] },
        false,
        0,
      ).names,
    ).toEqual(["Maria Silva"]);
  });
});

describe("Fluxo de controle da portaria", () => {
  it("registra entrada com timestamp e ação de check-in", () => {
    expect(getCheckInTarget(false, "2026-10-11T15:00:00.000Z")).toEqual({
      update: { checked_in_at: "2026-10-11T15:00:00.000Z", checked_in_by: "" },
      action: "check_in",
    });
  });

  it("desfaz a entrada limpando timestamp e responsável", () => {
    expect(getCheckInTarget(true)).toEqual({
      update: { checked_in_at: null, checked_in_by: null },
      action: "undo",
    });
  });
});

describe("Fluxo de envio para a galeria", () => {
  it.each([
    ["image/jpeg", "image"],
    ["image/png", "image"],
    ["image/webp", "image"],
    ["image/heic", "image"],
    ["image/heif", "image"],
    ["video/mp4", "video"],
    ["video/quicktime", "video"],
  ] as const)("aceita %s como %s", (mime, kind) => {
    expect(validateGalleryUpload(mime, 1024, 10, 100)).toMatchObject({ kind, mime });
  });

  it("aceita arquivo exatamente no limite configurado", () => {
    expect(validateGalleryUpload("image/jpeg", 10 * 1024 * 1024, 10, 100).kind).toBe("image");
    expect(validateGalleryUpload("video/mp4", 100 * 1024 * 1024, 10, 100).kind).toBe("video");
  });

  it("rejeita formato não permitido, arquivo vazio e arquivo acima do limite", () => {
    expect(() => validateGalleryUpload("application/pdf", 1024, 10, 100)).toThrow(/Formato não aceito/);
    expect(() => validateGalleryUpload("image/jpeg", 0, 10, 100)).toThrow(/vazio ou inválido/i);
    expect(() => validateGalleryUpload("image/jpeg", 11 * 1024 * 1024, 10, 100)).toThrow(/maior que 10 MB/);
    expect(() => validateGalleryUpload("video/mp4", 101 * 1024 * 1024, 10, 100)).toThrow(/maior que 100 MB/);
  });

  it("não confunde imagens com vídeos pelo tipo MIME", () => {
    expect(validateGalleryUpload("video/quicktime", 100, 10, 100).kind).toBe("video");
    expect(validateGalleryUpload("image/heif", 100, 10, 100).kind).toBe("image");
  });
});

describe("Snapshot atualizado para o assistente de confirmações", () => {
  const event = {
    honoree: "Derci",
    event_date: "2026-10-12",
    event_time: "13:00",
    location: "Avenida Santa Marina, 1495",
  };
  const groups = [
    {
      responsible_name: "Maria Silva",
      attending: true,
      guests: [
        { full_name: "Maria Silva", checked_in_at: "2026-10-12T16:00:00Z" },
        { full_name: "João Silva", checked_in_at: null },
      ],
    },
    { responsible_name: "Ana Souza", attending: false, guests: [{ full_name: "Ana Souza", checked_in_at: null }] },
    { responsible_name: "Pedro Lima", attending: null, guests: [{ full_name: "Pedro Lima", checked_in_at: null }] },
  ];

  it("conta corretamente grupos, pessoas confirmadas, recusas, pendências e entradas", () => {
    expect(buildRsvpSnapshot(event, groups).totals).toEqual({
      groups: 3,
      confirmedPeople: 2,
      declinedPeople: 1,
      pendingPeople: 1,
      checkedInPeople: 1,
    });
  });

  it("inclui nomes e estado individual de check-in para responder perguntas da equipe", () => {
    const snapshot = buildRsvpSnapshot(event, groups);
    expect(snapshot.groups[0]).toEqual({
      responsible: "Maria Silva",
      status: "confirmado",
      guests: [
        { name: "Maria Silva", checkedIn: true },
        { name: "João Silva", checkedIn: false },
      ],
    });
  });

  it("não envia telefone nem observações privadas ao modelo", () => {
    const snapshot = buildRsvpSnapshot(event, [{ ...groups[0], phone: "11999990000", notes: "anotação confidencial" } as never]);
    const json = JSON.stringify(snapshot);
    expect(json).not.toContain("11999990000");
    expect(json).not.toContain("anotação confidencial");
  });
});
