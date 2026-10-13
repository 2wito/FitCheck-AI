"use client";

import { useActionState, useState } from "react";
import { Loader2, Sparkles, TriangleAlert, MailCheck } from "lucide-react";

import { signIn, signInWithGoogle, signUp, type AuthFormState } from "@/actions/auth";
import { Field } from "@/components/shared/form-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "sign-in" | "sign-up";

export function AuthForm({
  next,
  initialError,
  googleEnabled,
}: {
  next: string;
  initialError: string | null;
  googleEnabled: boolean;
}) {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [signInState, signInAction, signingIn] = useActionState<AuthFormState, FormData>(signIn, null);
  const [signUpState, signUpAction, signingUp] = useActionState<AuthFormState, FormData>(signUp, null);
  const [googleState, googleAction, redirectingToGoogle] = useActionState<AuthFormState, FormData>(
    signInWithGoogle,
    null,
  );

  const isSignUp = mode === "sign-up";
  const state = isSignUp ? signUpState : signInState;
  const pending = signingIn || signingUp || redirectingToGoogle;
  const error = state?.error ?? googleState?.error ?? (state ? null : initialError);

  return (
    <div className="flex w-full max-w-sm flex-col gap-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted">
          <Sparkles className="size-5" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isSignUp
            ? "Build your virtual closet and let AI style your outfits."
            : "Sign in to your FitCheck AI closet."}
        </p>
      </div>

      {googleEnabled && (
        <>
          <form action={googleAction}>
            <input type="hidden" name="next" value={next} />
            <Button type="submit" variant="outline" className="w-full" disabled={pending}>
              {redirectingToGoogle ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              Continue with Google
            </Button>
          </form>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      {state?.message ? (
        <div className="flex flex-col items-center gap-2 rounded-lg bg-muted/60 p-4 text-center text-sm">
          <MailCheck className="size-5" />
          <p>{state.message}</p>
        </div>
      ) : (
        // Keyed by mode so switching tabs clears the fields.
        <form key={mode} action={isSignUp ? signUpAction : signInAction} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="email" required disabled={pending} />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              minLength={isSignUp ? 8 : undefined}
              required
              disabled={pending}
            />
          </Field>

          {error && (
            <p role="alert" className="flex items-start gap-1.5 text-sm text-destructive">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {(signingIn || signingUp) && <Loader2 data-icon="inline-start" className="animate-spin" />}
            {isSignUp ? "Create account" : "Sign in"}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {isSignUp ? "Already have an account?" : "New to FitCheck AI?"}{" "}
        <button
          type="button"
          onClick={() => setMode(isSignUp ? "sign-in" : "sign-up")}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {isSignUp ? "Sign in" : "Create an account"}
        </button>
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}
