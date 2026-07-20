# Google Search Console setup — getShopRally.com

**Owner checklist.** DNS for this domain is on **Porkbun** (see `docs/MARKETING-SITE-GO-LIVE.md`).

Use a Google account you control long-term (e.g. Workspace / `hello@getshoprally.com`).

---

## Recommended: Domain property + DNS TXT (Porkbun)

This covers `getshoprally.com`, `www`, and http/https in one property.

### A. Create the property

1. Open [Google Search Console](https://search.google.com/search-console)
2. **Add property** → choose **Domain**
3. Enter: `getshoprally.com` (no `https://`)
4. Google shows a **TXT record** that looks like:
   - Name/Host: `@` (or blank / root)
   - Type: `TXT`
   - Value: `google-site-verification=……………………`

### B. Add the TXT record in Porkbun

1. Porkbun → Domain → **getshoprally.com** → **DNS**
2. **Add record**
   - Type: `TXT`
   - Host: leave blank or `@` (Porkbun root)
   - Answer / Value: paste the full `google-site-verification=…` string Google gave you
   - TTL: default
3. Save

DNS can take a few minutes to a few hours.

### C. Verify in GSC

1. Back in Search Console → **Verify**
2. When it succeeds, go to **Sitemaps** (left nav)
3. Submit: `https://getshoprally.com/sitemap.xml`
4. Confirm `/` and money pages appear under **Pages** over the next days (not instant)

---

## Backup: URL-prefix + HTML tag (no DNS)

Use this if you cannot edit Porkbun DNS right now.

1. Search Console → **Add property** → **URL prefix** → `https://getshoprally.com`
2. Choose **HTML tag** verification
3. Copy only the **content** token, e.g. from  
   `<meta name="google-site-verification" content="TOKEN_HERE" />`  
   → copy `TOKEN_HERE`
4. In **Vercel** → project `shoprally` → Settings → Environment Variables → Production:
   - Name: `GOOGLE_SITE_VERIFICATION`
   - Value: `TOKEN_HERE`
5. Redeploy production
6. Confirm the homepage HTML includes `google-site-verification`
7. Click **Verify** in GSC
8. Submit sitemap: `https://getshoprally.com/sitemap.xml`

Code already supports this env var via `src/lib/metadata.ts`.

---

## Sitemap "Couldn't fetch" (known)

If GSC shows **Couldn't fetch** for `sitemap.xml`, production middleware was redirecting unknown paths to `/launch` (marketing-only gate). `/sitemap.xml` and `/robots.txt` must stay public in `src/lib/marketing-prod-gate.ts`, and that build must be **deployed** before Google can read the sitemap.

## After verify — mark done here

Update `measurement.md` and `DEPLOYMENT.md` module 05 when:

- [ ] Property verified
- [ ] Sitemap submitted
- [ ] Property name recorded in `PROFILE.md` (e.g. `Domain: getshoprally.com`)

---

## Not this

- **SEO Autopilot** GSC OAuth in the CRM (`GOOGLE_GSC_*` env) is for *shop tenant* SEO later — separate from owning getShopRally.com in Search Console.
