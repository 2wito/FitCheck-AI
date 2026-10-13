import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getServiceRoleKey, getSupabaseConfig } from "@/lib/supabase/config";

// Service-role client: bypasses Row Level Security. Only use it after the caller has
// been authorized in server code, and never expose the key to the browser.
export function createAdminClient() {
  return createClient(getSupabaseConfig().url, getServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
