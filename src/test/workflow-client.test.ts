import { describe, expect, it, vi } from "vitest";
import { checkInFlow, submitRsvpFlow, uploadGalleryFiles } from "@/lib/workflow-client";
import { userErrorMessage } from "@/lib/user-error";

describe("RSVP submission flow", () => {
  it("sends the payload and returns the edit token for a completed confirmation", async () => {
    const submit = vi.fn(async (input: { responsibleName: string }) => ({
      token: "edit-token",
      attending: true,
      names: [input.responsibleName, "João Silva"],
    }));
    const payload = {
      submissionId: "submission-id",
      responsibleName: "Ana Silva",
      phone: "11999990000",
      attending: true,
      companions: ["João Silva"],
      notes: "",
    };

    await expect(submitRsvpFlow(payload, submit)).resolves.toMatchObject({ token: "edit-token" });
    expect(submit).toHaveBeenCalledWith(payload);
  });

  it("surfaces server errors and rejects an incomplete success response", async () => {
    await expect(
      submitRsvpFlow({} as never, async () => {
        throw new Error("Nome duplicado");
      }),
    ).rejects.toThrow("Nome duplicado");
    await expect(
      submitRsvpFlow({} as never, async () => ({ token: "", attending: true, names: [] })),
    ).rejects.toThrow("Confirmação incompleta");
  });
});

describe("Door check-in flow", () => {
  it("records and then reloads guests to display the latest check-in state", async () => {
    const update = vi.fn().mockResolvedValue({ changed: true });
    const guests = [
      {
        id: "group",
        responsibleName: "Ana Silva",
        attending: true,
        guests: [
          {
            id: "guest",
            fullName: "Ana Silva",
            isResponsible: true,
            checkedInAt: "2026-10-11T15:00:00Z",
          },
        ],
      },
    ];
    const reload = vi.fn().mockResolvedValue(guests);

    await expect(checkInFlow("guest", false, update, reload)).resolves.toEqual(guests);
    expect(update).toHaveBeenCalledWith({ guestId: "guest", undo: false });
    expect(reload).toHaveBeenCalledOnce();
  });

  it("does not reload the list if check-in fails", async () => {
    const reload = vi.fn();
    await expect(
      checkInFlow(
        "guest",
        false,
        async () => {
          throw new Error("Acesso não autorizado");
        },
        reload,
      ),
    ).rejects.toThrow("Acesso não autorizado");
    expect(reload).not.toHaveBeenCalled();
  });
});

describe("Gallery upload flow", () => {
  const makeFile = (name: string) => new File(["image"], name, { type: "image/jpeg" });
  const options = {
    createId: vi.fn().mockReturnValueOnce("upload-1").mockReturnValueOnce("upload-2"),
    code: "family",
    uploaderName: " Ana ",
  };

  it("prepares, uploads, and finalizes a file in sequence", async () => {
    const steps: string[] = [];
    const file = makeFile("foto.jpg");
    const results = await uploadGalleryFiles([file], options, {
      prepare: async (data) => {
        steps.push("prepare");
        expect(data).toMatchObject({
          code: "family",
          clientUploadId: "upload-1",
          name: "foto.jpg",
          uploaderName: "Ana",
        });
        return {
          id: "media-1",
          path: "uploads/foto.jpg",
          token: "signed-token",
          alreadyDone: false,
        };
      },
      upload: async (path, token, uploadedFile) => {
        steps.push("upload");
        expect([path, token, uploadedFile]).toEqual(["uploads/foto.jpg", "signed-token", file]);
      },
      finalize: async (data) => {
        steps.push("finalize");
        expect(data).toEqual({ id: "media-1", clientUploadId: "upload-1" });
        return { status: "pending_approval" };
      },
    });

    expect(steps).toEqual(["prepare", "upload", "finalize"]);
    expect(results).toMatchObject([{ ok: true, status: "pending_approval" }]);
  });

  it("reports per-file failures, continues through the batch, and skips duplicate uploads", async () => {
    const secondFile = makeFile("segunda.jpg");
    const results = await uploadGalleryFiles([makeFile("falha.jpg"), secondFile], options, {
      prepare: vi
        .fn()
        .mockResolvedValueOnce({
          id: "media-1",
          path: "uploads/falha.jpg",
          token: "bad-token",
          alreadyDone: false,
        })
        .mockResolvedValueOnce({ id: "media-2", alreadyDone: true }),
      upload: async () => {
        throw new Error("Storage indisponível");
      },
      finalize: vi.fn(),
    });

    expect(results).toMatchObject([
      { ok: false, error: "Storage indisponível" },
      { ok: true, status: "already_done" },
    ]);
  });

  it("stops before finalize when a signed upload token is missing", async () => {
    const finalize = vi.fn();
    const results = await uploadGalleryFiles(
      [makeFile("sem-token.jpg")],
      { createId: () => "upload-3" },
      {
        prepare: async () => ({ id: "media-3", alreadyDone: false }),
        upload: vi.fn(),
        finalize,
      },
    );

    expect(results[0]).toMatchObject({
      ok: false,
      error: "Envio sem autorização de armazenamento.",
    });
    expect(finalize).not.toHaveBeenCalled();
  });
});

describe("Visitor-facing errors", () => {
  it("hides server configuration details from visitors", () => {
    expect(userErrorMessage(new Error("Missing Supabase environment variable(s): SUPABASE_SERVICE_ROLE_KEY"), "Fallback"))
      .toBe("O serviço está temporariamente indisponível. Tente novamente mais tarde.");
  });

  it("preserves useful workflow errors and handles unknown values", () => {
    expect(userErrorMessage(new Error("Código inválido"), "Fallback")).toBe("Código inválido");
    expect(userErrorMessage(null, "Fallback")).toBe("Fallback");
  });
});
