/** Fail before producing a bundle that cannot authenticate or send records. */
export function validateBuildEnvironment(env: Record<string, string | undefined>): void {
  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_WORKER_URL'];
  const missing = required.filter(key => !env[key]?.trim());
  if (missing.length) throw new Error(`Missing build configuration: ${missing.join(', ')}. Configure these for the deployment environment before building.`);
  for (const key of ['VITE_SUPABASE_URL', 'VITE_WORKER_URL']) {
    try {
      const url = new URL(env[key]!);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error();
    } catch {
      throw new Error(`${key} must be an HTTP(S) service URL without embedded credentials.`);
    }
  }
}
