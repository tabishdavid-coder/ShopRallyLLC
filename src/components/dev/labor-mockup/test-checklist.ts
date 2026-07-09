/** Session checklist for /dev/labor-mockup — tracks what the tester has clicked. */

export type ChecklistItemId =
  | "search-flat"
  | "search-clears-trail"
  | "quick-chip"
  | "browse-cold"
  | "trail-truncate"
  | "facet-chips"
  | "facet-lists"
  | "qualifier-band"
  | "results-table"
  | "related-labor"
  | "detail-panel"
  | "add-to-job"
  | "add-to-cart"
  | "cart-footer"
  | "add-to-estimate"
  | "path-1"
  | "path-2"
  | "path-3"
  | "free-browse"
  | "ui-toggle"
  | "click-counter"
  | "miller-toggle"
  | "qualifier-variant"
  | "recent-menu";

export type ChecklistItem = {
  id: ChecklistItemId;
  label: string;
  hint: string;
};

export const LABOR_MOCKUP_CHECKLIST: ChecklistItem[] = [
  { id: "search-flat", label: "Search — flat results table", hint: 'Type "rear brake pads"' },
  { id: "search-clears-trail", label: "Search clears browse trail", hint: "Search while in browse mode" },
  { id: "quick-chip", label: "Quick chip jump", hint: "Click Front brakes or Struts" },
  { id: "browse-cold", label: "Browse → cold drill", hint: "Browse → → Brakes → Brake Pads" },
  { id: "trail-truncate", label: "Trail click-to-truncate", hint: "Click an earlier trail segment" },
  { id: "facet-chips", label: "Facet chips sync trail (Mock v3)", hint: "Swap Front ↔ Rear chip" },
  { id: "facet-lists", label: "Facet lists drill (Option A)", hint: "Toggle Option A, pick from list" },
  { id: "qualifier-band", label: "Qualifier band", hint: "Path 1 or Path 3" },
  { id: "results-table", label: "Middle pane results table", hint: "Reach jobs on any path" },
  { id: "related-labor", label: "Related labor expand", hint: "Detail → Related labor ▸" },
  { id: "detail-panel", label: "Right detail preview", hint: "Click a result row" },
  { id: "add-to-job", label: "Add to job (detail)", hint: "Add to job button" },
  { id: "add-to-cart", label: "Add to cart (table +)", hint: "Click + on a row" },
  { id: "cart-footer", label: "Cart footer count + total hours", hint: "Add 2+ lines to cart" },
  { id: "add-to-estimate", label: "Add to estimate →", hint: "Footer CTA when cart has items" },
  { id: "path-1", label: "Path 1 — brake pads tab", hint: "Path 1 tab" },
  { id: "path-2", label: "Path 2 — struts tab", hint: "Path 2 tab" },
  { id: "path-3", label: "Path 3 — heater core tab", hint: "Path 3 tab" },
  { id: "free-browse", label: "Free browse tab", hint: "Free browse tab" },
  { id: "ui-toggle", label: "Mock v3 ↔ Option A toggle", hint: "Switch UI mode" },
  { id: "click-counter", label: "Click counter increments", hint: "Any click interaction" },
  { id: "miller-toggle", label: "Miller toggle (⌘⇧M stub)", hint: "Click ⌘⇧M badge or press shortcut" },
  { id: "qualifier-variant", label: "Heater core AC variant pick", hint: "Path 3 → pick w/o AC row" },
  { id: "recent-menu", label: "Recent ▾ menu", hint: "Open Recent dropdown" },
];

const STORAGE_KEY = "labor-mockup-checklist-v1";

export function loadChecklistState(): Set<ChecklistItemId> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as ChecklistItemId[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

export function saveChecklistState(done: Set<ChecklistItemId>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...done]));
  } catch {
    /* ignore quota errors in dev */
  }
}

export function clearChecklistState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
