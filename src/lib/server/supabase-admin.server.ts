import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function createServerFetch(apiKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));

    // Supabase's opaque sb_secret_* keys belong in apikey, not a bearer header.
    if (apiKey.startsWith("sb_secret_") && headers.get("Authorization") === `Bearer ${apiKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", apiKey);
    return fetch(input, { ...init, headers });
  };
}

function createSupabaseAdmin() {
  const url = process.env["SUPABASE_URL"];
  // Support the current secret-key format and the legacy service-role key.
  const apiKey = process.env["SUPABASE_SECRET_KEY"] || process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !apiKey) {
    const missing = [
      ...(!url ? ["SUPABASE_URL"] : []),
      ...(!apiKey ? ["SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY"] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(", ")}. Connect Supabase in Lovable Cloud.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(url, apiKey, {
    global: { fetch: createServerFetch(apiKey) },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let cachedAdmin: ReturnType<typeof createSupabaseAdmin> | undefined;

/** Server-only client for trusted handlers after their own access checks. */
export function getSupabaseAdmin() {
  cachedAdmin ??= createSupabaseAdmin();
  return cachedAdmin;
}
