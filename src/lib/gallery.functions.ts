import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { validateGalleryUpload } from "./workflow-rules";

const S = () => import("./server/core.server");

const accessSchema = z.object({ code: z.string().max(40).optional() });
const DEFAULT_DRIVE_FOLDER_ID = "1U02PNAceEReBC0_wz7RPwVj9ZTSkbHkU";

/** Backend gate for every gallery read/upload, according to the configured mode. */
async function assertGalleryAccess(code?: string) {
  const { getEvent, sha256, optionalUserId } = await S();
  const ev = await getEvent();
  if (!ev.gallery_enabled) throw new Error("GALLERY_DISABLED");
  if (ev.gallery_access === "code") {
    if (!code || !ev.gallery_code_hash) throw new Error("CODE_REQUIRED");
    if ((await sha256(`gallery:${code.trim().toLowerCase()}`)) !== ev.gallery_code_hash) throw new Error("CODE_INVALID");
  }
  if (ev.gallery_access === "auth") {
    const uid = await optionalUserId();
    if (!uid) throw new Error("AUTH_REQUIRED");
  }
  return ev;
}

export type GalleryItem = {
  id: string;
  kind: "image" | "video";
  mimeType: string;
  url: string;
  downloadUrl: string;
  name: string;
  uploaderName: string | null;
  createdAt: string;
};

export const getGallery = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => accessSchema.parse(d))
  .handler(async ({ data }): Promise<{ items: GalleryItem[]; moderation: boolean; uploadsEnabled: boolean }> => {
    const ev = await assertGalleryAccess(data.code);
    const { admin, publicStorageUrl } = await S();
    const db = await admin();
    const { data: rows } = await db
      .from("media_files")
      .select("id, kind, mime_type, storage_path, original_name, uploader_name, created_at, captured_at")
      .eq("event_id", ev.id)
      .eq("status", "approved")
      .not("storage_path", "is", null)
      .order("created_at", { ascending: false })
      .limit(500);
    const list = rows ?? [];
    const urls = new Map<string, string>();
    if (list.length) {
      const { data: signed } = await db.storage.from("media").createSignedUrls(list.map((r) => r.storage_path as string), 3 * 3600);
      signed?.forEach((s) => s.path && s.signedUrl && urls.set(s.path, publicStorageUrl(s.signedUrl)));
    }
    return {
      moderation: ev.moderation_required,
      uploadsEnabled: ev.uploads_enabled,
      items: list
        .filter((r) => urls.has(r.storage_path as string))
        .map((r) => ({
          id: r.id,
          kind: r.kind as "image" | "video",
          mimeType: r.mime_type,
          url: urls.get(r.storage_path as string)!,
          downloadUrl: urls.get(r.storage_path as string)! + (urls.get(r.storage_path as string)!.includes("?") ? "&" : "?") + "download=" + encodeURIComponent(r.original_name),
          name: r.original_name,
          uploaderName: r.uploader_name,
          createdAt: r.captured_at ?? r.created_at,
        })),
    };
  });

/** Lists recent folder photos only after the same public/code/auth gate as the app gallery. */
export const getDriveGallery = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => accessSchema.parse(d))
  .handler(async ({ data }) => {
    const ev = await assertGalleryAccess(data.code);
    const { getDriveSettings, listFolder, createDrivePreviewUrl } = await import("./server/drive.server");
    const settings = await getDriveSettings();
    const folderId = settings.folder_id || DEFAULT_DRIVE_FOLDER_ID;
    const files = await listFolder(folderId);
    const items = await Promise.all(
      files
        .filter((file) => file.mimeType.startsWith("image/") && Number(file.size ?? 0) > 0 && Number(file.size ?? 0) <= ev.max_image_mb * 1024 * 1024)
        .sort((a, b) => (b.createdTime ?? "").localeCompare(a.createdTime ?? ""))
        .slice(0, 80)
        .map(async (file) => ({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          createdAt: file.imageMediaMetadata?.time ?? file.createdTime ?? null,
          url: await createDrivePreviewUrl(file.id, file.mimeType),
        })),
    );
    return { items, folderUrl: `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}` };
  });

export const createUpload = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    accessSchema
      .extend({
        clientUploadId: z.string().uuid(),
        name: z.string().min(1).max(200),
        mimeType: z.string().max(100),
        size: z.number().int().positive(),
        uploaderName: z.string().max(80).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const ev = await assertGalleryAccess(data.code);
    if (!ev.uploads_enabled) throw new Error("O envio de arquivos está pausado pela organização.");
    const upload = validateGalleryUpload(data.mimeType, data.size, ev.max_image_mb, ev.max_video_mb);
    const mime = upload.mime;
    const isImage = upload.kind === "image";
    const isVideo = upload.kind === "video";

    const { admin, requestFingerprint } = await S();
    const db = await admin();
    const fp = await requestFingerprint();
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await db
      .from("media_files")
      .select("id", { count: "exact", head: true })
      .eq("uploader_fingerprint", fp)
      .gte("created_at", since);
    if ((count ?? 0) >= ev.uploads_per_hour) throw new Error("Muitos envios em pouco tempo. Aguarde alguns minutos.");

    const { data: existing } = await db.from("media_files").select("id, storage_path, status").eq("client_upload_id", data.clientUploadId).maybeSingle();
    const id = existing?.id ?? crypto.randomUUID();
    const ext = (data.name.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
    const path = existing?.storage_path ?? `uploads/${id}.${ext}`;
    if (!existing) {
      const { error } = await db.from("media_files").insert({
        id,
        event_id: ev.id,
        kind: isVideo ? "video" : "image",
        mime_type: mime,
        size_bytes: data.size,
        original_name: data.name.replace(/[^\w.\- ]/g, "_").slice(0, 150),
        storage_path: path,
        status: "pending_upload",
        uploader_name: data.uploaderName?.trim() || null,
        uploader_fingerprint: fp,
        client_upload_id: data.clientUploadId,
      });
      if (error) throw new Error("Não foi possível preparar o envio.");
    } else if (existing.status !== "pending_upload") {
      return { id, alreadyDone: true as const };
    }
    const { data: signed, error: sErr } = await db.storage.from("media").createSignedUploadUrl(path, { upsert: true });
    if (sErr || !signed) throw new Error("Não foi possível preparar o envio.");
    return { id, path, token: signed.token, alreadyDone: false as const };
  });

export const finalizeUpload = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), clientUploadId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { admin, getEvent } = await S();
    const db = await admin();
    const ev = await getEvent();
    const { data: m } = await db
      .from("media_files")
      .select("id, storage_path, status, size_bytes")
      .eq("id", data.id)
      .eq("client_upload_id", data.clientUploadId)
      .maybeSingle();
    if (!m || !m.storage_path) throw new Error("Envio não encontrado.");
    if (m.status === "pending_upload") {
      // Confirm the object really exists in storage before reporting success.
      const [folder, file] = m.storage_path.split("/");
      if (!folder || !file) throw new Error("Caminho de envio inválido.");
      const { data: objs } = await db.storage.from("media").list(folder, { search: file, limit: 1 });
      const obj = objs?.find((o) => o.name === file);
      if (!obj) {
        await db.from("media_files").update({ status: "failed" }).eq("id", m.id);
        throw new Error("O arquivo não chegou ao armazenamento. Tente novamente.");
      }
      await db
        .from("media_files")
        .update({ status: ev.moderation_required ? "pending_approval" : "approved", updated_at: new Date().toISOString() })
        .eq("id", m.id);
    }
    const { pushMediaToDrive } = await import("./server/drive.server");
    const drive = await pushMediaToDrive(m.id);
    return { status: ev.moderation_required ? ("pending_approval" as const) : ("approved" as const), drive };
  });
