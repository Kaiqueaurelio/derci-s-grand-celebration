// Server-only helpers: hashing, role checks, request fingerprinting.
import { getRequest } from "@tanstack/react-start/server";

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomToken(bytes = 24): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function getEvent() {
  const db = await admin();
  const { data, error } = await db.from("events").select("*").eq("slug", "derci-80").single();
  if (error || !data) throw new Error("Evento não encontrado.");
  return data;
}

export type Role = "admin" | "door";

/** Reads the caller's role through their own RLS-scoped client. */
export async function getRole(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<Role | null> {
  const { data } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.role as Role) ?? null;
}

export async function assertRole(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  allowed: Role[],
): Promise<Role> {
  const role = await getRole(supabase, userId);
  if (!role || !allowed.includes(role)) throw new Error("Acesso não autorizado.");
  return role;
}

/** Optional auth: returns the user id if a valid bearer token is present. */
export async function optionalUserId(): Promise<string | null> {
  const req = getRequest();
  const auth = req?.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const db = await admin();
  const { data } = await db.auth.getUser(auth.slice(7));
  return data.user?.id ?? null;
}

export async function requestFingerprint(): Promise<string> {
  const req = getRequest();
  const ip =
    req?.headers.get("cf-connecting-ip") ||
    req?.headers.get("x-forwarded-for")?.split(",")[0] ||
    "unknown";
  return sha256(`fp:${ip}`);
}

/** Make storage signed URLs browser-reachable. */
export function publicStorageUrl(signedUrl: string): string {
  const base = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const idx = signedUrl.indexOf("/storage/v1/");
  if (idx === -1 || !base) return signedUrl;
  return base.replace(/\/$/, "") + signedUrl.slice(idx);
}
