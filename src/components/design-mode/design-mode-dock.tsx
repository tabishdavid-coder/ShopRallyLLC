"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, CircleDot, Copy, MousePointer2, Palette, X } from "lucide-react";

import { DesignAnnotateOverlay, type AnnotateTool } from "@/components/design-mode/design-annotate-overlay";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { clearHighlights, type PickedElement } from "@/lib/design-annotate";
import { designModeHref, MERGED_CRM_SURFACES } from "@/lib/design-mode-merged-crm";
import { designModeOpenFromSearch, isDesignModeEnabled, SHOPRALLY_CRM_DEV_PORT } from "@/lib/design-mode-tokens";
import { cn } from "@/lib/utils";

type Tab = "annotate" | "tokens" | "crm";

function buildBrief(pathname: string, note: string, picks: PickedElement[]) {
  const lines = [
    `# Design brief`,
    ``,
    `Route: ${pathname}`,
    note.trim() ? `Note: ${note.trim()}` : null,
    picks.length ? `Elements:` : null,
    ...picks.map((p, i) => {
      const parts = [`${i + 1}. <${p.tag}>`];
      if (p.id) parts.push(`#${p.id}`);
      if (p.classes) parts.push(`.${p.classes.replace(/\s+/g, ".")}`);
      if (p.text) parts.push(`"${p.text}"`);
      return parts.join(" ");
    }),
  ].filter(Boolean);
  return lines.join("\n");
}

const DESIGN_DOCK_SESSION_KEY = "shoprally-design-dock";

/** Dev-only right-side design panel — annotate UI without blocking CRM navigation. */
export function DesignModeDock() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("annotate");
  const [annotateTool, setAnnotateTool] = useState<AnnotateTool>("circle");
  const [marking, setMarking] = useState(false);
  const [picks, setPicks] = useState<PickedElement[]>([]);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fromQuery = designModeOpenFromSearch(`?${searchParams.toString()}`);
    if (fromQuery) {
      setOpen(true);
      return;
    }

    if (!isDesignModeEnabled()) return;

    const sessionPref = sessionStorage.getItem(DESIGN_DOCK_SESSION_KEY);
    if (sessionPref === "closed") return;

    setOpen(true);
    const sp = new URLSearchParams(searchParams.toString());
    if (sp.get("design") !== "open") {
      sp.set("design", "open");
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  function closePanel() {
    setOpen(false);
    setMarking(false);
    clearHighlights();
    sessionStorage.setItem(DESIGN_DOCK_SESSION_KEY, "closed");
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("design");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function openPanel() {
    setOpen(true);
    sessionStorage.setItem(DESIGN_DOCK_SESSION_KEY, "open");
    const sp = new URLSearchParams(searchParams.toString());
    if (sp.get("design") !== "open") {
      sp.set("design", "open");
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    }
  }

  function togglePanel() {
    if (open) closePanel();
    else openPanel();
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "D" && e.shiftKey && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        togglePanel();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, pathname, router, searchParams]);

  const stopMarking = useCallback(() => {
    setMarking(false);
    clearHighlights();
  }, []);

  const startMarking = useCallback(() => {
    setTab("annotate");
    setOpen(false);
    setMarking(true);
  }, []);

  const onPick = useCallback((next: PickedElement[]) => {
    clearHighlights();
    setPicks(next);
    setMarking(false);
    setOpen(true);
  }, []);

  const clearSelection = useCallback(() => {
    clearHighlights();
    setPicks([]);
  }, []);

  async function copyBrief() {
    const text = buildBrief(pathname, note, picks);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  if (!isDesignModeEnabled()) return null;

  const annotateActive = marking && !open && tab === "annotate";

  return (
    <>
      <DesignAnnotateOverlay active={annotateActive} tool={annotateTool} onPick={onPick} onDone={stopMarking} />

      <div className="fixed bottom-5 right-5 z-[90] flex flex-col items-end gap-2">
        {marking ? (
          <span className="rounded-full bg-brand-navy px-3 py-1.5 text-xs font-medium text-white shadow-lg">
            Marking…
          </span>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant={open || marking ? "default" : "outline"}
          className={cn("shadow-lg", (open || marking) && "bg-brand-navy")}
          onClick={() => {
            if (marking) {
              stopMarking();
              openPanel();
              return;
            }
            togglePanel();
          }}
        >
          <Palette className="mr-1.5 size-4" />
          Design
        </Button>
      </div>

      {open ? (
        <aside className="fixed bottom-0 right-0 top-0 z-[89] flex w-full max-w-sm flex-col border-l bg-background pt-10 shadow-xl sm:pt-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-brand-navy">Design mode · :{SHOPRALLY_CRM_DEV_PORT}</p>
              <p className="text-xs text-muted-foreground">Ctrl+Shift+D · ShopRallyCRM dev</p>
            </div>
            <Button type="button" size="icon" variant="ghost" onClick={closePanel} aria-label="Close design panel">
              <X className="size-4" />
            </Button>
          </div>

          <div className="flex border-b">
            {(["annotate", "crm", "tokens"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={cn(
                  "flex-1 px-2 py-2 text-[10px] font-semibold uppercase tracking-wide sm:text-xs",
                  tab === t ? "border-b-2 border-brand-light text-brand-navy" : "text-muted-foreground",
                )}
                onClick={() => setTab(t)}
              >
                {t === "annotate" ? "Point & ask" : t === "crm" ? "Merged CRM" : "Colors"}
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {tab === "annotate" ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Route: <span className="font-mono text-foreground">{pathname}</span>
                </p>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={annotateTool === "circle" ? "default" : "outline"}
                    className={cn("flex-1", annotateTool === "circle" && "bg-brand-navy")}
                    onClick={() => setAnnotateTool("circle")}
                  >
                    <CircleDot className="mr-1 size-3.5" />
                    Circle
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={annotateTool === "click" ? "default" : "outline"}
                    className={cn("flex-1", annotateTool === "click" && "bg-brand-navy")}
                    onClick={() => setAnnotateTool("click")}
                  >
                    <MousePointer2 className="mr-1 size-3.5" />
                    Click
                  </Button>
                </div>

                <Button type="button" className="w-full bg-brand-navy" onClick={startMarking}>
                  Mark on page
                </Button>

                <Textarea
                  placeholder="What should change? (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="text-sm"
                />

                {picks.length ? (
                  <div className="rounded-md border bg-muted/30 p-3 text-xs">
                    <p className="mb-2 font-semibold text-brand-navy">Selected ({picks.length})</p>
                    <ul className="space-y-1 text-muted-foreground">
                      {picks.map((p, i) => (
                        <li key={i} className="font-mono">
                          &lt;{p.tag}&gt;{p.id ? `#${p.id}` : ""}{" "}
                          {p.text ? `"${p.text.slice(0, 60)}"` : ""}
                        </li>
                      ))}
                    </ul>
                    <Button type="button" size="sm" variant="ghost" className="mt-2 h-7 px-2" onClick={clearSelection}>
                      Clear selection
                    </Button>
                  </div>
                ) : null}

                <Button type="button" variant="outline" className="w-full gap-1.5" onClick={copyBrief}>
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? "Copied!" : "Copy brief for Cursor"}
                </Button>
              </>
            ) : tab === "crm" ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Merged CRM on <code className="rounded bg-muted px-1">main</code> — open live surfaces with design
                  panel pinned.
                </p>
                <ul className="space-y-1.5">
                  {MERGED_CRM_SURFACES.map((surface) => (
                    <li key={surface.id}>
                      <Link
                        href={designModeHref(surface.href)}
                        className="block rounded-md border px-2.5 py-2 text-xs transition-colors hover:border-brand-navy/30 hover:bg-brand-light/10"
                        onClick={() => setOpen(false)}
                      >
                        <span className="font-medium text-brand-navy">{surface.title}</span>
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">{surface.href}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href={designModeHref("/design-mode")}
                  className="block text-center text-xs font-medium text-brand-navy hover:underline"
                  onClick={() => setOpen(false)}
                >
                  Open full design hub →
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Live color tokens are disabled in this build. Use browser devtools on{" "}
                <code className="rounded bg-muted px-1">globals.css</code> brand variables, or add{" "}
                <code className="rounded bg-muted px-1">?design=tokens</code> when token editing is restored.
              </p>
            )}
          </div>
        </aside>
      ) : null}
    </>
  );
}
