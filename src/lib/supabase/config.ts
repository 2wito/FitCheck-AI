// Validated Supabase settings, shared by every Supabase client (proxy, server, browser, admin).
//
// Env vars are referenced literally (process.env.NEXT_PUBLIC_...), never by computed name,
// because Next.js inlines NEXT_PUBLIC_* values into bundles only for literal references.

export class SupabaseConfigError extends Error {
  name = "SupabaseConfigError";
}

const HOW_TO_FIX =
  "Set it in .env locally, or on Vercel under Settings → Environment Variables, then redeploy " +
  "(NEXT_PUBLIC_* values are baked in at build time).";

// Trims whitespace and one pair of surrounding quotes. Copying a line from .env into the
// Vercel dashboard easily keeps the quotes, which makes the URL invalid.
function clean(value: string | undefined) {
  const cleaned = value?.trim().replace(/^(["'])(.*)\1$/, "$2").trim();
  return cleaned || undefined;
}

function parseSupabaseUrl(raw: string | undefined, variable: string): string {
  if (!raw) {
    throw new SupabaseConfigError(
      `${variable} is not set. It should be your project URL, like https://<project-ref>.supabase.co. ${HOW_TO_FIX}`,
    );
  }

  let url: URL | null = null;
  try {
    url = new URL(raw);
  } catch {
    // Reported below.
  }
  if (!url || (url.protocol !== "https:" && url.protocol !== "http:")) {
    throw new SupabaseConfigError(
      `${variable} is not a valid http(s) URL (value starts with "${raw.slice(0, 12)}…"). ` +
        `It should look like https://<project-ref>.supabase.co. ${HOW_TO_FIX}`,
    );
  }
  if (/your-project/i.test(url.hostname)) {
    throw new SupabaseConfigError(`${variable} is still the placeholder from .env.example. ${HOW_TO_FIX}`);
  }
  return url.origin;
}

function requireKey(value: string | undefined, variable: string): string {
  if (!value) throw new SupabaseConfigError(`${variable} is not set. ${HOW_TO_FIX}`);
  if (/^your-/i.test(value)) {
    throw new SupabaseConfigError(`${variable} is still the placeholder from .env.example. ${HOW_TO_FIX}`);
  }
  return value;
}

// URL and public (anon/publishable) key. On the server, SUPABASE_URL / SUPABASE_ANON_KEY are
// accepted as fallbacks; the browser only ever sees the NEXT_PUBLIC_* values.
export function getSupabaseConfig(): { url: string; anonKey: string } {
  const publicUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const url = parseSupabaseUrl(
    publicUrl ?? clean(process.env.SUPABASE_URL),
    publicUrl ? "NEXT_PUBLIC_SUPABASE_URL" : "NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)",
  );
  const anonKey = requireKey(
    clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ?? clean(process.env.SUPABASE_ANON_KEY),
    "NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)",
  );
  return { url, anonKey };
}

// Server-only secret for the admin client. Kept separate so the browser never asks for it.
export function getServiceRoleKey(): string {
  return requireKey(clean(process.env.SUPABASE_SERVICE_ROLE_KEY), "SUPABASE_SERVICE_ROLE_KEY");
}
