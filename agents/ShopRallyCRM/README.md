# ShopRallyCRM agent

Dev 3004 — merged ShopRally CRM build (`:3000` layout + `:3001` colors/features).

## Quick start

1. Workspace root must be **`shoprally/`**
2. Run `npm run dev` → http://localhost:3004
3. New Cursor chat → name it **ShopRallyCRM**
4. Paste `CONTINUE.md` as the first message, then add your task

## Files in this folder

| File | Purpose |
|------|---------|
| `CONTINUE.md` | Master agent prompt — paste into new ShopRallyCRM chats |
| `BUILD-STATE.md` | Living doc of what's done and what's next |
| `README.md` | This file |

## Locked layout

- `AppSidebar` + `TopBar` + `NAV_GROUPS` — NOT `CrmShell`
- See `.cursor/rules/dev-3004-shoprally-crm.mdc` for full rules
