import type { DoorGroup } from "./door.functions";
import type { GalleryItem } from "./gallery.functions";

type RsvpSubmission = {
  submissionId: string;
  responsibleName: string;
  phone: string;
  attending: boolean;
  companions: string[];
  notes: string;
};

type RsvpResult = { token: string; attending: boolean; names: string[] };

type UploadServices = {
  prepare: (data: {
    code?: string;
    clientUploadId: string;
    name: string;
    mimeType: string;
    size: number;
    uploaderName?: string;
  }) => Promise<{ id: string; path?: string; token?: string; alreadyDone: boolean }>;
  upload: (path: string, token: string, file: File) => Promise<void>;
  finalize: (data: { id: string; clientUploadId: string }) => Promise<{ status: string }>;
};

export async function submitRsvpFlow(
  input: RsvpSubmission,
  submit: (input: RsvpSubmission) => Promise<RsvpResult>,
) {
  const result = await submit(input);
  if (!result.token || result.names.length === 0) throw new Error("Confirmação incompleta.");
  return result;
}

export async function checkInFlow(
  guestId: string,
  checkedIn: boolean,
  update: (data: { guestId: string; undo: boolean }) => Promise<unknown>,
  reload: () => Promise<DoorGroup[]>,
) {
  await update({ guestId, undo: checkedIn });
  return reload();
}

export async function uploadGalleryFiles(
  files: File[],
  options: { code?: string; uploaderName?: string; createId?: () => string },
  services: UploadServices,
  onFileResult?: (
    file: File,
    result: { ok: true; status: string } | { ok: false; error: string },
  ) => void,
) {
  const createId = options.createId ?? (() => crypto.randomUUID());
  const results: Array<{ file: File; ok: boolean; status?: string; error?: string }> = [];
  for (const file of files) {
    const clientUploadId = createId();
    try {
      const prepared = await services.prepare({
        ...(options.code ? { code: options.code } : {}),
        clientUploadId,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        ...(options.uploaderName?.trim() ? { uploaderName: options.uploaderName.trim() } : {}),
      });
      if (prepared.alreadyDone) {
        const result = { file, ok: true, status: "already_done" };
        results.push(result);
        onFileResult?.(file, { ok: true, status: result.status });
        continue;
      }
      if (!prepared.path || !prepared.token)
        throw new Error("Envio sem autorização de armazenamento.");
      await services.upload(prepared.path, prepared.token, file);
      const finalized = await services.finalize({ id: prepared.id, clientUploadId });
      const result = { file, ok: true, status: finalized.status };
      results.push(result);
      onFileResult?.(file, { ok: true, status: finalized.status });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao enviar arquivo.";
      results.push({ file, ok: false, error: message });
      onFileResult?.(file, { ok: false, error: message });
    }
  }
  return results;
}

export type { RsvpSubmission, RsvpResult, UploadServices };
