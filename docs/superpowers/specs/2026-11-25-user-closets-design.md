# User closets: design

## Intent
Anyone visiting FitCheck AI can open their own closet in under a minute, choose public or private,
and (if public) be seen on the homepage. Simplicity beats account ceremony. Signing in is possible
but never required to browse.

## Goals
- A large homepage button: **CREATE YOUR CLOSET NOW!**
- Closet fields: closet name (e.g. TWITO'S CLOSET), display name, profile photo, gender, city, age.
- Public closets are listed on the homepage, photo next to name. Visitors can only look.
- Private closets: email + password, no verification email, never listed. Can be made public later
  (and public can be made private once it has an email and password).
- TWITO'S and SHAKED'S stay open for everyone to edit, labeled "Example closet".
- Simple onboarding: how to create a closet, how to pick good photos, what each feature does.

## Non-goals
Multiple closets per account, password reset by email, follows/likes/comments, moderation tools.

## Anti-goals
- A visitor can change or delete anything in someone else's (non-example) closet.
- A private closet, an email address or a planner leaks to another visitor.
- Existing example-closet data moves or is lost.

## Constraints
- Next.js 16 App Router with cacheComponents, Prisma 7, Supabase Auth (email confirmation stays on,
  anonymous sign-in stays off).
- The local `.env` points at the production database. Migrations are additive only.
- Every table gets Row Level Security enabled with no policies: the app reads through Prisma, so
  nothing but the server should reach the tables. This covers new and existing tables.

## Approaches
1. **One closet per account (picked by the owner).** Closet fields live on `User`. All data is
   already scoped by `userId`, so nothing moves. Trade-off: one closet per email.
2. Separate `Closet` table. Several closets per account, but every table must be migrated.
3. A password per closet with no accounts. Hand-built security; drops the existing Supabase Auth.

## Decided by the owner
- Public = view only. Only the two example closets are editable by everyone.
- Approach 1 and the proposals presented with it: public closets need no email, the device stays
  signed in, email and password can be added later; visitors see clothes and outfits but not the
  planner; age and city optional; onboarding in English; daily limits on AI and search.
- Photo advice: first choice is a clean picture of the garment alone, found in Google Images;
  otherwise a photo of the garment alone on a white background.

## How it works

**Data.** `User` gains `closetName`, `slug` (unique), `visibility` (PUBLIC | PRIVATE), `gender`,
`city`, `age`, `hasLogin`. Existing `name` is the display name and `avatarUrl` the photo. A closet
exists when `closetName` is set. A new `usage_counters` table holds (key, day, count).

**Creating.** `/create` is one form; private reveals required email + password, public shows them as
optional with a warning that clearing the browser loses edit access. The server creates a confirmed
Supabase user through the admin client (an internal placeholder address when no email is given),
signs the browser in, uploads the avatar and opens the closet. A failed step removes the new user.

**Who am I editing?** The closet cookie selects an example closet; otherwise the signed-in user's
closet is active. `getCurrentUserId()` / `requireUser()` resolve this in one place, so existing
actions keep working and can never target another person's closet.

**Viewing.** `/c/[slug]` shows a closet's clothes, types, sections and outfits without any actions.
Private or unknown slugs return the same 404, except to the owner. Queries select only public fields.

**Homepage.** Create button, closet gallery (example closets first, then newest), "How it works" in
three steps. `/guide` covers creating, photos and every feature, and is linked in the navigation.

**Settings.** `/settings` edits profile, photo and visibility, adds email + password, signs out and
deletes the closet (with a typed confirmation). Example closets have no settings page.

**Signing in.** `syncUser` must stop overwriting the closet's name and photo on each sign-in.

**Limits (per closet per day).** 40 AI calls, 20 online searches. Closet creation: 5 per IP per day,
IP stored only as a keyed hash.

## Builder's calls
Slug format, form layout, gallery card design (existing warm editorial style), avatar stored as WebP
at 512 px, age accepted from 13 to 120, city free text, gender male / female / unspecified.

## Rollout
Migration, then code push, then `AUTH_ENABLED` switched on in Vercel and redeployed, then a check of
the live site. Verified locally first with type-check, build and a browser walkthrough.
