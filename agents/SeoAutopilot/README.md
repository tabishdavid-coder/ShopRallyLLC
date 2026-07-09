# SEO Autopilot agent (background build)

Dedicated agent to finish **SEO Autopilot** without blocking your main **ShopRallyCRM / Dev 3004** UI chat.

## Is this possible?

**Yes.** Use one of these patterns:

| Mode | Best for | Touches your local :3004? |
|------|----------|---------------------------|
| **Separate Cursor chat** | Same machine, you keep UI chat open | No — if agent follows scope rules below |
| **Cursor Cloud Agent** | True background build on a feature branch | No — runs remotely; you merge when ready |
| **Git worktree** (optional) | Hard isolation on one PC | No — second folder, second branch |

The agent must **not** run `npm run dev`, restart servers, or edit files outside the SEO allowlist.

## Quick start (separate chat)

1. Workspace root: `C:\Users\tabis\OneDrive\Documents\ClaudeCode\ShopRally`
2. Name the chat **SEO Autopilot**
3. Paste the full contents of `agents/SeoAutopilot/CONTINUE.md`
4. Add your priority under **Current task** (or leave default backlog)

## Quick start (Cloud Agent)

1. Open Cursor → Cloud Agents → New agent
2. Paste `agents/SeoAutopilot/CONTINUE.md` + note: **work on branch `cursor/seo-autopilot-full-0d70`**
3. Agent commits/pushes to that branch only — open a PR when done
4. Your local `:3004` dev session stays untouched until you merge

## Branch policy

- **Base:** `main` (or your current integration branch)
- **Feature branch:** `cursor/seo-autopilot-full-0d70` (or continue `cursor/seo-autopilot-tabs-0d70`)
- **Merge:** Only after PR review — never force-push to `main`

## Files in this folder

| File | Purpose |
|------|---------|
| `CONTINUE.md` | Master agent prompt — paste into SEO Autopilot chats |
| `BUILD-STATE.md` | SEO-only progress tracker |
| `MERGE.md` | Owner merge checklist (migrations, QA, Stripe) |
| `CHANGELOG.md` | Branch summary for PR / merge review |
| `README.md` | This file |

## Do not confuse with

- **ShopRallyCRM agent** (`agents/ShopRallyCRM/CONTINUE.md`) — general CRM UI on :3004
- **SEO Autopilot agent** — scoped to Growth Engine → SEO only

Both can run in parallel if they respect their file allowlists.
