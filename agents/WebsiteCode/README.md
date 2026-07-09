# Website Code agent (ShopSite + Customer websites)

Dedicated agent for **ShopSite microsites**, the **shop-side editor**, and **Master CRM website pipeline** — without blocking ShopRallyCRM Dev 3004 UI work.

## Is this possible?

**Yes.** Same patterns as `agents/SeoAutopilot/` and `agents/MasterCRM/`:

| Mode | Best for |
|------|----------|
| **This chat / new Cursor chat** | Paste `CONTINUE.md` — name chat **Website Code** |
| **Parallel chat** | Run alongside ShopRallyCRM on `:3004` if allowlists are respected |
| **Feature branch** | `feature/website-code` from `main` |

## Quick start (this workspace)

1. Workspace root: `shoprally/`
2. Name the chat **Website Code**
3. Paste **`agents/WebsiteCode/CONTINUE.md`**
4. Add your task under **Current task**

## Dev URLs (port 3004)

| Surface | URL |
|---------|-----|
| ShopSite editor | http://localhost:3004/marketing/website |
| Public microsite | http://localhost:3004/sites/{slug} (requires `published: true`) |
| Master CRM pipeline | http://localhost:3004/platform/websites |
| Design hub (merged CRM) | http://localhost:3004/design-mode?design=open |

**Demo slug:** `in-and-out-autohaus` — seed is **unpublished** until you publish in editor or launch from platform.

## Files in this folder

| File | Purpose |
|------|---------|
| `CONTINUE.md` | Master agent prompt — paste into Website Code chats |
| `BUILD-STATE.md` | Website-only progress tracker |
| `README.md` | This file |

## Do not confuse with

- **ShopRallyCRM** — shop CRM shell, RO workspace, dashboard (`agents/ShopRallyCRM/`)
- **SEO Autopilot** — GSC, crawl, SEO Autopilot tabs (`agents/SeoAutopilot/`) — overlaps domain/GSC; coordinate before editing shared actions
- **ShopRally marketing site** — `src/app/(marketing)/` — ShopRally.com product pages, not tenant ShopSites
- **Master CRM (general)** — billing, shops table (`agents/MasterCRM/`) — website pipeline UI is in scope here

## Architecture doc

`docs/website-seo-service.md` — primary product/architecture reference.
