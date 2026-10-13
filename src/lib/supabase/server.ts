import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseConfig } from "@/lib/supabase/config";

// Supabase client for Server Components, Server Actions and Route Handlers.
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseConfig();

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components can't write cookies; session refresh happens in Proxy.
          }
        },
      },
    },
  );
}
