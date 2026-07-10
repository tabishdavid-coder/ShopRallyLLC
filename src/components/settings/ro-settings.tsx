"use client";

import { useState, useTransition } from "react";
import {
  Timer,
  HandCoins,
  BadgePercent,
  Receipt,
  FolderOpen,
  CreditCard,
  Car,
  TrendingUp,
  Settings2,
  Plus,
  X,
  Check,
  Loader2,
  Columns3,
  FileText,
  LayoutGrid,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SettingsHero, SettingsEmptyState } from "@/components/settings/settings-hero";
import {
  saveLaborRates,
  saveShopFees,
  saveDiscountTemplates,
  saveTaxes,
  saveGpGoal,
  saveAdvancedSettings,
  saveCompletedRoArchiveSettings,
  type RoSettingsResult,
} from "@/server/actions/ro-settings";
import type { AdvancedSettings } from "@/lib/ro-settings";
import type { JobBoardPipelineConfig } from "@/lib/job-board-pipeline";
import {
  COMPLETED_RO_ARCHIVE_DAY_OPTIONS,
  type CompletedRoArchiveSettings,
} from "@/lib/job-board-archive";
import { JobBoardPipelineSettings } from "@/components/settings/job-board-pipeline-settings";
import { TransparencySettings } from "@/components/settings/transparency-settings";
import { EstimateTermsSettings } from "@/components/settings/estimate-terms-settings";
import { EstimateJobsLayoutSettings } from "@/components/settings/estimate-jobs-layout-settings";
import {
  SettingsSubnav,
  type SettingsSubnavItem,
} from "@/components/settings/settings-subnav";
import type { Transparency } from "@/lib/transparency";
import type { EstimateJobsLayout } from "@/generated/prisma";

type Method = "PERCENT" | "FIXED";
type Base = "LABOR" | "PARTS" | "LABOR_PARTS";

type LaborRateRow = { name: string; rate: number; isDefault: boolean };
type FeeRow = { name: string; autoApply: boolean; method: Method; base: Base; amount: number; cap: number | null; taxable: boolean };
type DiscountRow = { name: string; method: Method; base: Base; amount: number; cap: number | null };
type Taxes = { salesTaxPct: number; taxOnLabor: boolean; taxOnParts: boolean; taxOnFees: boolean; cap: number | null };

const input = "rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring";

const SECTIONS: SettingsSubnavItem[] = [
  { id: "labor", label: "Labor Rates", icon: Timer },
  { id: "fees", label: "Shop Fees", icon: HandCoins },
  { id: "discounts", label: "Discounts", icon: BadgePercent },
  { id: "taxes", label: "Taxes", icon: Receipt },
  { id: "categories", label: "Job Categories", icon: FolderOpen },
  { id: "payment", label: "Payment Settings", icon: CreditCard },
  { id: "invoice", label: "Invoice Numbering", icon: Car },
  { id: "quoteDisplay", label: "Quote & Invoice Display", icon: FileText },
  { id: "estimateTerms", label: "Estimate Terms", icon: FileText },
  { id: "estimateWorkspace", label: "Estimate Workspace", icon: LayoutGrid },
  { id: "gp", label: "GP/hr Goal", icon: TrendingUp },
  { id: "jobBoard", label: "Job Board", icon: Columns3 },
  { id: "advanced", label: "Advanced Settings", icon: Settings2 },
];

type SectionKey = (typeof SECTIONS)[number]["id"];

const SECTION_KEYS = new Set<string>(SECTIONS.map((s) => s.id));

function resolveInitialSection(section: string | undefined): SectionKey {
  if (section === "quote-invoice-display" || section === "quoteDisplay") return "quoteDisplay";
  if (section === "estimate-terms" || section === "estimates" || section === "estimateTerms") {
    return "estimateTerms";
  }
  if (section === "estimate-workspace" || section === "workspace" || section === "estimateWorkspace") {
    return "estimateWorkspace";
  }
  if (section && SECTION_KEYS.has(section)) return section as SectionKey;
  return "labor";
}

export function RoSettings(props: {
  laborRates: LaborRateRow[];
  fees: FeeRow[];
  discounts: DiscountRow[];
  taxes: Taxes;
  gpGoal: number | null;
  advanced: AdvancedSettings;
  archive: CompletedRoArchiveSettings;
  pipeline: JobBoardPipelineConfig;
  zip: string | null;
  transparency: Transparency;
  estimateTerms: {
    initialEstimateHtml: string;
    initialInvoiceHtml: string;
    version: string;
    updatedAt: Date | null;
  };
  estimateJobsLayout: EstimateJobsLayout;
  initialSection?: string;
}) {
  const [section, setSection] = useState<SectionKey>(() => resolveInitialSection(props.initialSection));

  return (
    <div className="space-y-5">
      <SettingsHero
        icon={Wrench}
        title="RO Settings"
        description="Labor rates, fees, taxes, invoicing, and estimate terms — the rules that price every repair order."
      />
      <SettingsSubnav
        items={SECTIONS}
        ariaLabel="RO settings sections"
        activeId={section}
        onSelect={(id) => setSection(id as SectionKey)}
        contentCard
      >
        {section === "labor" ? <LaborRatesSection rows={props.laborRates} /> : null}
        {section === "fees" ? <ShopFeesSection rows={props.fees} /> : null}
        {section === "discounts" ? <DiscountsSection rows={props.discounts} /> : null}
        {section === "taxes" ? <TaxesSection initial={props.taxes} zip={props.zip} /> : null}
        {section === "gp" ? <GpGoalSection initial={props.gpGoal} /> : null}
        {section === "jobBoard" ? (
          <div className="space-y-8">
            <JobBoardPipelineSettings initial={props.pipeline} />
            <JobBoardArchiveSection initial={props.archive} />
          </div>
        ) : null}
        {section === "advanced" ? <AdvancedSection initial={props.advanced} /> : null}
        {section === "categories" ? (
          <Soon
            icon={FolderOpen}
            title="Job Categories"
            desc="Group jobs into categories for reporting and required-field rules."
          />
        ) : null}
        {section === "payment" ? (
          <Soon
            icon={CreditCard}
            title="Payment Settings"
            desc="Accepted payment methods, surcharges, and processor configuration."
          />
        ) : null}
        {section === "invoice" ? (
          <Soon
            icon={Car}
            title="Invoice Numbering"
            desc="Set the invoice number prefix and next sequence number."
          />
        ) : null}
        {section === "quoteDisplay" ? (
          <TransparencySettings initial={props.transparency} showHeading={false} />
        ) : null}
        {section === "estimateTerms" ? (
          <EstimateTermsSettings
            initialEstimateHtml={props.estimateTerms.initialEstimateHtml}
            initialInvoiceHtml={props.estimateTerms.initialInvoiceHtml}
            version={props.estimateTerms.version}
            updatedAt={props.estimateTerms.updatedAt}
          />
        ) : null}
        {section === "estimateWorkspace" ? (
          <EstimateJobsLayoutSettings initialLayout={props.estimateJobsLayout} />
        ) : null}
      </SettingsSubnav>
    </div>
  );
}

/* ───────────────────────── shared ───────────────────────── */

function useSaver() {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  function run(fn: () => Promise<RoSettingsResult>) {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await fn();
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else setError(res.error);
    });
  }
  return { saved, error, pending, run };
}

function SectionHeader({ title, desc, icon: Icon }: { title: string; desc: string; icon?: LucideIcon }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      {Icon ? (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-navy/8 text-brand-navy">
          <Icon className="size-4" aria-hidden />
        </span>
      ) : null}
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function SaveBar({
  label,
  onSave,
  saved,
  error,
  pending,
  onAdd,
  addLabel,
}: {
  label: string;
  onSave: () => void;
  saved: boolean;
  error: string | null;
  pending: boolean;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <div className="mt-4 flex items-center justify-end gap-3 border-t pt-4">
      {error ? <span className="mr-auto text-xs text-destructive">{error}</span> : null}
      {saved ? <span className="mr-auto flex items-center gap-1 text-xs text-emerald-600"><Check className="size-3.5" /> Saved</span> : null}
      {onAdd ? (
        <Button variant="outline" size="sm" onClick={onAdd}><Plus className="size-4" /> {addLabel}</Button>
      ) : null}
      <Button size="sm" onClick={onSave} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null} {label}
      </Button>
    </div>
  );
}

function Soon({ title, desc, icon }: { title: string; desc: string; icon: LucideIcon }) {
  return (
    <div>
      <SectionHeader title={title} desc={desc} icon={icon} />
      <SettingsEmptyState
        icon={icon}
        title="Not set up yet"
        description="Coming soon — this will flow through to the rest of the app once configured."
      />
    </div>
  );
}

function MethodSelect({ value, onChange }: { value: Method; onChange: (m: Method) => void }) {
  return (
    <select className={input} value={value} onChange={(e) => onChange(e.target.value as Method)}>
      <option value="PERCENT">Percentage</option>
      <option value="FIXED">Fixed</option>
    </select>
  );
}

function BaseSelect({ value, onChange }: { value: Base; onChange: (b: Base) => void }) {
  return (
    <select className={input} value={value} onChange={(e) => onChange(e.target.value as Base)}>
      <option value="LABOR">Labor</option>
      <option value="PARTS">Parts</option>
      <option value="LABOR_PARTS">Labor, Parts</option>
    </select>
  );
}

/* ───────────────────────── Labor Rates ───────────────────────── */

function LaborRatesSection({ rows: initial }: { rows: LaborRateRow[] }) {
  const [rows, setRows] = useState<LaborRateRow[]>(initial);
  const { saved, error, pending, run } = useSaver();

  const set = (i: number, patch: Partial<LaborRateRow>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const setDefault = (i: number) => setRows((rs) => rs.map((r, idx) => ({ ...r, isDefault: idx === i })));
  const add = () => setRows((rs) => [...rs, { name: "", rate: 0, isDefault: rs.length === 0 }]);
  const remove = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  return (
    <div>
      <SectionHeader
        icon={Timer}
        title="Labor Rates"
        desc="The shop labor rate is the hourly rate you charge your customers. Customers will never see this rate, and you can enter multiple rates for different kinds of customers."
      />
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
              <th className="w-16 px-4 py-2.5 font-medium">Default</th>
              <th className="py-2.5 font-medium">Labor Rate Name</th>
              <th className="w-40 py-2.5 text-right font-medium">Labor Rate</th>
              <th className="w-10 px-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="px-4 py-2">
                  <input type="radio" name="default-rate" checked={r.isDefault} onChange={() => setDefault(i)} className="size-4 accent-primary" />
                </td>
                <td className="py-2 pr-2">
                  <input className={cn(input, "w-full")} value={r.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="Labor rate name" />
                </td>
                <td className="py-2">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-muted-foreground">$</span>
                    <input
                      type="number" min={0} step="0.01"
                      className={cn(input, "w-28 text-right")}
                      value={r.rate}
                      onChange={(e) => set(i, { rate: Number(e.target.value) })}
                    />
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  {rows.length > 1 ? (
                    <button onClick={() => remove(i)} aria-label="Remove" className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><X className="size-4" /></button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SaveBar label="Save Labor Rates" onSave={() => run(() => saveLaborRates(rows))} saved={saved} error={error} pending={pending} onAdd={add} addLabel="Add Labor Rate" />
    </div>
  );
}

/* ───────────────────────── Shop Fees ───────────────────────── */

function ShopFeesSection({ rows: initial }: { rows: FeeRow[] }) {
  const [rows, setRows] = useState<FeeRow[]>(initial);
  const { saved, error, pending, run } = useSaver();
  const set = (i: number, patch: Partial<FeeRow>) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const add = () => setRows((rs) => [...rs, { name: "", autoApply: true, method: "PERCENT", base: "LABOR_PARTS", amount: 0, cap: null, taxable: false }]);
  const remove = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  return (
    <div>
      <SectionHeader icon={HandCoins} title="Shop Fees" desc="Set up your standard shop fees here, and select how they should be applied on repair orders." />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
              <th className="px-4 py-2.5 font-medium">Auto Apply</th>
              <th className="py-2.5 font-medium">Fee</th>
              <th className="py-2.5 font-medium">Method</th>
              <th className="py-2.5 font-medium">Calculate on</th>
              <th className="py-2.5 font-medium">Amount</th>
              <th className="py-2.5 font-medium">Cap</th>
              <th className="py-2.5 text-center font-medium">Taxable</th>
              <th className="w-10 px-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b align-middle last:border-0">
                <td className="px-4 py-2">
                  <select className={input} value={r.autoApply ? "ROs" : "none"} onChange={(e) => set(i, { autoApply: e.target.value === "ROs" })}>
                    <option value="ROs">ROs</option>
                    <option value="none">Don&apos;t auto-apply</option>
                  </select>
                </td>
                <td className="py-2 pr-2"><input className={cn(input, "w-32")} value={r.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="Fee name" /></td>
                <td className="py-2 pr-2"><MethodSelect value={r.method} onChange={(m) => set(i, { method: m })} /></td>
                <td className="py-2 pr-2"><BaseSelect value={r.base} onChange={(b) => set(i, { base: b })} /></td>
                <td className="py-2 pr-2">
                  <div className="flex items-center gap-1">
                    <input type="number" min={0} step="0.01" className={cn(input, "w-20")} value={r.amount} onChange={(e) => set(i, { amount: Number(e.target.value) })} />
                    <span className="text-muted-foreground">{r.method === "PERCENT" ? "%" : "$"}</span>
                  </div>
                </td>
                <td className="py-2 pr-2">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">$</span>
                    <input type="number" min={0} step="0.01" className={cn(input, "w-20")} value={r.cap ?? ""} placeholder="—" onChange={(e) => set(i, { cap: e.target.value === "" ? null : Number(e.target.value) })} />
                  </div>
                </td>
                <td className="py-2 text-center"><input type="checkbox" checked={r.taxable} onChange={(e) => set(i, { taxable: e.target.checked })} className="size-4 accent-primary" /></td>
                <td className="px-3 py-2 text-right"><button onClick={() => remove(i)} aria-label="Remove" className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><X className="size-4" /></button></td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">No fees yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <SaveBar label="Save Fees" onSave={() => run(() => saveShopFees(rows))} saved={saved} error={error} pending={pending} onAdd={add} addLabel="Add Fee" />
    </div>
  );
}

/* ───────────────────────── Discounts ───────────────────────── */

function DiscountsSection({ rows: initial }: { rows: DiscountRow[] }) {
  const [rows, setRows] = useState<DiscountRow[]>(initial);
  const { saved, error, pending, run } = useSaver();
  const set = (i: number, patch: Partial<DiscountRow>) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const add = () => setRows((rs) => [...rs, { name: "", method: "PERCENT", base: "LABOR_PARTS", amount: 0, cap: null }]);
  const remove = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  return (
    <div>
      <SectionHeader icon={BadgePercent} title="Discounts" desc="Set up your standard shop discounts here, and select how they should be applied on repair orders. You can always come back to edit these." />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
              <th className="px-4 py-2.5 font-medium">Discount</th>
              <th className="py-2.5 font-medium">Method</th>
              <th className="py-2.5 font-medium">Calculate on</th>
              <th className="py-2.5 font-medium">Amount</th>
              <th className="py-2.5 font-medium">Cap</th>
              <th className="w-10 px-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="px-4 py-2"><input className={cn(input, "w-40")} value={r.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="Discount name" /></td>
                <td className="py-2 pr-2"><MethodSelect value={r.method} onChange={(m) => set(i, { method: m })} /></td>
                <td className="py-2 pr-2"><BaseSelect value={r.base} onChange={(b) => set(i, { base: b })} /></td>
                <td className="py-2 pr-2">
                  <div className="flex items-center gap-1">
                    <input type="number" min={0} step="0.01" className={cn(input, "w-20")} value={r.amount} onChange={(e) => set(i, { amount: Number(e.target.value) })} />
                    <span className="text-muted-foreground">{r.method === "PERCENT" ? "%" : "$"}</span>
                  </div>
                </td>
                <td className="py-2 pr-2">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">$</span>
                    <input type="number" min={0} step="0.01" className={cn(input, "w-20")} value={r.cap ?? ""} placeholder="—" onChange={(e) => set(i, { cap: e.target.value === "" ? null : Number(e.target.value) })} />
                  </div>
                </td>
                <td className="px-3 py-2 text-right"><button onClick={() => remove(i)} aria-label="Remove" className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><X className="size-4" /></button></td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No discounts yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <SaveBar label="Save Discounts" onSave={() => run(() => saveDiscountTemplates(rows))} saved={saved} error={error} pending={pending} onAdd={add} addLabel="Add Discount" />
    </div>
  );
}

/* ───────────────────────── Taxes ───────────────────────── */

function TaxesSection({ initial, zip }: { initial: Taxes; zip: string | null }) {
  const [t, setT] = useState<Taxes>(initial);
  const [capOn, setCapOn] = useState(initial.cap != null);
  const { saved, error, pending, run } = useSaver();

  function save() {
    run(() => saveTaxes({ ...t, cap: capOn ? (t.cap ?? 0) : null }));
  }

  return (
    <div>
      <SectionHeader icon={Receipt} title="Taxes" desc="Sales tax is calculated on the repair order. Set your rate here to be applied to repair orders; it can be modified on each RO if necessary." />

      <h4 className="mb-2 font-semibold">Sales Tax</h4>
      {zip ? (
        <div className="brand-callout mb-3">
          Based on your shop&apos;s zip code, {zip}, it looks like your sales tax is {t.salesTaxPct || 8}%. It&apos;s best to check with your local taxing authorities.
        </div>
      ) : null}

      <label className="mb-1 block text-sm text-muted-foreground">Sales Tax</label>
      <div className="flex items-center gap-1">
        <input type="number" min={0} step="0.01" className={cn(input, "w-full max-w-md")} value={t.salesTaxPct} onChange={(e) => setT({ ...t, salesTaxPct: Number(e.target.value) })} />
        <span className="text-muted-foreground">%</span>
      </div>

      <div className="mt-3 space-y-2">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={t.taxOnLabor} onChange={(e) => setT({ ...t, taxOnLabor: e.target.checked })} className="size-4 accent-primary" /> Charge tax on labor</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={t.taxOnParts} onChange={(e) => setT({ ...t, taxOnParts: e.target.checked })} className="size-4 accent-primary" /> Charge tax on parts</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={t.taxOnFees} onChange={(e) => setT({ ...t, taxOnFees: e.target.checked })} className="size-4 accent-primary" /> Charge tax on fees</label>
      </div>

      <div className="mt-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={capOn} onChange={(e) => setCapOn(e.target.checked)} className="size-4 accent-primary" /> Cap
        </label>
        {capOn ? (
          <div className="mt-1 flex items-center gap-1">
            <span className="text-muted-foreground">$</span>
            <input type="number" min={0} step="0.01" className={cn(input, "w-full max-w-md")} value={t.cap ?? ""} onChange={(e) => setT({ ...t, cap: e.target.value === "" ? null : Number(e.target.value) })} />
          </div>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">If your state requires sales tax to be capped, it will be reflected in final sales tax totals.</p>
      </div>

      <SaveBar label="Save Tax Rates" onSave={save} saved={saved} error={error} pending={pending} />
    </div>
  );
}

/* ───────────────────────── GP/hr Goal ───────────────────────── */

function GpGoalSection({ initial }: { initial: number | null }) {
  const [goal, setGoal] = useState<number | null>(initial);
  const { saved, error, pending, run } = useSaver();
  return (
    <div>
      <SectionHeader icon={TrendingUp} title="GP/hr Goal" desc="Set a target gross-profit per labor hour. The estimate shows GP/hr so you can compare against this goal." />
      <label className="mb-1 block text-sm text-muted-foreground">Target GP per hour</label>
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">$</span>
        <input type="number" min={0} step="1" className={cn(input, "w-full max-w-md")} value={goal ?? ""} placeholder="e.g. 200" onChange={(e) => setGoal(e.target.value === "" ? null : Number(e.target.value))} />
      </div>
      <SaveBar label="Save Goal" onSave={() => run(() => saveGpGoal(goal))} saved={saved} error={error} pending={pending} />
    </div>
  );
}

/* ───────────────────────── Job board archive ───────────────────────── */

function JobBoardArchiveSection({ initial }: { initial: CompletedRoArchiveSettings }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [days, setDays] = useState(initial.days);
  const { saved, error, pending, run } = useSaver();

  return (
    <div>
      <SectionHeader
        icon={Columns3}
        title="Completed column auto-archive"
        desc="Paid repair orders move off the job board automatically after the period you choose. ROs with an open balance stay visible until collected."
      />

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <span>
          <span className="font-medium">Auto-archive completed repair orders</span>
          <br />
          <span className="text-muted-foreground">
            When off, completed cards stay on the board until you remove them manually.
          </span>
        </span>
      </label>

      <div className={cn("mt-4 max-w-md", !enabled && "pointer-events-none opacity-50")}>
        <label className="mb-1 block text-sm text-muted-foreground">Archive after</label>
        <select
          className={input + " w-full"}
          value={days}
          disabled={!enabled}
          onChange={(e) => setDays(Number(e.target.value) as CompletedRoArchiveSettings["days"])}
        >
          {COMPLETED_RO_ARCHIVE_DAY_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d} days
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-muted-foreground">
          Runs when anyone opens Shop Home or the Job Board. Only fully paid ROs in Completed or
          Invoiced status are archived.
        </p>
      </div>

      <SaveBar
        label="Save job board settings"
        onSave={() => run(() => saveCompletedRoArchiveSettings({ enabled, days }))}
        saved={saved}
        error={error}
        pending={pending}
      />
    </div>
  );
}

/* ───────────────────────── Advanced ───────────────────────── */

const REQUIRED_FIELDS: { key: keyof AdvancedSettings; label: string }[] = [
  { key: "reqOdometer", label: "Odometer in & out" },
  { key: "reqMarketingSource", label: "RO marketing source" },
  { key: "reqTechOnLabor", label: "Tech on labor" },
  { key: "reqJobCategory", label: "Job category" },
  { key: "reqPoForParts", label: "Purchase orders for all parts" },
  { key: "reqBillingForParts", label: "Billing for all parts" },
  { key: "reqPaymentCardType", label: "Payment card type" },
  { key: "reqDotCodes", label: "DOT Codes for Tires" },
  { key: "reqDigitalSignature", label: "Digital signature for digital authorization" },
];

const TECH_HOURS: { value: AdvancedSettings["techHoursDisplay"]; label: string; desc: string }[] = [
  { value: "JOB_COMPLETED", label: "Job Completed", desc: "Display technician hours for jobs when the Job is marked complete." },
  { value: "RO_COMPLETED", label: "RO Completed", desc: "Display technician hours for jobs when the RO is completed." },
  { value: "RO_POSTED", label: "RO Posted or sent to A/R", desc: "Display technician hours for jobs when the RO is posted." },
];

function AdvancedSection({ initial }: { initial: AdvancedSettings }) {
  const [a, setA] = useState<AdvancedSettings>(initial);
  const { saved, error, pending, run } = useSaver();
  const setBool = (k: keyof AdvancedSettings, v: boolean) => setA((p) => ({ ...p, [k]: v }));

  return (
    <div>
      <SectionHeader icon={Settings2} title="Advanced Settings" desc="Control which data is required to complete work and post a repair order." />

      <div className="grid gap-2 sm:grid-cols-2">
        {REQUIRED_FIELDS.map((f) => (
          <label key={f.key} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={Boolean(a[f.key])} onChange={(e) => setBool(f.key, e.target.checked)} className="size-4 accent-primary" />
            {f.label}
          </label>
        ))}
      </div>

      <div className="mt-5 border-t pt-4">
        <p className="mb-2 text-sm text-muted-foreground">Control which data is required to delete and save a repair order for later.</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={a.reqReturnPartsBeforeSave} onChange={(e) => setBool("reqReturnPartsBeforeSave", e.target.checked)} className="size-4 accent-primary" />
          Ordered or received parts to be returned or moved to inventory
        </label>
      </div>

      <div className="mt-5 border-t pt-4">
        <p className="mb-2 text-sm text-muted-foreground">Set when completed jobs display in the Technician Hours report.</p>
        <div className="space-y-2">
          {TECH_HOURS.map((o) => (
            <label key={o.value} className="flex items-start gap-2 text-sm">
              <input type="radio" name="tech-hours" checked={a.techHoursDisplay === o.value} onChange={() => setA((p) => ({ ...p, techHoursDisplay: o.value }))} className="mt-0.5 size-4 accent-primary" />
              <span><span className="font-medium">{o.label}</span><br /><span className="text-muted-foreground">{o.desc}</span></span>
            </label>
          ))}
        </div>
      </div>

      <SaveBar label="Save settings" onSave={() => run(() => saveAdvancedSettings(a))} saved={saved} error={error} pending={pending} />
    </div>
  );
}
