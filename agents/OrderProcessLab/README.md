# Order Process Lab — three-agent test pipeline

**Status:** Isolated experiment — does **not** modify production CRM until you approve merge.

This lab defines an end-to-end **intake → estimate** workflow optimized for speed and usability, informed by your SnagIt captures, screenshots, and competitor research.

---

## The three agents

| # | Agent | Paste prompt | Primary deliverable |
|---|-------|--------------|-------------------|
| **1** | **Design** | [`AGENT-1-DESIGN-CONTINUE.md`](./AGENT-1-DESIGN-CONTINUE.md) | [`ULTIMATE-ORDER-PROCESS-SPEC.md`](./ULTIMATE-ORDER-PROCESS-SPEC.md) |
| **2** | **Test** | [`AGENT-2-TEST-CONTINUE.md`](./AGENT-2-TEST-CONTINUE.md) | [`TEST-RESULTS.md`](./TEST-RESULTS.md) (pass/fail + friction log) |
| **3** | **Record** | [`AGENT-3-RECORD-CONTINUE.md`](./AGENT-3-RECORD-CONTINUE.md) | MP4 in [`output/`](./output/) + [`VIDEO-NOTES.md`](./VIDEO-NOTES.md) |

---

## How to run (recommended order)

### 1. Design agent (new Cursor chat → name **Order Process — Design**)

```
Paste: agents/OrderProcessLab/AGENT-1-DESIGN-CONTINUE.md
Task: Review SnagIt library + research; refine ULTIMATE-ORDER-PROCESS-SPEC if gaps found.
```

**Start here for the spec:** [`OUTPUT.md`](./OUTPUT.md) and [`ULTIMATE-ORDER-PROCESS-SPEC.md`](./ULTIMATE-ORDER-PROCESS-SPEC.md) (v1 already drafted from your library).

### 2. Test agent (new chat → **Order Process — Test**)

```
Paste: agents/OrderProcessLab/AGENT-2-TEST-CONTINUE.md
Task: Execute TEST-SCRIPT.md on localhost:3004; log results to TEST-RESULTS.md.
```

Prerequisite: `npm run dev` on port **3004**.

### 3. Record agent (new chat → **Order Process — Record**)

```
Paste: agents/OrderProcessLab/AGENT-3-RECORD-CONTINUE.md
Task: Run recording script; produce walkthrough MP4 + VIDEO-NOTES.md.
```

```powershell
cd ShopRally
npm run dev
# separate terminal:
node agents/OrderProcessLab/scripts/record-and-email-order-process.mjs --slow
```

Output: `agents/OrderProcessLab/output/order-process-walkthrough-*.webm`  
**Emailed to:** tabish.david@gmail.com when complete (Resend or EML fallback)

---

## Isolation rules

| Allowed | Not allowed (until merge approval) |
|---------|-----------------------------------|
| Edit files under `agents/OrderProcessLab/` | Change `src/components/repair-order/*` production intake |
| Run dev + design-review routes | Merge to main estimate tab |
| Playwright record against `:3004` | Vercel deploy |
| Reference SnagIt paths in docs | Copy competitor trade dress / copy |

**Review surfaces (read-only reference):**

- Intake: FAB → `create-ro-fab.tsx`, `/repair-orders/new`, `/design-review/batch-05-ro-intake`
- Estimate: `/repair-orders/{id}/estimate`, `/design-review/estimate-building?ro={id}`

---

## SnagIt library

Local path: `%LOCALAPPDATA%\TechSmith\SnagIt\DataStore\`

Catalog: [`SNAGIT-LIBRARY.md`](./SNAGIT-LIBRARY.md)

---

## Build state

Track progress: [`BUILD-STATE.md`](./BUILD-STATE.md)
