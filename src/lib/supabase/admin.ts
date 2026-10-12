import "server-only";

import { createClient } from "@supabase/supabase-js";

// Service-role client: bypasses Row Level Security. Only use it after the caller has
// been authorized in server code, and never expose the key to the browser.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
