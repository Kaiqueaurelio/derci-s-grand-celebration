/** Normalize the server configured email allowed to claim the first admin role. */
export function canClaimInitialAdmin(
  email: string | undefined,
  configuredEmail: string | undefined,
) {
  const allowed = configuredEmail?.trim().toLowerCase();
  return Boolean(allowed && email?.trim().toLowerCase() === allowed);
}
