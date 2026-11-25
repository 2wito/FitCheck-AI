"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { Camera, Globe, Loader2, Lock, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";

import { createCloset, updateClosetProfile, type ClosetFormState } from "@/actions/closet-profile";
import { ClosetAvatar, genderKey } from "@/components/shared/closet-avatar";
import { Field } from "@/components/shared/form-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { makeAvatar } from "@/lib/avatar";
import { cn } from "@/lib/utils";

type Visibility = "PUBLIC" | "PRIVATE";
type Gender = "MALE" | "FEMALE";

export type ProfileValues = {
  closetName: string | null;
  name: string | null;
  avatarUrl: string | null;
  visibility: Visibility;
  gender: Gender | null;
  city: string | null;
  age: number | null;
};

const GENDERS: { value: Gender | ""; label: string }[] = [
  { value: "", label: "Not set" },
  { value: "FEMALE", label: "Woman" },
  { value: "MALE", label: "Man" },
];

// Creates a closet (mode "create") or edits its settings (mode "edit").
export function ProfileForm({
  mode,
  initial,
  askForLogin,
}: {
  mode: "create" | "edit";
  initial: ProfileValues;
  // Creating without being signed in: also offers email and password.
  askForLogin: boolean;
}) {
  const [state, submit, pending] = useActionState<ClosetFormState, FormData>(
    mode === "create" ? createCloset : updateClosetProfile,
    null,
  );
  const [visibility, setVisibility] = useState<Visibility>(initial.visibility);
  const [gender, setGender] = useState<Gender | "">(initial.gender ?? "");
  const [avatar, setAvatar] = useState<{ file: File; url: string } | null>(null);
  const [removed, setRemoved] = useState(false);
  const avatarUrl = avatar?.url ?? (removed ? null : initial.avatarUrl);

  useEffect(() => {
    if (state?.message) toast.success(state.message);
  }, [state]);
  useEffect(() => {
    const url = avatar?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [avatar]);

  async function pickAvatar(file: File | undefined) {
    if (!file) return;
    try {
      const square = await makeAvatar(file);
      setAvatar({ file: square, url: URL.createObjectURL(square) });
      setRemoved(false);
    } catch {
      toast.error("Couldn't read this photo. Try a JPEG or PNG.");
    }
  }

  // Not a form `action`: React would clear the fields after every submit, even on an error.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (avatar) formData.set("avatar", avatar.file);
    if (removed) formData.set("removeAvatar", "true");
    startTransition(() => submit(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <label className="relative cursor-pointer rounded-full has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
          <ClosetAvatar
            src={avatarUrl}
            name={initial.name ?? "?"}
            gender={genderKey(gender || null)}
            className="size-20 text-2xl"
          />
          <span className="absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-full border-2 border-background bg-foreground text-background">
            <Camera className="size-4" aria-hidden />
          </span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Profile photo"
            disabled={pending}
            onChange={(e) => {
              void pickAvatar(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <div className="flex flex-col items-start gap-1 text-sm">
          <p className="font-medium">Profile photo</p>
          <p className="text-muted-foreground">Optional. Shown next to your closet&apos;s name.</p>
          {avatarUrl && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={pending}
              onClick={() => {
                setAvatar(null);
                setRemoved(true);
              }}
            >
              <X data-icon="inline-start" />
              Remove photo
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Closet name" htmlFor="closetName">
          <Input
            id="closetName"
            name="closetName"
            defaultValue={initial.closetName ?? ""}
            placeholder="MY CLOSET"
            dir="auto"
            autoComplete="off"
            required
            minLength={2}
            maxLength={40}
            disabled={pending}
          />
        </Field>
        <Field label="Your name" htmlFor="name">
          <Input
            id="name"
            name="name"
            defaultValue={initial.name ?? ""}
            dir="auto"
            autoComplete="name"
            required
            maxLength={40}
            disabled={pending}
          />
        </Field>
      </div>

      <fieldset disabled={pending}>
        <legend className="mb-2 text-sm font-medium">Who can see it?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <VisibilityChoice
            value="PUBLIC"
            checked={visibility === "PUBLIC"}
            onChange={() => setVisibility("PUBLIC")}
            icon={Globe}
            title="Public"
            body="Shown on the homepage. Visitors can look, only you can edit."
          />
          <VisibilityChoice
            value="PRIVATE"
            checked={visibility === "PRIVATE"}
            onChange={() => setVisibility("PRIVATE")}
            icon={Lock}
            title="Private"
            body="Only you, with your email and password. You can make it public later."
          />
        </div>
      </fieldset>

      {askForLogin && (
        <section className="flex flex-col gap-4 rounded-2xl border bg-muted/40 p-4">
          <p className="text-sm text-muted-foreground">
            {visibility === "PRIVATE" ? (
              "Choose an email and password to open your closet. No verification email."
            ) : (
              <>
                <strong className="font-semibold text-foreground">Optional.</strong> Without an
                email and password you can only edit your closet in this browser, and clearing its
                data means losing access. You can also add them later in Settings.
              </>
            )}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required={visibility === "PRIVATE"}
                disabled={pending}
              />
            </Field>
            <Field label="Password (8+ characters)" htmlFor="password">
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required={visibility === "PRIVATE"}
                disabled={pending}
              />
            </Field>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <p className="text-sm font-medium">
          About you{" "}
          <span className="font-normal text-muted-foreground">
            (optional, shown on a public closet)
          </span>
        </p>
        <fieldset disabled={pending}>
          <legend className="sr-only">Gender</legend>
          <div className="flex w-fit gap-0.5 rounded-lg bg-muted p-0.5">
            {GENDERS.map(({ value, label }) => (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer items-center rounded-md px-3 py-1.5 text-sm transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50 pointer-coarse:min-h-11",
                  gender === value
                    ? "bg-background font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <input
                  type="radio"
                  name="gender"
                  value={value}
                  checked={gender === value}
                  onChange={() => setGender(value)}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-[1fr_7rem] gap-4">
          <Field label="City" htmlFor="city">
            <Input
              id="city"
              name="city"
              defaultValue={initial.city ?? ""}
              dir="auto"
              autoComplete="address-level2"
              maxLength={60}
              disabled={pending}
            />
          </Field>
          <Field label="Age" htmlFor="age">
            <Input
              id="age"
              name="age"
              type="number"
              inputMode="numeric"
              defaultValue={initial.age ?? ""}
              min={13}
              max={120}
              disabled={pending}
            />
          </Field>
        </div>
      </section>

      <FormError message={state?.error} />

      <Button
        type="submit"
        disabled={pending}
        className={
          mode === "create"
            ? "h-14 rounded-2xl text-base font-bold tracking-wide"
            : "h-10 self-start px-5"
        }
      >
        {pending && <Loader2 data-icon="inline-start" className="animate-spin" />}
        {mode === "edit" ? "Save changes" : pending ? "Creating your closet..." : "CREATE MY CLOSET"}
      </Button>
    </form>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-1.5 text-sm text-destructive">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  );
}

function VisibilityChoice({
  value,
  checked,
  onChange,
  icon: Icon,
  title,
  body,
}: {
  value: Visibility;
  checked: boolean;
  onChange: () => void;
  icon: typeof Globe;
  title: string;
  body: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
        checked ? "border-primary bg-accent/60" : "hover:border-foreground/30",
      )}
    >
      <input
        type="radio"
        name="visibility"
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <Icon
        className={cn("mt-0.5 size-5 shrink-0", checked ? "text-primary" : "text-muted-foreground")}
        aria-hidden
      />
      <span className="flex flex-col gap-0.5">
        <span className="font-semibold">{title}</span>
        <span className="text-sm text-muted-foreground">{body}</span>
      </span>
    </label>
  );
}
