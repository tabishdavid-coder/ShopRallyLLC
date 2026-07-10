"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Search, Loader2, Plus, Check, X, Phone, ChevronLeft, Send, MoreVertical, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  EstimateLabRemovePartDialog,
  partItemLabel,
} from "@/components/estimate-building/estimate-lab-remove-part-dialog";
import { useEstimateActionToast } from "@/components/repair-order/estimate-action-toast";
import { formatCents } from "@/lib/format";
import { subnavTabTopClass } from "@/lib/subnav-styles";
import { partRetail, type PartTier } from "@/lib/matrix";
import { cn } from "@/lib/utils";
import {
  searchPartsTech,
  startPunchout,
  addPhoneOrderPart,
  importMappedParts,
  markPartsOrdered,
  fetchPartsTechSessionQuote,
} from "@/server/actions/partstech";
import { deletePartLine } from "@/server/actions/estimate";
import type { PartResult } from "@/server/services/partstech";

type MapRow = { part: PartResult; method: "add" | "replace"; jobId: string; replacePartId: string };

export type HubPart = {
  id: string;
  description: string;
  brand: string | null;
  partNumber: string | null;
  quantity: number;
  costCents: number;
  retailCents: number;
  status: "NEEDED" | "QUOTED" | "ORDERED";
  vendor: string | null;
  jobName: string;
};

type Status = "NEEDED" | "QUOTED" | "ORDERED";
type PhoneState = {
  vendor: string; brand: string; description: string; partNumber: string;
  quantity: string; cost: string; retail: string; job: string;
};
const TABS: { key: Status; label: string }[] = [
  { key: "NEEDED", label: "Needed" },
  { key: "QUOTED", label: "Quoted" },
  { key: "ORDERED", label: "Ordered / Received" },
];

export function PartsHub({
  roId,
  jobs,
  parts,
  vehicleLabel,
  specLine,
  partTiers = [],
  variant = "default",
}: {
  roId: string;
  jobs: { id: string; name: string }[];
  parts: HubPart[];
  vehicleLabel: string;
  specLine: string;
  partTiers?: PartTier[];
  variant?: "default" | "hero";
}) {
  const router = useRouter();
  const { toast } = useEstimateActionToast();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"home" | "catalog" | "mapping" | "phone">("home");
  const [tab, setTab] = useState<Status>("NEEDED");
  const [mapping, setMapping] = useState<MapRow[]>([]);
  const [orderPick, setOrderPick] = useState<Record<string, boolean>>({});
  const [removeTarget, setRemoveTarget] = useState<HubPart | null>(null);
  const [committing, startCommit] = useTransition();
  const [ordering, startOrder] = useTransition();
  const [removing, startRemove] = useTransition();

  // Catalog (PartsTech) state.
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PartResult[]>([]);
  const [mode, setMode] = useState<"live" | "mock" | null>(null);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [target, setTarget] = useState("");
  const [punchoutUrl, setPunchoutUrl] = useState<string | null>(null);
  const [booting, setBooting] = useState(false);
  const [searching, startSearch] = useTransition();

  // Phone-order state.
  const empty = { vendor: "", brand: "", description: "", partNumber: "", quantity: "1", cost: "", retail: "", job: "" };
  const [phone, setPhone] = useState(empty);
  const [saving, startSave] = useTransition();

  const [error, setError] = useState<string | null>(null);

  function resetCatalog() {
    setQuery(""); setResults([]); setMode(null); setPicked({}); setTarget(""); setPunchoutUrl(null); setBooting(false);
  }
  function close() {
    setOpen(false); setView("home"); setTab("NEEDED"); resetCatalog(); setPhone(empty); setError(null);
  }

  function launchPartsTech(jobId?: string | null) {
    setError(null);
    resetCatalog();
    if (jobId) setTarget(jobId);
    setOpen(true);
    setView("catalog");
    setBooting(true);
    startPunchout(roId, jobId ?? null).then((res) => {
      setBooting(false);
      if (res.ok && res.mode === "live") setPunchoutUrl(res.redirectUrl);
      else if (!res.ok) setError(res.error);
    });
  }

  /** Job-card PartsTech button (and other surfaces) open the same catalog flow. */
  useEffect(() => {
    function onOpenPartsTech(e: Event) {
      const detail = (e as CustomEvent<{ jobId?: string }>).detail;
      launchPartsTech(detail?.jobId ?? null);
    }
    window.addEventListener("shoprally:open-parts-tech", onOpenPartsTech);
    return () => window.removeEventListener("shoprally:open-parts-tech", onOpenPartsTech);
  }, [roId]);

  // Close + refresh when a live punchout posts its cart back for mapping.
  useEffect(() => {
    if (!open) return;
    function onMsg(e: MessageEvent) {
      const data = e.data as {
        type?: string;
        roId?: string;
        sessionId?: string;
        parts?: PartResult[];
        error?: string;
      } | null;
      if (!data || data.type !== "partstech-quote") return;
      if (data.roId && data.roId !== roId) return;

      if (data.error) {
        setError(data.error);
        return;
      }
      if (data.parts?.length) {
        setMapping(
          data.parts.map((p) => ({
            part: p,
            method: "add" as const,
            jobId: target || "",
            replacePartId: "",
          })),
        );
        setView("mapping");
        setTab("QUOTED");
        resetCatalog();
        return;
      }
      if (data.sessionId) {
        void fetchPartsTechSessionQuote(data.sessionId, roId).then((res) => {
          if (res.ok && res.parts.length) {
            setMapping(
              res.parts.map((p) => ({
                part: p,
                method: "add" as const,
                jobId: target || "",
                replacePartId: "",
              })),
            );
            setView("mapping");
            setTab("QUOTED");
            resetCatalog();
          } else if (!res.ok) setError(res.error);
        });
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [open, roId, jobs, target]);

  function search() {
    if (!query.trim()) return;
    setError(null);
    startSearch(async () => {
      const res = await searchPartsTech(roId, query);
      if (res.ok) { setResults(res.parts); setMode(res.mode); }
      else setError(res.error);
    });
  }
  function toggle(p: PartResult) {
    setPicked((cur) => {
      const next = { ...cur };
      if (next[p.partstechId] != null) delete next[p.partstechId];
      else next[p.partstechId] = 1;
      return next;
    });
  }
  const pickedList = results.filter((p) => picked[p.partstechId] != null);

  // Catalog → Parts Mapping step (Replace vs Add to job per part).
  function goToMapping() {
    if (!pickedList.length) return;
    setMapping(pickedList.map((p) => ({ part: p, method: "add", jobId: target || "", replacePartId: "" })));
    setError(null);
    setView("mapping");
  }
  function saveMapping() {
    if (!mapping.length) return;
    setError(null);
    startCommit(async () => {
      const res = await importMappedParts({
        roId,
        items: mapping.map((m) => ({
          partstechId: m.part.partstechId, brand: m.part.brand, partNumber: m.part.partNumber, description: m.part.description,
          quantity: picked[m.part.partstechId] ?? 1, costCents: m.part.costCents, retailCents: m.part.retailCents, vendor: m.part.supplier,
          method: m.method,
          jobId: m.method === "add" ? m.jobId || null : null,
          replacePartId: m.method === "replace" ? m.replacePartId || undefined : undefined,
        })),
      });
      if (res.ok) { setView("home"); setTab("QUOTED"); resetCatalog(); setMapping([]); router.refresh(); }
      else setError(res.error);
    });
  }

  // QUOTED tab → Submit Order (Quoted → Ordered/Received).
  function submitOrder() {
    const ids = Object.keys(orderPick).filter((k) => orderPick[k]);
    if (!ids.length) return;
    setError(null);
    startOrder(async () => {
      const res = await markPartsOrdered(ids);
      if (res.ok) { setOrderPick({}); setTab("ORDERED"); router.refresh(); }
      else setError(res.error);
    });
  }

  function confirmRemove() {
    if (!removeTarget) return;
    const lineId = removeTarget.id;
    startRemove(async () => {
      const res = await deletePartLine(lineId);
      if (res.ok) {
        toast("success", "Part removed");
        setOrderPick((c) => {
          const next = { ...c };
          delete next[lineId];
          return next;
        });
        setRemoveTarget(null);
        router.refresh();
      } else {
        toast("error", res.error);
      }
    });
  }

  function savePhone() {
    setError(null);
    startSave(async () => {
      const res = await addPhoneOrderPart({
        roId,
        jobId: phone.job || null,
        vendor: phone.vendor || undefined,
        brand: phone.brand || undefined,
        description: phone.description,
        partNumber: phone.partNumber || undefined,
        quantity: Math.max(1, parseInt(phone.quantity) || 1),
        costCents: Math.round((parseFloat(phone.cost) || 0) * 100),
        retailCents: Math.round((parseFloat(phone.retail) || 0) * 100),
      });
      if (res.ok) { setView("home"); setTab("QUOTED"); setPhone(empty); router.refresh(); }
      else setError(res.error);
    });
  }

  const counts: Record<Status, number> = {
    NEEDED: parts.filter((p) => p.status === "NEEDED").length,
    QUOTED: parts.filter((p) => p.status === "QUOTED").length,
    ORDERED: parts.filter((p) => p.status === "ORDERED").length,
  };
  const tabParts = parts.filter((p) => p.status === tab);
  const showRowActions = tab !== "ORDERED";

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <Button
        variant="outline"
        size="sm"
        className={cn(
          "relative gap-1.5",
          variant === "hero"
            ? "ro-hero-action-btn h-7 rounded-md border-brand-navy/20 bg-white px-2.5 text-xs font-semibold text-brand-navy shadow-sm hover:border-brand-light/60 hover:bg-brand-light/15"
            : "",
        )}
        onClick={() => {
          setView("home");
          setOpen(true);
        }}
      >
        <ShoppingCart className={cn("size-4", variant === "hero" && "size-3.5 text-brand-light")} /> Parts Hub
        {parts.length ? (
          <span className="ml-0.5 rounded-full bg-brand-red px-1.5 text-[10px] font-bold text-white">{parts.length}</span>
        ) : null}
      </Button>

      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 h-screen w-screen max-w-none translate-x-0 translate-y-0 grid-rows-[auto_1fr] gap-0 rounded-none border-0 bg-card p-0 sm:max-w-none"
      >
        {/* Vehicle header */}
        <div className="flex items-center gap-3 bg-primary px-5 py-3 text-primary-foreground">
          <ShoppingCart className="size-7 shrink-0 rounded-full bg-white/15 p-1.5" />
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-[15px] font-semibold text-primary-foreground">
              Parts Hub: {vehicleLabel}
            </DialogTitle>
            <DialogDescription className="truncate text-xs text-primary-foreground/85">
              Odometer In: —{specLine ? `  |  ${specLine}` : ""}
            </DialogDescription>
          </div>
          <button onClick={close} aria-label="Close" className="rounded p-1 text-primary-foreground/80 hover:bg-white/15 hover:text-white">
            <X className="size-5" />
          </button>
        </div>

        <div className="grid min-h-0 grid-rows-[auto_1fr_auto] overflow-hidden">
          {view === "home" ? (
            <>
              {/* Launch actions */}
              <div className="flex items-center gap-2 border-b px-5 py-3">
                <Button onClick={() => launchPartsTech()} className="gap-1.5">
                  <ShoppingCart className="size-4" /> PartsTech
                </Button>
                <Button variant="outline" onClick={() => { setError(null); setView("phone"); }} className="gap-1.5">
                  <Phone className="size-4" /> Enter Phone Order
                </Button>
                {error ? <span className="ml-3 text-sm text-destructive">{error}</span> : null}
                {tab === "QUOTED" && counts.QUOTED > 0 ? (
                  <Button
                    onClick={submitOrder}
                    disabled={ordering || !Object.values(orderPick).some(Boolean)}
                    className="ml-auto gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {ordering ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    Submit Order ({Object.values(orderPick).filter(Boolean).length})
                  </Button>
                ) : null}
              </div>

              {/* Parts list for the active status tab */}
              <div className="min-h-0 overflow-auto px-5 py-4">
                {tabParts.length === 0 ? (
                  <div className="flex h-full min-h-40 items-center justify-center text-sm text-muted-foreground">
                    No {TABS.find((t) => t.key === tab)?.label.toLowerCase()} parts for this repair order.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        {tab === "QUOTED" ? <th className="w-8 px-2" /> : null}
                        <th className="px-2 py-1.5 text-left font-medium">Part</th>
                        <th className="px-2 py-1.5 text-left font-medium">Job</th>
                        <th className="px-2 py-1.5 text-left font-medium">Vendor</th>
                        <th className="w-14 px-2 py-1.5 text-right font-medium">Qty</th>
                        <th className="w-24 px-2 py-1.5 text-right font-medium">Cost</th>
                        <th className="w-24 px-2 py-1.5 text-right font-medium">Retail</th>
                        {showRowActions ? <th className="w-10 px-2" aria-label="Actions" /> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {tabParts.map((p) => (
                        <tr key={p.id} className="border-b last:border-0">
                          {tab === "QUOTED" ? (
                            <td className="px-2 py-1.5">
                              <input
                                type="checkbox"
                                checked={!!orderPick[p.id]}
                                onChange={(e) => setOrderPick((c) => ({ ...c, [p.id]: e.target.checked }))}
                                aria-label="Select for order"
                              />
                            </td>
                          ) : null}
                          <td className="px-2 py-1.5">
                            {p.brand ? <span className="font-medium">{p.brand} </span> : null}{p.description}
                            {p.partNumber ? <span className="text-xs text-muted-foreground"> · {p.partNumber}</span> : null}
                          </td>
                          <td className="px-2 py-1.5 text-muted-foreground">{p.jobName}</td>
                          <td className="px-2 py-1.5 text-muted-foreground">{p.vendor ?? "—"}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{p.quantity}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{formatCents(p.costCents)}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{formatCents(p.retailCents)}</td>
                          {showRowActions ? (
                            <td className="px-2 py-1.5">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 text-muted-foreground hover:text-foreground"
                                    disabled={removing}
                                    aria-label={`Actions for ${p.description}`}
                                  >
                                    <MoreVertical className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => setRemoveTarget(p)}
                                  >
                                    <Trash2 className="size-3.5" />
                                    Remove
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Bottom status tabs */}
              <div className="flex items-stretch border-t">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    aria-current={tab === t.key ? "page" : undefined}
                    className={subnavTabTopClass(
                      tab === t.key,
                      "flex-1 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide",
                    )}
                  >
                    {t.label} {counts[t.key] ? `(${counts[t.key]})` : ""}
                  </button>
                ))}
              </div>
            </>
          ) : view === "catalog" ? (
            <CatalogView
              booting={booting}
              punchoutUrl={punchoutUrl}
              query={query}
              setQuery={setQuery}
              search={search}
              searching={searching}
              results={results}
              mode={mode}
              picked={picked}
              toggle={toggle}
              setPicked={setPicked}
              pickedList={pickedList}
              target={target}
              setTarget={setTarget}
              jobs={jobs}
              onContinue={goToMapping}
              error={error}
              onBack={() => { resetCatalog(); setView("home"); }}
            />
          ) : view === "mapping" ? (
            <MappingView
              mapping={mapping}
              setMapping={setMapping}
              jobs={jobs}
              existingParts={parts}
              committing={committing}
              error={error}
              onBack={() => setView("catalog")}
              onSave={saveMapping}
            />
          ) : (
            <PhoneOrderView
              phone={phone}
              setPhone={setPhone}
              jobs={jobs}
              partTiers={partTiers}
              save={savePhone}
              saving={saving}
              error={error}
              onBack={() => setView("home")}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>

    <EstimateLabRemovePartDialog
      open={removeTarget != null}
      onOpenChange={(next) => {
        if (!next && !removing) setRemoveTarget(null);
      }}
      itemLabel={removeTarget ? partItemLabel(removeTarget) : ""}
      pending={removing}
      onConfirm={confirmRemove}
    />
    </>
  );
}

function CatalogView(props: {
  booting: boolean; punchoutUrl: string | null; query: string; setQuery: (s: string) => void; search: () => void;
  searching: boolean; results: PartResult[]; mode: "live" | "mock" | null; picked: Record<string, number>;
  toggle: (p: PartResult) => void; setPicked: (f: (c: Record<string, number>) => Record<string, number>) => void;
  pickedList: PartResult[]; target: string; setTarget: (s: string) => void; jobs: { id: string; name: string }[];
  onContinue: () => void; error: string | null; onBack: () => void;
}) {
  const p = props;
  if (p.punchoutUrl) {
    return (
      <div className="row-span-3 flex min-h-0 flex-col">
        <iframe src={p.punchoutUrl} title="PartsTech catalog" className="min-h-0 w-full flex-1 border-0" />
      </div>
    );
  }
  return (
    <div className="row-span-3 flex min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-5 py-3">
        <Button variant="ghost" size="sm" onClick={p.onBack} className="gap-1"><ChevronLeft className="size-4" /> Back</Button>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={p.query}
            onChange={(e) => p.setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); p.search(); } }}
            placeholder="Search parts — e.g. front brake pads, alternator"
            className="bg-card pl-9 pr-24"
          />
          <Button onClick={p.search} disabled={p.searching || !p.query.trim()} size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 gap-1.5">
            {p.searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Search
          </Button>
        </div>
        {p.mode ? <Badge variant={p.mode === "live" ? "default" : "secondary"}>{p.mode === "live" ? "PartsTech (Sandbox)" : "Sample catalog"}</Badge> : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-5 py-3">
        {p.error ? <p className="mb-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{p.error}</p> : null}
        {p.booting ? <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Connecting to PartsTech…</div> : null}
        {!p.booting && p.results.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-center text-sm text-muted-foreground"><Search className="mb-2 size-7 opacity-30" /> Search for a part to see results.</div>
        ) : null}
        <ul className="space-y-2">
          {p.results.map((r) => {
            const sel = p.picked[r.partstechId] != null;
            return (
              <li key={r.partstechId} className={`flex items-center gap-3 rounded-lg border p-3 ${sel ? "border-primary bg-primary/5" : ""}`}>
                <button onClick={() => p.toggle(r)} className={`flex size-5 shrink-0 items-center justify-center rounded border ${sel ? "border-primary bg-primary text-white" : "border-input"}`} aria-label={sel ? "Deselect" : "Select"}>
                  {sel ? <Check className="size-3.5" /> : null}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{r.brand ? <span>{r.brand} · </span> : null}{r.description}</div>
                  <div className="text-xs text-muted-foreground">{r.partNumber}{r.supplier ? ` · ${r.supplier}` : ""}{r.availability ? ` · ${r.availability}` : ""}</div>
                </div>
                {sel ? (
                  <Input type="number" min={1} value={p.picked[r.partstechId]} onChange={(e) => p.setPicked((cur) => ({ ...cur, [r.partstechId]: Math.max(1, parseInt(e.target.value) || 1) }))} className="h-8 w-16 text-right" aria-label="Quantity" />
                ) : null}
                <div className="w-24 shrink-0 text-right text-sm">
                  <div className="font-semibold tabular-nums">{formatCents(r.retailCents)}</div>
                  <div className="text-xs text-muted-foreground tabular-nums">cost {formatCents(r.costCents)}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex items-center gap-3 border-t bg-card px-5 py-3">
        <span className="text-sm text-muted-foreground">{p.pickedList.length} selected</span>
        <Button onClick={p.onContinue} disabled={!p.pickedList.length} className="ml-auto gap-1.5">
          Review &amp; map {p.pickedList.length || ""} part{p.pickedList.length === 1 ? "" : "s"}
        </Button>
      </div>
    </div>
  );
}

function MappingView(props: {
  mapping: MapRow[];
  setMapping: (m: MapRow[]) => void;
  jobs: { id: string; name: string }[];
  existingParts: HubPart[];
  committing: boolean;
  error: string | null;
  onBack: () => void;
  onSave: () => void;
}) {
  const { mapping, setMapping } = props;
  const setRow = (i: number, patch: Partial<MapRow>) =>
    setMapping(mapping.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className="row-span-3 flex min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-5 py-3">
        <Button variant="ghost" size="sm" onClick={props.onBack} className="gap-1"><ChevronLeft className="size-4" /> Back</Button>
        <span className="text-sm font-semibold">Parts Mapping</span>
        <span className="text-xs text-muted-foreground">Replace an existing part, or add the quoted part to a job.</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-5 py-3">
        {props.error ? <p className="mb-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{props.error}</p> : null}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="px-2 py-1.5 text-left font-medium">Quoted part</th>
              <th className="px-2 py-1.5 text-left font-medium">Mapping</th>
              <th className="px-2 py-1.5 text-left font-medium">Target</th>
            </tr>
          </thead>
          <tbody>
            {mapping.map((r, i) => (
              <tr key={r.part.partstechId} className="border-b last:border-0 align-top">
                <td className="px-2 py-2">
                  <div className="font-medium">{r.part.brand ? `${r.part.brand} ` : ""}{r.part.description}</div>
                  <div className="text-xs text-muted-foreground">{r.part.partNumber} · {formatCents(r.part.retailCents)}</div>
                </td>
                <td className="px-2 py-2">
                  <div className="flex gap-3 text-sm">
                    <label className="flex items-center gap-1">
                      <input type="radio" checked={r.method === "add"} onChange={() => setRow(i, { method: "add" })} /> Add to job
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="radio" checked={r.method === "replace"} onChange={() => setRow(i, { method: "replace" })} /> Replace part
                    </label>
                  </div>
                </td>
                <td className="px-2 py-2">
                  {r.method === "add" ? (
                    <select value={r.jobId} onChange={(e) => setRow(i, { jobId: e.target.value })} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm">
                      <option value="">New &ldquo;Parts&rdquo; job</option>
                      {props.jobs.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
                    </select>
                  ) : (
                    <select value={r.replacePartId} onChange={(e) => setRow(i, { replacePartId: e.target.value })} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm">
                      <option value="">Select part to replace…</option>
                      {props.existingParts.map((ep) => (
                        <option key={ep.id} value={ep.id}>{ep.description} ({ep.jobName})</option>
                      ))}
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 border-t bg-card px-5 py-3">
        <Button variant="outline" onClick={props.onBack} disabled={props.committing}>Cancel</Button>
        <Button
          onClick={props.onSave}
          disabled={props.committing || mapping.some((r) => r.method === "replace" && !r.replacePartId)}
          className="ml-auto gap-1.5"
        >
          {props.committing ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Save {mapping.length} part{mapping.length === 1 ? "" : "s"} to estimate
        </Button>
      </div>
    </div>
  );
}

function PhoneOrderView(props: {
  phone: PhoneState;
  setPhone: (p: PhoneState) => void;
  jobs: { id: string; name: string }[];
  partTiers?: PartTier[];
  save: () => void;
  saving: boolean;
  error: string | null;
  onBack: () => void;
}) {
  const { phone, setPhone, partTiers = [] } = props;
  const set = (k: keyof typeof phone, v: string) => {
    const next = { ...phone, [k]: v };
    if (k === "cost" && partTiers.length) {
      const costCents = Math.round((parseFloat(v) || 0) * 100);
      next.retail = (partRetail(costCents, partTiers) / 100).toFixed(2);
    }
    setPhone(next);
  };
  return (
    <div className="row-span-3 mx-auto w-full max-w-2xl space-y-3 overflow-auto p-6">
      <Button variant="ghost" size="sm" onClick={props.onBack} className="gap-1"><ChevronLeft className="size-4" /> Back</Button>
      <h3 className="text-base font-semibold">Enter Phone Order</h3>
      {props.error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{props.error}</p> : null}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vendor"><Input value={phone.vendor} onChange={(e) => set("vendor", e.target.value)} placeholder="e.g. NAPA" /></Field>
        <Field label="Brand"><Input value={phone.brand} onChange={(e) => set("brand", e.target.value)} placeholder="e.g. Bosch" /></Field>
        <Field label="Description *"><Input value={phone.description} onChange={(e) => set("description", e.target.value)} placeholder="Part description" /></Field>
        <Field label="Part #"><Input value={phone.partNumber} onChange={(e) => set("partNumber", e.target.value)} /></Field>
        <Field label="Qty"><Input type="number" min={1} value={phone.quantity} onChange={(e) => set("quantity", e.target.value)} /></Field>
        <Field label="Cost ($)"><Input type="number" step="0.01" value={phone.cost} onChange={(e) => set("cost", e.target.value)} /></Field>
        <Field label="Retail ($)"><Input type="number" step="0.01" value={phone.retail} onChange={(e) => set("retail", e.target.value)} /></Field>
        <Field label="Add to job">
          <select value={phone.job} onChange={(e) => set("job", e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
            <option value="">New &ldquo;Parts&rdquo; job</option>
            {props.jobs.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
          </select>
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={props.onBack} disabled={props.saving}>Cancel</Button>
        <Button onClick={props.save} disabled={props.saving || !phone.description.trim()} className="gap-1.5">
          {props.saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add part
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 text-sm">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
