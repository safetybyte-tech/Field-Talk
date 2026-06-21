import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Whether the Supabase env vars were present at build time. These are inlined
 * by Vite, so a missing value can't be fixed at runtime — the app surfaces a
 * configuration screen instead of crashing on import (see App.tsx).
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.error(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then rebuild.'
  );
}

// Fall back to harmless placeholders when unconfigured so createClient does not
// throw at import time. When unconfigured the app never calls the client.
export const supabase = createClient(
  supabaseUrl ?? 'http://unconfigured.invalid',
  supabaseAnonKey ?? 'unconfigured'
);
