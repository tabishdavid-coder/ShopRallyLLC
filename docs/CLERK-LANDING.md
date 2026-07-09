# Clerk post-auth landing

ShopRally uses a **single canonical entry** (`/home`) so Clerk does not need role-specific redirect URLs. Role routing happens server-side after sign-in.

## Flow

```
Sign in (Clerk)
    → /home  (NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL)
    → appHomePath(isPlatformAdmin)
         ├─ platform admin → /platform  (Master CRM)
         └─ shop staff      → /dashboard (Shop CRM)
```

Implementation: `src/app/(app)/home/page.tsx` + `src/lib/platform-routing.ts`.

## Environment variables

Add to `.env` / Vercel when Clerk is enabled:

```env
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...

# Post-auth — always /home (role split is server-side)
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/home
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/home

# Optional route overrides (defaults: /sign-in, /sign-up)
# NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
# NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

CLERK_WEBHOOK_SIGNING_SECRET=whsec_...
```

`ShopRallyClerkProvider` reads `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` and `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` (default `/home`).

## Clerk Dashboard (production)

1. **Paths** — Sign-in URL `/sign-in`, Sign-up URL `/sign-up` (or match env overrides).
2. **Allowed redirect URLs** — include your app origin + `/home`, `/platform`, `/dashboard`.
3. **Webhooks** — point to `/api/webhooks/clerk` for user + org membership sync.
4. **Organizations** — shop tenancy maps `Shop.clerkOrgId` ↔ Clerk org (see `src/server/clerk-org.ts`).

## Stub auth (no Clerk keys)

When `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is unset:

- Session uses demo/stub user (`PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_EMAILS`).
- Visiting `/home` still routes platform admins to `/platform` and shop context to `/dashboard`.
- No Clerk UI — safe for local `:3004` dev.

## Do not

- Set platform admins’ Clerk redirect directly to `/platform` unless you drop the shared `/home` router — shop staff would need a separate Clerk application or custom redirect logic.
- Change shop-owner landing — they must stay on `/dashboard` (via `/home` only).

## Related

- Auth baseline review: `/design-review/task-02-auth`
- Settings → Integrations Clerk row: `/settings/integrations`
- Merge guide: `agents/MasterCRM/MERGE.md`
- Batch 6 review: `/design-review/batch-06-clerk-merge`
