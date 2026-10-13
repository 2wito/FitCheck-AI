import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseConfig } from "@/lib/supabase/config";

// Supabase client for Client Components (auth state, direct Storage uploads).
export function createClient() {
  const { url, anonKey } = getSupabaseConfig();
  return createBrowserClient(url, anonKey);
}
