/** Keep server configuration details out of visitor-facing errors. */
export function userErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  if (/Missing Supabase environment variable/i.test(error.message)) {
    return "O serviço está temporariamente indisponível. Tente novamente mais tarde.";
  }
  return error.message || fallback;
}
