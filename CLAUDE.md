# FitCheck AI — Project Guidelines & Workflow

## Overview
FitCheck AI is a Next.js (App Router) application for smart closet management, background removal, AI clothing tagging, and outfit creation.

## Tech Stack
- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Backend & Auth**: Supabase (Auth, PostgreSQL DB, Storage)
- **Database ORM**: Prisma 7
- **AI & External APIs**: Google Gemini (`@google/genai`), Serper.dev (Image search)
- **Styling**: Tailwind CSS, Lucide Icons, Framer Motion
- **Deployment**: Vercel

## Key Architecture & Code Conventions
- **Routing**: Next.js 16 uses `src/proxy.ts` (NOT `middleware.ts`).
- **Supabase Config**: ALWAYS read environment variables via `src/lib/supabase/config.ts`. Do NOT read `process.env.NEXT_PUBLIC_SUPABASE_URL` directly in client/server code.
- **Images**: Background removal cutouts MUST be saved as WebP (70–90 KB) to prevent Vercel 4.5 MB request payload limits.
- **AI Limits**: Requests to Gemini are capped at 60s timeout with automatic fallback to `gemini-flash-lite-latest` if quota is hit.
- **Demo Mode**: Controlled via `AUTH_ENABLED` in `auth-mode.ts`. When disabled, queries fall back to the shared "Dev User".

## Development Commands
- `npm run dev` — Start local development server
- `npx prisma generate` — Re-generate Prisma Client after schema changes
- `npx tsc --noEmit` — Type-check TypeScript without building
- `npm run build` — Test production build locally

## Instructions for Claude Code / Claude
1. **Always verify build**: Run `npx tsc --noEmit` or `npm run build` after making major component or backend changes.
2. **Environment Variables**: Never hardcode keys or URLs. Never leave quotes or spaces when generating `.env` defaults.
3. **Git Cleanliness**: Before completing a task, write concise Git commit messages and push to `main`.
4. **Efficiency**: Keep code edits minimal and precise. Avoid re-writing unchanged files.