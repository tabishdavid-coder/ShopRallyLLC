# Order Process Lab — build state

**Created:** 2026-07-05  
**Isolation:** Experimental — separate from ShopRallyCRM / Estimate Building merge work

---

## Milestones

| Date | Agent | Milestone | Status |
|------|-------|-----------|--------|
| 2026-07-05 | Setup | Three-agent prompts + spec v1 + SnagIt catalog | ✅ Done |
| 2026-07-05 | Setup | TEST-SCRIPT + Playwright recorder script | ✅ Done |
| — | Agent 1 | Spec refined after latest SnagIt review | ⏳ Pending |
| — | Agent 2 | TEST-RESULTS.md first pass | ⏳ Pending |
| 2026-07-05 | Agent 3 | Full walkthrough recorded + emailed (Outlook) | ✅ Done |
| — | User | Approve merge to production | ⏳ Pending |

---

## SnagIt Tier 1 reviewed for v1 spec

- [x] `2BBF85F0` AutoLeap intake
- [x] `7ABF2D71` Tekmetric intake
- [x] `7B6B4614` AutoLeap estimate RO #10246
- [x] `A52B9681` Inline job edit
- [x] `FA2ED0E7` Right rail backlog
- [ ] Jul 5 AM batch (`D25F0F07`, `B7504AC5`, etc.) — Agent 1 optional pass

---

## Known gaps vs production (intentional lab backlog)

| Gap | Spec section | Production today |
|-----|--------------|------------------|
| Draft RO# on sheet open | Future streamlining | Creates on submit only |
| Plate → skip vehicle step | T2 test | Partial — depends on search |
| Transfer / active RO modals | Phase 3 edge cases | May be incomplete |
| Right rail workflow chip | Phase 6 dedup | Not shipped |

---

## Output artifacts

| Artifact | Path |
|----------|------|
| Owner summary | `OUTPUT.md` |
| Process spec | `ULTIMATE-ORDER-PROCESS-SPEC.md` |
| Test results | `TEST-RESULTS.md` (empty until Agent 2) |
| Video | `output/order-process-walkthrough-*.webm` |
| Video notes | `VIDEO-NOTES.md` (empty until Agent 3) |
| Email manifest | `output/email-delivery-manifest.json` |
| Email recipient | `tabish.david@gmail.com` |
