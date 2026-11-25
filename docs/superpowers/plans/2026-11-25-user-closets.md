# User Closets Implementation Plan

**Goal:** Anyone can create a public (view-only to others) or private closet, listed on the homepage.

**Architecture:** One closet per `User` row. `src/lib/auth.ts` resolves the *active* closet (example
closet from the cookie, else the session user); existing actions keep using it. Profile actions use
the *session* user only. `/c/[slug]` renders a closet without any actions.

**Spec:** `docs/superpowers/specs/2026-11-25-user-closets-design.md`

## Global constraints
- Additive migration only; the local `.env` points at the production database.
- Closet names 2–40 chars, age 13–120, 40 AI calls and 20 searches per closet per day, 5 new closets
  per IP per day, avatar 512 px WebP. UI in English. Button copy: **CREATE YOUR CLOSET NOW!**

## Review focus
- A closet without email/password must not lose access through Sign out → sign-out is refused.
- Private closet's slug opened by a stranger → same not-found as an unknown slug.
- A crafted request (PRIVATE without credentials, age 5, foreign item id) → rejected on the server.
- Non-Latin closet name → still gets a working slug.
- Owner browsing an example closet → settings still act on the owner's closet.

## Tasks
- [x] 1. Schema + migration: `Visibility`, `Gender`, closet fields, `UsageCounter`, RLS on all tables.
- [x] 2. `src/lib/validations/closet-profile.ts` (schemas, `slugify`) with `node --test` tests first.
- [x] 3. `src/lib/usage.ts`: `consumeUsage(key, limit)`, `clientKey()`; wire into AI/search actions.
- [x] 4. `auth-mode.ts`, `auth.ts`, `proxy.ts`, `/closets/[owner]`: session vs active closet.
- [x] 5. `src/actions/closet-profile.ts`: create, update, add login, delete; `actions/auth.ts` sign-out guard.
- [x] 6. `/create`, `/settings`, login form.
- [x] 7. `/c/[slug]` view-only closet.
- [x] 8. Homepage gallery + button + how-it-works, `/guide`, header, empty-closet tips.
- [ ] 9. README/CLAUDE.md, type-check, lint, build, browser walkthrough, rollout.
