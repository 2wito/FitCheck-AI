# FitCheck AI

A virtual closet and AI outfit generator. Photograph your clothes (or find them online), and FitCheck removes the background and tags each item with AI. You can then build outfits on a drag-and-drop canvas, or let the AI stylist put one together for an occasion.

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui (Base UI), Prisma 7 and Supabase (Postgres, Auth, Storage). AI tagging and styling use Gemini through the Vercel AI SDK.

## Features

- **Virtual closet:** upload a photo, or search for a product online. Gemini tags the category, colors, season and style, and the background is removed automatically.
- **Outfit canvas:** drag, resize and layer items, then save outfits with a name and occasion.
- **AI stylist:** generates an outfit from your closet for an occasion and season.
- **Accounts:** email/password sign-in (Google optional). All data is private to its owner.
- **Planner & wear tracking:** plan outfits on a calendar, log what you wear, and see "last worn" and wear counts on closet cards.
- **Today's look:** a weather-aware outfit suggestion using local weather from Open-Meteo. The stylist skips pieces worn in the last 7 days.
- **Complete the look:** suggestions from your closet for incomplete or low-scoring outfits, plus items to buy online (via Serper) for categories you don't own.
- **Canvas extras:** backdrops, undo/redo (Ctrl+Z / Ctrl+Y), and PNG export or sharing.

## Setup

### 1. Install

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill it in:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Supabase → **Connect** → ORMs → Prisma, transaction pooler (port 6543) |
| `DIRECT_URL` | Same screen, session pooler (port 5432); used only for migrations |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API Keys |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page (`anon` or `sb_publishable_...` key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page (`service_role` / secret key). Keep it server-only. |
| `GOOGLE_GENERATIVE_AI_API_KEY` | https://aistudio.google.com/apikey (the free tier is enough) |
| `SERPER_API_KEY` | https://serper.dev, needed for "Search online" (2,500 free searches) |
| `AUTH_ENABLED` | Sign-in is on unless this is `false` (demo mode, see below) |
| `GOOGLE_AUTH_ENABLED` | `true` to show "Continue with Google" (see step 4) |

### 3. Database and storage

```bash
npx prisma migrate deploy
```

In the Supabase SQL Editor, create the public bucket for clothing images:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('closet', 'closet', true, 10485760, array['image/jpeg','image/png','image/webp']);
```

### 4. Supabase Auth

1. **Authentication → URL Configuration:** set **Site URL** to your production URL, and add these **Redirect URLs**:
   - `http://localhost:3000/**`
   - `https://<your-vercel-domain>/**`
2. **Email/password** is enabled by default. With "Confirm email" on, new users must click the emailed link before they can sign in. Supabase's built-in email sender is rate-limited, so configure custom SMTP for production.
3. **Google (optional):**
   1. Create an OAuth client in Google Cloud Console (APIs & Services → Credentials). Use `https://<project-ref>.supabase.co/auth/v1/callback` as the authorized redirect URI.
   2. In Supabase → Authentication → Providers → Google, enable the provider and paste the client ID and secret.
   3. Set `GOOGLE_AUTH_ENABLED="true"`.

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000. You'll be asked to sign in or create an account (in demo mode you go straight to the closet).

## Demo mode (auth off)

Sign-in is on by default. Setting `AUTH_ENABLED="false"` runs the app without sign-in:

- **Open routes:** every route is open, `/login` redirects to `/closet`, and the proxy never calls Supabase Auth.
- **One shared account:** all data belongs to a single built-in "Dev User" (`src/lib/auth-mode.ts`).
- **Auth code stays in place:** all Supabase Auth code (login page, callback, proxy checks) remains. Remove the variable (or set it to `"true"`) and redeploy to turn sign-in back on.

**Don't launch publicly in demo mode.** Anyone with the URL can view and change the shared closet and use your Gemini and Serper quotas.

## Deploying to Vercel

Add every variable from step 2 in Vercel → Settings → Environment Variables (`DIRECT_URL` isn't needed there), then redeploy. `NEXT_PUBLIC_*` values are built into the bundle, so changing them requires a redeploy.

## Notes

- `src/proxy.ts` (Next.js 16's replacement for `middleware.ts`) refreshes the Supabase session and redirects signed-out visitors away from `/closet` and `/outfits`.
- Images from "Search online" are downloaded server-side through `src/lib/remote-image.ts`. It blocks private and internal addresses (SSRF protection), caps size and time, and re-encodes every image.
- Background removal uses `@imgly/background-removal-node`, which is AGPL-3.0. Replace `src/lib/ai/background.ts` if that license doesn't fit your use.
