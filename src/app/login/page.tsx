import { Suspense } from "react";
import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { Skeleton } from "@/components/ui/skeleton";
import { safeNextPath } from "@/lib/auth-routes";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Suspense fallback={<Skeleton className="h-[26rem] w-full max-w-sm rounded-2xl" />}>
        <Login searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Login({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { next, error } = await searchParams;

  return (
    <AuthForm
      next={safeNextPath(typeof next === "string" ? next : null)}
      initialError={typeof error === "string" ? error : null}
      // Enable once the Google provider is configured in Supabase (see README).
      googleEnabled={process.env.GOOGLE_AUTH_ENABLED === "true"}
    />
  );
}
