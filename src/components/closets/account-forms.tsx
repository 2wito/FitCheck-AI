"use client";

import { startTransition, useActionState, useState } from "react";
import { Check, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";

import { addLogin, deleteCloset, type ClosetFormState } from "@/actions/closet-profile";
import { FormError } from "@/components/closets/profile-form";
import { Field } from "@/components/shared/form-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Adds an email and password to a closet opened without them.
export function AddLoginForm() {
  const [state, submit, pending] = useActionState<ClosetFormState, FormData>(addLogin, null);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => submit(formData));
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" htmlFor="login-email">
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={pending}
          />
        </Field>
        <Field label="Password (8+ characters)" htmlFor="login-password">
          <Input
            id="login-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
            disabled={pending}
          />
        </Field>
      </div>
      <FormError message={state?.error} />
      {state?.message && <p className="text-sm font-medium">{state.message}</p>}
      <Button type="submit" className="self-start" disabled={pending}>
        {pending && <Loader2 data-icon="inline-start" className="animate-spin" />}
        Add email and password
      </Button>
    </form>
  );
}

// Deleting can't be undone, so the closet's name has to be typed.
export function DeleteClosetForm({ closetName }: { closetName: string }) {
  const [state, submit, pending] = useActionState<ClosetFormState, FormData>(deleteCloset, null);
  const [typed, setTyped] = useState("");

  return (
    <form action={submit} className="flex flex-col gap-3">
      <Field label={`Type "${closetName}" to confirm`} htmlFor="confirm">
        <Input
          id="confirm"
          name="confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          dir="auto"
          autoComplete="off"
          disabled={pending}
        />
      </Field>
      <FormError message={state?.error} />
      <Button
        type="submit"
        variant="destructive"
        className="self-start"
        disabled={pending || typed.trim() !== closetName}
      >
        {pending && <Loader2 data-icon="inline-start" className="animate-spin" />}
        Delete my closet
      </Button>
    </form>
  );
}

// Shares a closet's link with the phone's share sheet, or copies it.
export function ShareClosetButton({ slug, closetName }: { slug: string; closetName: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/c/${slug}`;
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: closetName, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Closing the share sheet isn't a failure.
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Couldn't copy the link");
    }
  }

  return (
    <Button variant="outline" onClick={share}>
      {copied ? <Check data-icon="inline-start" /> : <Share2 data-icon="inline-start" />}
      Share
    </Button>
  );
}
