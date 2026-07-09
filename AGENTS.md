<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ShopRally agents

> **Canonical CRM dev:** open the **`ShopRally/`** folder (`C:\Users\tabis\OneDrive\Documents\ClaudeCode\ShopRally`), run `npm run dev` → **http://localhost:3031**. See `docs/SHOPRALLY-DEV.md`.
>
> The sibling **`karvio/`** folder is a legacy platform fork — do not develop shop CRM there.

## ShopRally marketing website — **primary** (2026-07-09)

**Landing, pricing, features, launch, demo** → this repo only until the user says otherwise.

| | |
|---|---|
| **Routes** | `/`, `/pricing`, `/features`, `/launch`, `/demo` |
| **Components** | `src/components/marketing-site/`, `src/components/pricing/` |
| **Copy** | `docs/GROWTH-POSITIONING.md`, `src/lib/plans.ts` |
| **Rule** | `.cursor/rules/shoprally-marketing-primary.mdc` |

Do not use **`karvio/`** for marketing work unless explicitly syncing.

---

## ShopRallyCRM (Dev 3031) — active

**Purpose:** Build and maintain the merged ShopRally CRM — AutopilotShell + Tekmetric IA + jobs layout toggle.

| | |
|---|---|
| **Workspace root** | `shoprally/` |
| **Dev URL** | http://localhost:3031 |
| **Start command** | `npm run dev` |
| **Agent prompt** | `agents/ShopRallyCRM/CONTINUE.md` |
| **Build state** | `agents/ShopRallyCRM/BUILD-STATE.md` |
| **Cursor skill** | `.cursor/skills/shoprally-crm/SKILL.md` |
| **Cursor rule** | `.cursor/rules/dev-3004-shoprally-crm.mdc` |

### How to start ShopRallyCRM in a new chat

1. Open workspace root: `C:\Users\tabis\OneDrive\Documents\ClaudeCode\ShopRally`
2. Name the chat **ShopRallyCRM**
3. Paste the full contents of `agents/ShopRallyCRM/CONTINUE.md`
4. Add your task at the bottom under **Current task**

### Do not confuse with

- **`karvio/` sibling folder** — legacy platform fork; CRM work belongs in **`ShopRally/`** only
- **:3000** — `_archive-repairpilot/` (legacy reference)
- **:3001** — old `CrmShell` chrome (`npm run dev:3001` only for comparison)
- **Dev 3004** — legacy dev port with design mode (`npm run dev:3004`)
- **Dev 3031** — this agent; always use port **3031** (`npm run dev`)

---

## Website Code (ShopSite) — active

**Purpose:** Customer microsites, shop website editor, Master CRM websites pipeline.

| | |
|---|---|
| **Agent prompt** | `agents/WebsiteCode/CONTINUE.md` |
| **Build state** | `agents/WebsiteCode/BUILD-STATE.md` |
| **Cursor skill** | `.cursor/skills/website-code/SKILL.md` |
| **Cursor rule** | `.cursor/rules/website-code-agent.mdc` |
| **Dev URLs** | `/marketing/website`, `/platform/websites`, `/sites/{slug}` |

### How to start Website Code in a new chat

1. Open workspace root: `shoprally/`
2. Name the chat **Website Code**
3. Paste the full contents of `agents/WebsiteCode/CONTINUE.md`
4. Add your task under **Current task**

### Do not confuse with

- **SEO Autopilot** — GSC, crawl, SEO tabs (`agents/SeoAutopilot/`)
- **ShopRally marketing site** — `src/app/(marketing)/` (ShopRally.com, not tenant sites)

---

## Order Process Lab — experimental (isolated test)

**Purpose:** Three-agent pipeline to design, test, and record the ultimate **intake → estimate** workflow — separate from production until approved.

| | |
|---|---|
| **Owner summary** | `agents/OrderProcessLab/OUTPUT.md` |
| **Agent 1 (Design)** | `agents/OrderProcessLab/AGENT-1-DESIGN-CONTINUE.md` |
| **Agent 2 (Test)** | `agents/OrderProcessLab/AGENT-2-TEST-CONTINUE.md` |
| **Agent 3 (Record)** | `agents/OrderProcessLab/AGENT-3-RECORD-CONTINUE.md` |
| **Process spec** | `agents/OrderProcessLab/ULTIMATE-ORDER-PROCESS-SPEC.md` |
| **SnagIt catalog** | `agents/OrderProcessLab/SNAGIT-LIBRARY.md` |

### How to start (three separate chats)

1. **Order Process — Design** → paste Agent 1 CONTINUE
2. **Order Process — Test** → paste Agent 2 CONTINUE (after `npm run dev`)
3. **Order Process — Record** → paste Agent 3 CONTINUE + run `node agents/OrderProcessLab/scripts/record-order-process.mjs`

Does **not** modify shop CRM production code until user approves merge.
