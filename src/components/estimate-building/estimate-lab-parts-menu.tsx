"use client";

import { useEffect, useState, useTransition, type ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog as SheetPrimitive } from "radix-ui";
import {
  ArrowLeft,
  CircleDot,
  Loader2,
  Package,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  Truck,
  Wrench,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetOverlay, SheetPortal } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/format";
import type { IntegrationConnectionState } from "@/lib/integrations";
import {
  searchPartsTech,
  startPunchout,
  importMappedParts,
  addPhoneOrderPart,
  fetchPartsTechSessionQuote,
} from "@/server/actions/partstech";
import type { PartResult } from "@/server/services/partstech";
import { useEstimateActionToast } from "@/components/repair-order/estimate-action-toast";
import { EstimateLabPartsPipeline } from "@/components/estimate-building/estimate-lab-parts-pipeline";
import {
  EstimateLabPartsMappingPanel,
  buildPartsMappingRows,
  type PartsMappingRow,
} from "@/components/estimate-building/estimate-lab-parts-mapping-panel";
import { EstimateLabServiceSelect } from "@/components/estimate-building/estimate-lab-service-select";
import type { EstimateLabPartsJob } from "@/components/estimate-building/estimate-lab-parts-provider";
import type { HubPart } from "@/lib/hub-parts";
import type { PartsMenuMode } from "@/components/estimate-building/estimate-lab-parts-provider";

type View = "home" | "partstech" | "manual" | "stub" | "mapping";

type VendorDef = {
  id: View;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  state?: IntegrationConnectionState;
  stubTitle?: string;
  disabled?: boolean;
};

function useIsMobileSheet() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return mobile;
}

function connectionBadge(state: IntegrationConnectionState) {
  switch (state) {
    case "connected":
      return { label: "Connected", className: "border-emerald-200 bg-emerald-50 text-emerald-800" };
    case "configured":
      return { label: "Configured", className: "border-brand-light/50 bg-brand-light/15 text-brand-navy" };
    case "mock":
      return { label: "Sample catalog", className: "border-amber-200 bg-amber-50 text-amber-900" };
    default:
      return { label: "Not connected", className: "border-border bg-muted text-muted-foreground" };
  }
}

function VendorCard({
  icon: Icon,
  title,
  description,
  state,
  onClick,
  disabled,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  state?: IntegrationConnectionState;
  onClick: () => void;
  disabled?: boolean;
}) {
  const badge = state ? connectionBadge(state) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-h-[132px] flex-col rounded-xl border border-brand-navy/15 bg-white p-4 text-left shadow-sm transition-colors",
        "hover:border-brand-navy/35 hover:bg-brand-light/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/30",
        disabled && "cursor-not-allowed opacity-60 hover:border-brand-navy/15 hover:bg-white",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-navy/10 text-brand-navy">
          <Icon className="size-5" />
        </span>
        {badge ? (
          <Badge variant="outline" className={cn("text-[10px]", badge.className)}>
            {badge.label}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            Coming soon
          </Badge>
        )}
      </div>
      <p className="mt-3 text-sm font-semibold text-brand-navy">{title}</p>
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </button>
  );
}

function VendorRailItem({
  icon: Icon,
  title,
  state,
  active,
  onClick,
  disabled,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  state?: IntegrationConnectionState;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const badge = state ? connectionBadge(state) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full flex-col gap-1 rounded-lg border px-2.5 py-2.5 text-left transition-colors",
        active
          ? "border-brand-navy/40 bg-brand-navy text-white shadow-sm"
          : "border-transparent bg-white/80 text-brand-navy hover:border-brand-navy/20 hover:bg-white",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span className="flex items-center gap-2">
        <Icon className={cn("size-4 shrink-0", active ? "text-brand-light" : "text-brand-navy")} />
        <span className="truncate text-xs font-semibold">{title}</span>
      </span>
      {badge ? (
        <Badge
          variant="outline"
          className={cn(
            "w-fit text-[9px]",
            active ? "border-white/30 bg-white/10 text-white" : badge.className,
          )}
        >
          {badge.label}
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className={cn(
            "w-fit text-[9px]",
            active ? "border-white/30 bg-white/10 text-white/80" : "text-muted-foreground",
          )}
        >
          Coming soon
        </Badge>
      )}
    </button>
  );
}

/** Lab parts ordering — animated slide-over with vendor rail + catalog/manual flows. */
export function EstimateLabPartsMenu({
  open,
  onOpenChange,
  roId,
  jobs,
  hubParts,
  vehicleLabel,
  specLine,
  canEdit,
  initialJobId,
  initialMode = "home",
  partstechState,
  weldonState,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roId: string;
  jobs: EstimateLabPartsJob[];
  hubParts: HubPart[];
  vehicleLabel: string;
  specLine: string;
  canEdit: boolean;
  initialJobId: string | null;
  initialMode?: PartsMenuMode;
  partstechState: IntegrationConnectionState;
  weldonState: IntegrationConnectionState;
}) {
  const router = useRouter();
  const isMobile = useIsMobileSheet();
  const { toast } = useEstimateActionToast();
  const [view, setView] = useState<View>("home");
  const [stubTitle, setStubTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [manualJobId, setManualJobId] = useState("");
  const [description, setDescription] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [cost, setCost] = useState("");
  const [savingManual, startManual] = useTransition();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PartResult[]>([]);
  const [catalogMode, setCatalogMode] = useState<"live" | "mock" | null>(null);
  const [targetJobId, setTargetJobId] = useState("");
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [mapping, setMapping] = useState<PartsMappingRow[]>([]);
  const [searching, startSearch] = useTransition();
  const [importing, startImport] = useTransition();
  const [committing, startCommit] = useTransition();
  const [booting, setBooting] = useState(false);
  const [catalogLaunched, setCatalogLaunched] = useState(false);
  const [supplier, setSupplier] = useState("");

  const defaultJobId = initialJobId ?? jobs[0]?.id ?? "";
  const manualDisabled = !canEdit || jobs.length === 0;

  const vendors: VendorDef[] = [
    {
      id: "partstech",
      icon: ShoppingCart,
      title: "PartsTech",
      description: "Search supplier catalogs, quote parts, and import lines to a job.",
      state: partstechState,
    },
    {
      id: "manual",
      icon: Phone,
      title: "Manual ordering",
      description: "Enter a phone order or off-catalog part — supplier, cost, and qty.",
      state: "connected",
      disabled: manualDisabled,
    },
    {
      id: "stub",
      icon: Truck,
      title: "Wholesale catalog",
      description: "Connect a wholesale parts network for live pricing and ordering.",
      stubTitle: "Wholesale catalog",
    },
    {
      id: "stub",
      icon: Wrench,
      title: "Tire wholesale",
      description: "Order tires and wheel goods from your wholesale tire account.",
      state: weldonState === "inactive" ? undefined : weldonState,
      stubTitle: "Tire wholesale",
    },
  ];

  const lookupVendors = vendors.filter((v) => v.id !== "manual");
  const gridVendors = initialMode === "lookup" ? lookupVendors : vendors;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setStubTitle("");
    setManualJobId(defaultJobId);
    setDescription("");
    setPartNumber("");
    setQuantity("1");
    setCost("");
    setSupplier("");
    resetCatalog();
    if (initialMode === "manual") {
      setView(manualDisabled ? "home" : "manual");
    } else if (initialMode === "lookup") {
      setView("home");
    } else {
      setView("home");
    }
  }, [open, defaultJobId, initialMode, manualDisabled]);

  function resetCatalog() {
    setQuery("");
    setResults([]);
    setCatalogMode(null);
    setTargetJobId(defaultJobId);
    setPicked({});
    setMapping([]);
    setBooting(false);
    setCatalogLaunched(false);
  }

  function close() {
    onOpenChange(false);
  }

  function goHome() {
    setView("home");
    setError(null);
    resetCatalog();
  }

  function selectVendor(v: VendorDef) {
    setError(null);
    if (v.id === "partstech") {
      setView("partstech");
      setTargetJobId(defaultJobId);
      return;
    }
    if (v.id === "manual") {
      if (manualDisabled) return;
      setView("manual");
      setManualJobId(defaultJobId);
      return;
    }
    if (v.stubTitle) {
      setStubTitle(v.stubTitle);
      setView("stub");
    }
  }

  function togglePart(part: PartResult) {
    setPicked((cur) => {
      const next = { ...cur };
      if (next[part.partstechId] != null) delete next[part.partstechId];
      else next[part.partstechId] = 1;
      return next;
    });
  }

  function applyDefaultJobToPicked(jobId: string) {
    setTargetJobId(jobId);
  }

  function goToMapping() {
    if (!pickedList.length) return;
    const defaultJob = targetJobId || defaultJobId || jobs[0]?.id || "";
    setMapping(buildPartsMappingRows(pickedList, picked, defaultJob));
    setError(null);
    setView("mapping");
  }

  function openMappingFromQuote(
    parts: PartResult[],
    quantities: Record<string, number> = {},
  ) {
    if (!parts.length) return;
    const defaultJob = targetJobId || defaultJobId || jobs[0]?.id || "";
    const qty =
      Object.keys(quantities).length > 0
        ? quantities
        : Object.fromEntries(parts.map((p) => [p.partstechId, 1]));
    setMapping(buildPartsMappingRows(parts, qty, defaultJob));
    setView("mapping");
    setError(null);
    toast("success", `${parts.length} part${parts.length === 1 ? "" : "s"} from vendor — assign to services`);
  }

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
      if (!data || data.roId !== roId) return;

      if (data.type === "partstech-quote") {
        if (data.error) {
          setError(data.error);
          toast("error", data.error);
          return;
        }
        if (data.parts?.length) {
          openMappingFromQuote(data.parts);
          return;
        }
        if (data.sessionId) {
          startImport(async () => {
            const res = await fetchPartsTechSessionQuote(data.sessionId!, roId);
            if (res.ok && res.parts.length) openMappingFromQuote(res.parts);
            else toast("error", res.ok ? "Quote was empty." : res.error);
          });
        }
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- openMappingFromQuote is stable enough for punchout return
  }, [open, roId]);

  function saveMapping() {
    if (!mapping.length) return;
    setError(null);
    startCommit(async () => {
      const res = await importMappedParts({
        roId,
        items: mapping.map((m) => ({
          partstechId: m.part.partstechId,
          brand: m.part.brand,
          partNumber: m.part.partNumber,
          description: m.part.description,
          quantity: m.quantity,
          costCents: m.part.costCents,
          retailCents: m.part.retailCents,
          vendor: m.part.supplier,
          method: m.method,
          jobId: m.method === "add" ? m.jobId || null : null,
          replacePartId: m.method === "replace" ? m.replacePartId || undefined : undefined,
        })),
      });
      if (res.ok) {
        toast("success", `${mapping.length} quoted part${mapping.length === 1 ? "" : "s"} added to services`);
        close();
        router.refresh();
      } else {
        setError(res.error);
        toast("error", res.error);
      }
    });
  }

  function runSearch() {
    if (!query.trim()) return;
    setError(null);
    startSearch(async () => {
      const res = await searchPartsTech(roId, query);
      if (res.ok) {
        setResults(res.parts);
        setCatalogMode(res.mode);
      } else {
        setError(res.error);
      }
    });
  }

  function launchPunchout() {
    setError(null);
    setBooting(true);
    startPunchout(roId, targetJobId || null).then((res) => {
      setBooting(false);
      if (res.ok && res.mode === "live") {
        setCatalogLaunched(true);
        toast("success", "PartsTech catalog opened in a new window.");
        window.open(res.redirectUrl, "_blank", "noopener,noreferrer");
      } else if (res.ok) {
        setCatalogLaunched(true);
        toast("success", "Sample catalog ready — search below or import quoted parts.");
      } else {
        setError(res.error);
      }
    });
  }

  const pickedList = results.filter((p) => picked[p.partstechId] != null);

  function saveManual() {
    if (!canEdit) return;
    const jobId = manualJobId || jobs[0]?.id;
    if (!jobId) {
      setError("Select a job for this part.");
      return;
    }
    setError(null);
    startManual(async () => {
      const costCents = Math.round((parseFloat(cost) || 0) * 100);
      const res = await addPhoneOrderPart({
        roId,
        jobId,
        vendor: supplier.trim() || undefined,
        description: description.trim(),
        partNumber: partNumber.trim() || undefined,
        quantity: Math.max(1, parseInt(quantity, 10) || 1),
        costCents,
        retailCents: costCents,
      });
      if (res.ok) {
        toast("success", "Part quoted on job");
        close();
        router.refresh();
      } else {
        setError(res.error);
        toast("error", res.error);
      }
    });
  }

  function openVendor(mode: "lookup" | "manual", jobId?: string | null) {
    setError(null);
    if (jobId) {
      setManualJobId(jobId);
      setTargetJobId(jobId);
    }
    if (mode === "lookup") {
      setView("partstech");
      if (jobId) setTargetJobId(jobId);
      return;
    }
    if (manualDisabled) return;
    setView("manual");
    if (jobId) setManualJobId(jobId);
  }

  const headerTitle =
    view === "home"
      ? initialMode === "lookup"
        ? "Parts lookup"
        : initialMode === "manual"
          ? "Manual ordering"
          : "Parts ordering"
      : view === "partstech"
        ? "Parts lookup"
        : view === "mapping"
          ? "Assign to services"
          : view === "manual"
          ? "Manual ordering"
          : stubTitle;

  const sheetSide = isMobile ? "bottom" : "right";
  const showRail = !isMobile && view !== "stub" && view !== "mapping";
  const showMobileHomeGrid = isMobile && view === "home" && initialMode !== "home";
  const showDesktopLookupGrid = !isMobile && view === "home" && initialMode === "lookup";
  const showPipelineHome = view === "home" && initialMode === "home";

  const footerVisible =
    (view === "manual" || (view === "partstech" && pickedList.length > 0)) && canEdit;

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <SheetPortal>
        <SheetOverlay className="bg-black/45 backdrop-blur-[1px] duration-300 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <SheetPrimitive.Content
          aria-describedby={undefined}
          data-side={sheetSide}
          className={cn(
            "fixed z-50 flex flex-col gap-0 overflow-hidden bg-white p-0 shadow-2xl outline-none transition duration-300 ease-out",
            "data-open:animate-in data-closed:animate-out data-open:fade-in-0 data-closed:fade-out-0",
            sheetSide === "right" &&
              "inset-y-0 right-0 h-full w-full border-l border-brand-navy/10 sm:max-w-[min(44rem,calc(100vw-1rem))] data-open:slide-in-from-right data-closed:slide-out-to-right",
            sheetSide === "bottom" &&
              "inset-x-0 bottom-0 max-h-[min(92dvh,900px)] w-full rounded-t-2xl border-t border-brand-navy/10 data-open:slide-in-from-bottom data-closed:slide-out-to-bottom",
          )}
        >
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-brand-navy/10 bg-brand-navy px-3 py-2.5 text-white">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {isMobile && view !== "home" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-white hover:bg-white/10 hover:text-white"
                  onClick={() => (view === "mapping" ? setView("partstech") : goHome())}
                  aria-label="Back"
                >
                  <ArrowLeft className="size-4" />
                </Button>
              ) : (
                <Package className="size-4 shrink-0 text-brand-light" aria-hidden />
              )}
              <div className="min-w-0">
                <SheetPrimitive.Title className="truncate text-sm font-semibold text-white">
                  {headerTitle}
                </SheetPrimitive.Title>
                <p className="truncate text-xs text-white/70">
                  {vehicleLabel}
                  {specLine ? ` · ${specLine}` : ""}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-white hover:bg-white/10 hover:text-white"
              onClick={close}
              aria-label="Close parts panel"
            >
              <X className="size-4" />
            </Button>
          </header>

          <div className="flex min-h-0 flex-1 overflow-hidden">
            {showRail ? (
              <aside
                className="hidden w-[11.5rem] shrink-0 flex-col gap-1.5 overflow-y-auto border-r border-brand-navy/10 bg-slate-100/90 p-2 md:flex"
                aria-label="Part suppliers"
              >
                <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Source
                </p>
                {vendors.map((v) => (
                  <VendorRailItem
                    key={v.title}
                    icon={v.icon}
                    title={v.title}
                    state={v.state}
                    active={v.id !== "stub" ? view === v.id : false}
                    disabled={v.disabled}
                    onClick={() => selectVendor(v)}
                  />
                ))}
              </aside>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/80 p-4">
              {showPipelineHome ? (
                <EstimateLabPartsPipeline
                  parts={hubParts}
                  jobs={jobs}
                  canEdit={canEdit}
                  filterJobId={null}
                  layout="compact"
                />
              ) : null}

              {showDesktopLookupGrid ? (
                <>
                  <p className="mb-1 text-sm font-semibold text-brand-navy">Where is this part sourced from?</p>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Pick a lookup channel — catalog search imports supplier, part number, and cost onto the
                    job.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {gridVendors.map((v) => (
                      <VendorCard
                        key={v.title}
                        icon={v.icon}
                        title={v.title}
                        description={v.description}
                        state={v.state}
                        disabled={v.disabled}
                        onClick={() => selectVendor(v)}
                      />
                    ))}
                  </div>
                  {initialJobId ? (
                    <p className="mt-4 text-xs text-brand-navy/80">
                      Assigning to{" "}
                      <span className="font-semibold">
                        {jobs.find((j) => j.id === initialJobId)?.name ?? "selected job"}
                      </span>
                    </p>
                  ) : null}
                </>
              ) : null}

              {showMobileHomeGrid ? (
                <>
                  <p className="mb-3 text-sm text-muted-foreground">
                    {initialMode === "lookup"
                      ? "Where is this part sourced from? Pick a lookup channel to search catalogs and import lines."
                      : "Choose how to source parts — catalog search, phone order, or manual entry."}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {gridVendors.map((v) => (
                      <VendorCard
                        key={v.title}
                        icon={v.icon}
                        title={v.title}
                        description={v.description}
                        state={v.state}
                        disabled={v.disabled}
                        onClick={() => selectVendor(v)}
                      />
                    ))}
                  </div>
                  {!canEdit ? (
                    <p className="mt-4 rounded-lg border border-border bg-white px-3 py-2 text-xs text-muted-foreground">
                      This estimate is read-only — you can browse suppliers but cannot add lines.
                    </p>
                  ) : jobs.length === 0 ? (
                    <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      Add a job to the estimate before ordering parts.
                    </p>
                  ) : null}
                </>
              ) : null}

              {view === "partstech" ? (
                <div className="space-y-4">
                  {targetJobId ? (
                    <div className="rounded-lg border border-brand-navy/15 bg-brand-light/10 px-3 py-2 text-xs text-brand-navy">
                      Importing to job{" "}
                      <span className="font-semibold">
                        {jobs.find((j) => j.id === targetJobId)?.name ?? "selected job"}
                      </span>
                    </div>
                  ) : null}

                  {catalogLaunched ? (
                    <div className="rounded-lg border border-brand-light/50 bg-brand-light/10 px-3 py-2.5 text-sm text-brand-navy">
                      <p className="font-medium">Add parts from PartsTech</p>
                      <p className="mt-0.5 text-xs text-brand-navy/80">
                        After you submit a quote or order in PartsTech, return here — search below or pick
                        quoted parts, then add them to the job.
                      </p>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[200px] flex-1 space-y-1">
                      <Label htmlFor="lab-pt-job" className="text-xs text-muted-foreground">
                        Default service for new picks
                      </Label>
                      <EstimateLabServiceSelect
                        value={targetJobId || jobs[0]?.id || ""}
                        jobs={jobs}
                        disabled={!canEdit}
                        onValueChange={applyDefaultJobToPicked}
                      />
                    </div>
                    <Button
                      type="button"
                      className="gap-1.5 bg-brand-navy hover:bg-brand-navy/90"
                      disabled={booting || !canEdit}
                      onClick={launchPunchout}
                    >
                      {booting ? <Loader2 className="size-4 animate-spin" /> : <ShoppingCart className="size-4" />}
                      Open catalog
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative min-w-0 flex-1">
                      <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                      <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && runSearch()}
                        placeholder="Search part number or description"
                        className="h-9 bg-white pl-9"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-brand-navy/25 text-brand-navy"
                      disabled={searching || !query.trim()}
                      onClick={runSearch}
                    >
                      {searching ? <Loader2 className="size-4 animate-spin" /> : "Search"}
                    </Button>
                  </div>

                  {catalogMode ? (
                    <Badge variant="outline" className="text-[10px]">
                      {catalogMode === "live" ? "Live catalog" : "Sample catalog"}
                    </Badge>
                  ) : null}

                  {results.length > 0 ? (
                    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-white">
                      {results.map((p) => {
                        const sel = picked[p.partstechId] != null;
                        return (
                          <li key={p.partstechId}>
                            <button
                              type="button"
                              onClick={() => togglePart(p)}
                              className={cn(
                                "flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                                sel ? "bg-brand-light/15 ring-1 ring-inset ring-brand-navy/20" : "hover:bg-muted/40",
                              )}
                            >
                              <CircleDot
                                className={cn(
                                  "mt-0.5 size-4 shrink-0",
                                  sel ? "text-brand-navy" : "text-muted-foreground/40",
                                )}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block font-medium text-foreground">{p.description}</span>
                                <span className="block text-xs text-muted-foreground">
                                  {p.brand} · {p.partNumber} · {p.supplier} · {formatCents(p.costCents)} cost
                                </span>
                              </span>
                              {sel ? (
                                <Input
                                  type="number"
                                  min={1}
                                  value={picked[p.partstechId]}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) =>
                                    setPicked((cur) => ({
                                      ...cur,
                                      [p.partstechId]: Math.max(1, parseInt(e.target.value, 10) || 1),
                                    }))
                                  }
                                  className="h-8 w-16 shrink-0 text-right"
                                  aria-label="Quantity"
                                />
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="rounded-lg border border-dashed border-border bg-white px-4 py-8 text-center text-sm text-muted-foreground">
                      Search the catalog or open the full PartsTech punchout for this vehicle.
                    </p>
                  )}

                  {partstechState === "inactive" ? (
                    <p className="text-xs text-muted-foreground">
                      Connect PartsTech in{" "}
                      <Link href="/settings/integrations" className="font-medium text-brand-navy hover:underline">
                        Settings → Integrations
                      </Link>{" "}
                      — sample catalog works in the lab without credentials.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {view === "manual" ? (
                <div className="mx-auto max-w-md space-y-3 rounded-xl border border-border bg-white p-4">
                  <p className="text-xs text-muted-foreground">
                    Enter and track a phone order or off-catalog part — assign to a job below.
                  </p>
                  <div className="space-y-1">
                    <Label htmlFor="lab-manual-job">Service</Label>
                    <EstimateLabServiceSelect
                      value={manualJobId || jobs[0]?.id || ""}
                      jobs={jobs}
                      disabled={!canEdit}
                      onValueChange={setManualJobId}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lab-manual-supplier">Supplier</Label>
                    <Input
                      id="lab-manual-supplier"
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                      placeholder="e.g. NAPA, local wholesaler"
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lab-manual-desc">Description</Label>
                    <Input
                      id="lab-manual-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Brake fluid — DOT 4"
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="lab-manual-pn">Part number</Label>
                      <Input
                        id="lab-manual-pn"
                        value={partNumber}
                        onChange={(e) => setPartNumber(e.target.value)}
                        placeholder="Optional"
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="lab-manual-qty">Qty</Label>
                      <Input
                        id="lab-manual-qty"
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lab-manual-cost">Unit cost ($)</Label>
                    <Input
                      id="lab-manual-cost"
                      inputMode="decimal"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      placeholder="0.00"
                      disabled={!canEdit}
                    />
                    <p className="text-[11px] text-muted-foreground">Retail is calculated from your parts matrix.</p>
                  </div>
                </div>
              ) : null}

              {view === "mapping" ? (
                <EstimateLabPartsMappingPanel
                  rows={mapping}
                  onRowsChange={setMapping}
                  jobs={jobs}
                  existingParts={hubParts}
                  saving={committing}
                  error={error}
                  onBack={() => setView("partstech")}
                  onSave={saveMapping}
                />
              ) : null}

              {view === "stub" ? (
                <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
                  <span className="flex size-14 items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy">
                    <Package className="size-7" />
                  </span>
                  <p className="text-sm font-semibold text-brand-navy">{stubTitle}</p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Supplier connection is on the roadmap. Use PartsTech or manual ordering for this estimate.
                  </p>
                  <Button type="button" variant="outline" className="border-brand-navy/25" onClick={goHome}>
                    Back to suppliers
                  </Button>
                </div>
              ) : null}

              {error && view !== "mapping" ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
            </div>
          </div>

          {footerVisible ? (
            <footer className="shrink-0 border-t border-border bg-white px-4 py-3">
              {view === "manual" ? (
                <Button
                  type="button"
                  className="h-9 w-full gap-1.5 bg-brand-navy hover:bg-brand-navy/90"
                  disabled={savingManual || !description.trim()}
                  onClick={saveManual}
                >
                  {savingManual ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  Add to job
                </Button>
              ) : (
                <Button
                  type="button"
                  className="h-9 w-full gap-1.5 bg-brand-navy hover:bg-brand-navy/90"
                  disabled={!pickedList.length}
                  onClick={goToMapping}
                >
                  <Plus className="size-4" />
                  Assign {pickedList.length} part{pickedList.length === 1 ? "" : "s"} to services
                </Button>
              )}
            </footer>
          ) : null}
        </SheetPrimitive.Content>
      </SheetPortal>
    </Sheet>
  );
}

