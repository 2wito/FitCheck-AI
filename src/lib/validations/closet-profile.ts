import { z } from "zod";

// Form fields arrive as strings (or null when missing); blank means "not given".
const blankToNull = (value: unknown) =>
  value === undefined || (typeof value === "string" && value.trim() === "") ? null : value;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address"));

// bcrypt ignores bytes past 72.
export const passwordSchema = z
  .string()
  .min(8, "Use a password of at least 8 characters")
  .max(72, "Use at most 72 characters");

export const loginSchema = z.object({ email: emailSchema, password: passwordSchema });

const profileFields = {
  closetName: z
    .string("Give your closet a name")
    .trim()
    .min(2, "Give your closet a name (at least 2 characters)")
    .max(40, "Closet names can be up to 40 characters"),
  name: z
    .string("Enter your name")
    .trim()
    .min(1, "Enter your name")
    .max(40, "Names can be up to 40 characters"),
  visibility: z.enum(["PUBLIC", "PRIVATE"], "Choose public or private"),
  gender: z.preprocess(blankToNull, z.enum(["MALE", "FEMALE"], "Choose a valid gender").nullable()),
  city: z.preprocess(
    blankToNull,
    z.string().trim().max(60, "City names can be up to 60 characters").nullable(),
  ),
  age: z.preprocess(
    blankToNull,
    z.coerce
      .number("Enter a valid age")
      .int("Enter a valid age")
      .min(13, "You must be at least 13")
      .max(120, "Enter a valid age")
      .nullable(),
  ),
};

export const profileSchema = z.object(profileFields);

export const createClosetSchema = z
  .object({
    ...profileFields,
    email: z.preprocess(blankToNull, emailSchema.nullable()),
    password: z.preprocess(blankToNull, passwordSchema.nullable()),
  })
  .superRefine(({ visibility, email, password }, ctx) => {
    if (visibility === "PRIVATE" && (!email || !password)) {
      ctx.addIssue({ code: "custom", message: "A private closet needs an email and a password" });
    } else if (Boolean(email) !== Boolean(password)) {
      ctx.addIssue({ code: "custom", message: "Enter both an email and a password, or leave both empty" });
    }
  });

export type ClosetProfile = z.infer<typeof profileSchema>;

// Address part for a closet: "TWITO'S CLOSET" -> "twitos-closet". Names without Latin letters
// or digits (Hebrew, emoji) become "closet"; the caller adds a suffix when an address is taken.
export function slugify(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ'’]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return slug || "closet";
}
