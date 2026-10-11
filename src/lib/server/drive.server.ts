// Google Drive via the Lovable connector gateway (organizer's own Google account).
import { admin } from "./core.server";

const GATEWAY = "https://connector-gateway.lovable.dev/google_drive";

export class DriveNotConfigured extends Error {}

function headers(extra: Record<string, string> = {}) {
  const lovable = process.env.LOVABLE_API_KEY;
  const key = process.env.GOOGLE_DRIVE_API_KEY;
  if (!lovable || !key) throw new DriveNotConfigured("Google Drive ainda não foi conectado.");
  return { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": key, ...extra };
}

export function driveCredentialsPresent() {
  return Boolean(process.env.LOVABLE_API_KEY && process.env.GOOGLE_DRIVE_API_KEY);
}

async function driveFetch(path: string, init: RequestInit = {}, attempts = 3): Promise<Response> {
  let last: Response | null = null;
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(`${GATEWAY}${path}`, {
      ...init,
      headers: { ...headers(), ...(init.headers as Record<string, string>) },
    });
    if (res.ok) return res;
    last = res;
    if (res.status !== 429 && res.status < 500) break;
    const retryAfter = Number(res.headers.get("retry-after")) || 0;
    await new Promise((r) => setTimeout(r, retryAfter * 1000 || 500 * 2 ** i + Math.random() * 300));
  }
  const body = last ? await last.text() : "";
  // Never include credentials; only status + provider message.
  throw new Error(`Google Drive respondeu ${last?.status}: ${body.slice(0, 300)}`);
}

export async function getDriveSettings(): Promise<{
  folder_id?: string;
  folder_name?: string;
  last_test_at?: string;
  last_test_ok?: boolean;
  last_test_error?: string;
  last_sync_at?: string;
  last_sync_summary?: string;
}> {
  const db = await admin();
  const { data } = await db
    .from("integration_settings")
    .select("value")
    .eq("key", "google_drive")
    .single();
  return (data?.value as Record<string, string>) ?? {};
}

export async function saveDriveSettings(patch: Record<string, unknown>) {
  const db = await admin();
  const current = await getDriveSettings();
  await db
    .from("integration_settings")
    .upsert({ key: "google_drive", value: { ...current, ...patch }, updated_at: new Date().toISOString() });
}

export async function testDrive(folderId: string) {
  const res = await driveFetch(
    `/drive/v3/files/${encodeURIComponent(folderId)}?fields=id,name,mimeType,capabilities(canAddChildren)&supportsAllDrives=true`,
  );
  const f = (await res.json()) as {
    id: string;
    name: string;
    mimeType: string;
    capabilities?: { canAddChildren?: boolean };
  };
  if (f.mimeType !== "application/vnd.google-apps.folder") throw new Error("O ID informado não é uma pasta.");
  if (f.capabilities && f.capabilities.canAddChildren === false)
    throw new Error("A conta conectada não pode adicionar arquivos nessa pasta.");
  return f;
}

/** Upload with dedupe: a file tagged with appMediaId=<id> is never uploaded twice. */
export async function uploadToDrive(opts: {
  folderId: string;
  mediaId: string;
  name: string;
  mimeType: string;
  data: ArrayBuffer;
}): Promise<string> {
  const q = `appProperties has { key='appMediaId' and value='${opts.mediaId}' } and trashed=false`;
  const existing = await driveFetch(
    `/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
  );
  const found = (await existing.json()) as { files: { id: string }[] };
  if (found.files?.[0]) return found.files[0].id;

  const boundary = `derci${crypto.randomUUID()}`;
  const meta = JSON.stringify({
    name: opts.name,
    parents: [opts.folderId],
    appProperties: { appMediaId: opts.mediaId },
  });
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`,
    `--${boundary}\r\nContent-Type: ${opts.mimeType}\r\n\r\n`,
    opts.data,
    `\r\n--${boundary}--`,
  ]);
  const res = await driveFetch(
    `/upload/drive/v3/files?uploadType=multipart&fields=id&supportsAllDrives=true`,
    { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body },
    2,
  );
  const json = (await res.json()) as { id: string };
  return json.id;
}

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  imageMediaMetadata?: { time?: string };
  appProperties?: Record<string, string>;
};

export async function listFolder(folderId: string): Promise<DriveFile[]> {
  const all: DriveFile[] = [];
  let pageToken = "";
  const q = `'${folderId}' in parents and trashed=false and (mimeType contains 'image/' or mimeType contains 'video/')`;
  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({
      q,
      pageSize: "200",
      fields: "nextPageToken,files(id,name,mimeType,size,createdTime,imageMediaMetadata(time),appProperties)",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await driveFetch(`/drive/v3/files?${params}`);
    const json = (await res.json()) as { files: DriveFile[]; nextPageToken?: string };
    all.push(...(json.files ?? []));
    if (!json.nextPageToken) break;
    pageToken = json.nextPageToken;
  }
  return all;
}

export async function downloadDriveFile(id: string): Promise<ArrayBuffer> {
  const res = await driveFetch(`/drive/v3/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`);
  return res.arrayBuffer();
}

/** Push an app-uploaded file (already in storage) to Drive and record the result. */
export async function pushMediaToDrive(mediaId: string): Promise<{ ok: boolean; message: string }> {
  const db = await admin();
  const { data: m } = await db.from("media_files").select("*").eq("id", mediaId).single();
  if (!m || !m.storage_path) return { ok: false, message: "Arquivo não encontrado." };
  if (m.drive_file_id) return { ok: true, message: "Já está no Google Drive." };
  const settings = await getDriveSettings();
  if (!driveCredentialsPresent() || !settings.folder_id) {
    await db.from("media_files").update({ drive_status: "not_configured" }).eq("id", mediaId);
    return { ok: false, message: "Google Drive ainda não configurado; o arquivo ficou guardado com segurança." };
  }
  try {
    const { data: blob, error } = await db.storage.from("media").download(m.storage_path);
    if (error || !blob) throw new Error("Não foi possível ler o arquivo armazenado.");
    const driveId = await uploadToDrive({
      folderId: settings.folder_id,
      mediaId,
      name: `${new Date(m.created_at).toISOString().slice(0, 19).replace(/[:T]/g, "-")}_${m.original_name}`,
      mimeType: m.mime_type,
      data: await blob.arrayBuffer(),
    });
    await db
      .from("media_files")
      .update({ drive_file_id: driveId, drive_status: "uploaded", drive_error: null, drive_attempts: m.drive_attempts + 1, updated_at: new Date().toISOString() })
      .eq("id", mediaId);
    return { ok: true, message: "Enviado ao Google Drive." };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Drive upload failed", mediaId, msg);
    await db
      .from("media_files")
      .update({ drive_status: "failed", drive_error: msg.slice(0, 500), drive_attempts: m.drive_attempts + 1 })
      .eq("id", mediaId);
    return { ok: false, message: "Falha ao enviar ao Google Drive; o arquivo ficou guardado e pode ser reenviado." };
  }
}
