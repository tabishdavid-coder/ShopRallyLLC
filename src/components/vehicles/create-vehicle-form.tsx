"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Car, Info, Loader2, Palette, Plus, Save, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  VEHICLE_INTAKE_BTN_OUTLINE,
  VEHICLE_INTAKE_BTN_PRIMARY,
  VEHICLE_INTAKE_FIELD,
  VehicleIntakeFieldLabel,
  VehicleIntakeFormSection,
} from "@/components/vehicles/vehicle-intake-form-chrome";
import { useCorePlanShop } from "@/lib/shop-capabilities";
import { cn } from "@/lib/utils";
import { CAR_MAKES } from "@/lib/vehicle-makes";
import { getCarModels, getCarTrims } from "@/server/actions/vehicle-catalog";

export const US_STATE_CODES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
] as const;

export const US_STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut",
  DE: "Delaware", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan",
  MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin",
  WY: "Wyoming", DC: "District of Columbia",
};

export const TRANSMISSION_OPTIONS = ["Automatic", "Manual", "CVT", "Dual-Clutch", "Other"] as const;
export const DRIVETRAIN_OPTIONS = ["FWD", "RWD", "AWD", "4WD", "4x4", "Other"] as const;
export const VEHICLE_COLORS = [
  "Black", "White", "Silver", "Gray", "Red", "Blue", "Green", "Brown", "Beige", "Gold", "Orange", "Yellow", "Purple", "Other",
] as const;
export const VEHICLE_NOTES_MAX = 500;
const MILEAGE_UNITS = [
  { value: "miles", label: "Miles" },
  { value: "km", label: "Kilometers" },
] as const;

const NOTES_MAX = VEHICLE_NOTES_MAX;

/** Alias for Add Vehicle dialog / callers — same as VEHICLE_INTAKE_FIELD. */
export const fieldClass = VEHICLE_INTAKE_FIELD;

export type VehicleFormData = {
  year: number | null;
  make: string;
  model: string;
  trim: string;
  vin: string;
  plate: string;
  plateState: string;
  engine: string;
  transmission: string;
  mileage: string;
  mileageUnits: "miles" | "km";
  color: string;
  vehicleDisplayName: string;
  notes: string;
  unitNumber: string;
  drivetrain: string;
  bodyClass: string;
  decodedData?: unknown;
};

export function emptyVehicleForm(plateState = "NY"): VehicleFormData {
  return {
    year: null,
    make: "",
    model: "",
    trim: "",
    vin: "",
    plate: "",
    plateState,
    engine: "",
    transmission: "",
    mileage: "",
    mileageUnits: "miles",
    color: "",
    vehicleDisplayName: "",
    notes: "",
    unitNumber: "",
    drivetrain: "",
    bodyClass: "",
  };
}

export function defaultVehicleDisplayName(f: Pick<VehicleFormData, "year" | "make" | "model" | "trim">) {
  return [f.year, f.make, f.model, f.trim].filter(Boolean).join(" ");
}

export function vehicleSummaryLine(f: Pick<VehicleFormData, "year" | "make" | "model" | "trim" | "engine">) {
  return [f.year, f.make, f.model, f.trim, f.engine].filter(Boolean).join(" ").toUpperCase();
}

function normalizeTransmission(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";
  const lower = raw.toLowerCase();
  if (lower.includes("manual")) return "Manual";
  if (lower.includes("cvt")) return "CVT";
  if (lower.includes("dual") || lower.includes("dct")) return "Dual-Clutch";
  if (lower.includes("auto")) return "Automatic";
  return raw.trim();
}

/** Map a decoded value onto a catalog option (exact, then longest prefix). */
function matchCatalogOption(value: string, options: string[]): string | null {
  const v = value.trim();
  if (!v || options.length === 0) return null;
  const lower = v.toLowerCase();
  const exact = options.find((o) => o.toLowerCase() === lower);
  if (exact) return exact;
  let best: string | null = null;
  for (const o of options) {
    const ol = o.toLowerCase();
    if (lower === ol || lower.startsWith(`${ol} `) || lower.startsWith(`${ol}-`)) {
      if (!best || o.length > best.length) best = o;
    }
  }
  return best;
}

export function vehicleFormFromDecoded(
  decoded: {
    year: number | null;
    make: string | null;
    model: string | null;
    trim: string | null;
    engine: string | null;
    transmission: string | null;
    drivetrain: string | null;
    bodyClass: string | null;
    raw?: unknown;
  },
  extras: { vin?: string; plate?: string; plateState?: string } = {},
): VehicleFormData {
  const base = emptyVehicleForm(extras.plateState ?? "NY");
  const year = decoded.year;
  const make = decoded.make ?? "";
  const model = decoded.model ?? "";
  const trim = decoded.trim ?? "";
  return {
    ...base,
    year,
    make,
    model,
    trim,
    vin: extras.vin ?? "",
    plate: extras.plate ?? "",
    plateState: extras.plateState ?? base.plateState,
    engine: decoded.engine ?? "",
    transmission: normalizeTransmission(decoded.transmission),
    drivetrain: decoded.drivetrain ?? "",
    bodyClass: decoded.bodyClass ?? "",
    vehicleDisplayName: defaultVehicleDisplayName({ year, make, model, trim }),
    decodedData: decoded.raw,
  };
}

const FormSection = VehicleIntakeFormSection;
const FieldLabel = VehicleIntakeFieldLabel;

export function CreateVehicleForm({
  form,
  onChange,
  years,
  lookupNote,
  className,
}: {
  form: VehicleFormData;
  onChange: (next: VehicleFormData) => void;
  years: number[];
  lookupNote?: string | null;
  className?: string;
}) {
  const corePlan = useCorePlanShop();
  const [displayNameTouched, setDisplayNameTouched] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [trims, setTrims] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [trimsLoading, setTrimsLoading] = useState(false);
  const yearsListId = useId();
  const makesListId = useId();
  const modelsListId = useId();
  const trimsListId = useId();

  const patch = (partial: Partial<VehicleFormData>) => onChange({ ...form, ...partial });

  useEffect(() => {
    if (displayNameTouched) return;
    const auto = defaultVehicleDisplayName(form);
    if (auto && auto !== form.vehicleDisplayName) {
      onChange({ ...form, vehicleDisplayName: auto });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when ymmt changes
  }, [form.year, form.make, form.model, form.trim, displayNameTouched]);

  useEffect(() => {
    // Core: free-type YMM only — no EPA catalog drill-down.
    if (corePlan) {
      setModels([]);
      setModelsLoading(false);
      return;
    }
    const make = form.make.trim();
    if (!make || !form.year) {
      setModels([]);
      return;
    }
    let cancelled = false;
    const canonicalMake = CAR_MAKES.find((m) => m.toLowerCase() === make.toLowerCase()) ?? make;
    setModelsLoading(true);
    getCarModels(canonicalMake, form.year).then((m) => {
      if (cancelled) return;
      setModels(m);
      setModelsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [form.make, form.year, corePlan]);

  // Soft-match typed/decoded model onto catalog spelling when possible (keeps free text otherwise).
  useEffect(() => {
    if (corePlan) return;
    if (!form.model.trim() || models.length === 0) return;
    const matched = matchCatalogOption(form.model, models);
    if (matched && matched !== form.model) {
      onChange({ ...form, model: matched });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only remap when catalog or decoded model changes
  }, [models, form.model, corePlan]);

  useEffect(() => {
    if (corePlan) {
      setTrims([]);
      setTrimsLoading(false);
      return;
    }
    const make = form.make.trim();
    const model = form.model.trim();
    if (!make || !form.year || !model) {
      setTrims([]);
      return;
    }
    let cancelled = false;
    const canonicalMake = CAR_MAKES.find((m) => m.toLowerCase() === make.toLowerCase()) ?? make;
    const catalogModel = matchCatalogOption(model, models) ?? model;
    setTrimsLoading(true);
    getCarTrims(canonicalMake, form.year, catalogModel).then((t) => {
      if (cancelled) return;
      setTrims(t);
      setTrimsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [form.make, form.year, form.model, models, corePlan]);

  useEffect(() => {
    if (corePlan) return;
    if (!form.trim.trim() || trims.length === 0) return;
    const matched = matchCatalogOption(form.trim, trims);
    if (matched && matched !== form.trim) {
      onChange({ ...form, trim: matched });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only remap when catalog or decoded trim changes
  }, [trims, form.trim, corePlan]);

  const notesCount = form.notes.length;
  const mileageSuffix = form.mileageUnits === "km" ? "km" : "mi";

  const colorOptions = useMemo(() => {
    if (form.color && !VEHICLE_COLORS.includes(form.color as (typeof VEHICLE_COLORS)[number])) {
      return [form.color, ...VEHICLE_COLORS];
    }
    return VEHICLE_COLORS;
  }, [form.color]);

  const ymmReady = Boolean(form.year && form.make.trim() && form.model.trim());
  const modelCatalogMatch = useMemo(() => {
    if (corePlan || !form.model.trim() || models.length === 0) return null;
    return matchCatalogOption(form.model, models);
  }, [form.model, models, corePlan]);
  const trimCatalogMatch = useMemo(() => {
    if (corePlan || !form.trim.trim() || trims.length === 0) return null;
    return matchCatalogOption(form.trim, trims);
  }, [form.trim, trims, corePlan]);
  const hasVin = form.vin.trim().length >= 10;
  const catalogStatus = useMemo(() => {
    if (corePlan || !ymmReady) return null;
    if (modelsLoading || trimsLoading) return "loading" as const;
    if (modelCatalogMatch) return "matched" as const;
    if (models.length === 0) return "no-catalog" as const;
    return "unmatched" as const;
  }, [corePlan, ymmReady, modelsLoading, trimsLoading, modelCatalogMatch, models.length]);

  const suggestedTrims = useMemo(() => {
    if (corePlan || trims.length === 0) return [];
    // Prefer unused suggestions; keep current trim visible via the input.
    return trims.slice(0, 8);
  }, [corePlan, trims]);

  return (
    <div className={cn("space-y-5", className)}>
      {lookupNote ? (
        <div className="rounded-none border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          {lookupNote}
        </div>
      ) : null}

      <FormSection icon={Car} title="Vehicle details (confirm or enter manually)">
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4">
          <div>
            <FieldLabel label="Year" required />
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              list={corePlan ? undefined : yearsListId}
              value={form.year ?? ""}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
                patch({ year: raw ? Number(raw) : null });
              }}
              placeholder="2014"
              className={fieldClass}
            />
            {!corePlan ? (
              <datalist id={yearsListId}>
                {years.map((y) => (
                  <option key={y} value={y} />
                ))}
              </datalist>
            ) : null}
          </div>
          <div>
            <FieldLabel label="Make" required />
            <input
              list={corePlan ? undefined : makesListId}
              value={form.make}
              onChange={(e) => {
                const nextMake = e.target.value;
                const makeChanged =
                  nextMake.trim().toLowerCase() !== form.make.trim().toLowerCase();
                patch(
                  makeChanged
                    ? { make: nextMake, model: "", trim: "" }
                    : { make: nextMake },
                );
              }}
              placeholder="Honda"
              className={fieldClass}
            />
            {!corePlan ? (
              <datalist id={makesListId}>
                {CAR_MAKES.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            ) : null}
          </div>
          <div>
            <FieldLabel label="Model" required />
            <input
              list={corePlan ? undefined : modelsListId}
              value={form.model}
              onChange={(e) => {
                const nextModel = e.target.value;
                const modelChanged =
                  nextModel.trim().toLowerCase() !== form.model.trim().toLowerCase();
                patch(modelChanged ? { model: nextModel, trim: "" } : { model: nextModel });
              }}
              placeholder="Accord"
              className={fieldClass}
            />
            {!corePlan ? (
              <datalist id={modelsListId}>
                {models.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            ) : null}
          </div>
          <div>
            <FieldLabel label="Trim" />
            <input
              list={corePlan ? undefined : trimsListId}
              value={form.trim}
              onChange={(e) => patch({ trim: e.target.value })}
              placeholder="EX-L"
              className={fieldClass}
            />
            {!corePlan ? (
              <datalist id={trimsListId}>
                {trims.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            ) : null}
          </div>
        </div>

        {ymmReady && catalogStatus === "matched" && suggestedTrims.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Suggested trims</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestedTrims.map((t) => {
                const selected = form.trim.trim().toLowerCase() === t.toLowerCase();
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => patch({ trim: t })}
                    className={cn(
                      "rounded-none border px-2.5 py-1 text-xs transition-colors",
                      selected
                        ? "border-brand-orange bg-brand-orange/10 text-foreground"
                        : "border-[#d0d5dd] bg-white text-muted-foreground hover:border-brand-orange/40 hover:text-foreground",
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {ymmReady && catalogStatus && catalogStatus !== "loading" ? (
          <div
            className={cn(
              "rounded-none border px-3 py-2.5 text-xs leading-relaxed",
              catalogStatus === "matched"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-amber-200 bg-amber-50 text-amber-900",
            )}
          >
            {catalogStatus === "matched" ? (
              <>
                Catalog match: {form.year} {form.make} {modelCatalogMatch}
                {trimCatalogMatch ? ` · ${trimCatalogMatch}` : null}. Labor guide can use VIN
                {hasVin ? " (preferred)" : ""} or this YMM.
              </>
            ) : hasVin ? (
              <>
                No catalog match for “{form.model}”. Vehicle will still save. Labor guide will use
                VIN {form.vin.trim().slice(0, 10)}… first — YMM is fallback only.
              </>
            ) : (
              <>
                No catalog match for “{form.model}”. Add a VIN when possible so labor guide can
                resolve by VIN prefix. Without VIN, labor uses typed year/make/model (normalized).
              </>
            )}
          </div>
        ) : null}

        {modelsLoading || trimsLoading ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Matching catalog…
          </p>
        ) : null}

        {/* Shared 4-col track so every row aligns with Year/Make/Model/Trim */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4">
          <div className="col-span-2">
            <FieldLabel label="VIN" />
            <input
              value={form.vin}
              onChange={(e) => patch({ vin: e.target.value.toUpperCase() })}
              maxLength={17}
              placeholder="17-character VIN"
              className={cn(fieldClass, "font-mono uppercase")}
            />
          </div>
          <div>
            <FieldLabel label="License Plate" />
            <input
              value={form.plate}
              onChange={(e) => patch({ plate: e.target.value.toUpperCase() })}
              placeholder="ABC1234"
              className={cn(fieldClass, "font-mono uppercase")}
            />
          </div>
          <div>
            <FieldLabel label="Registration State" />
            <Select value={form.plateState} onValueChange={(v) => patch({ plateState: v })}>
              <SelectTrigger className={cn(fieldClass, "w-full min-w-0")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {US_STATE_CODES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {US_STATE_NAMES[s] ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <FieldLabel label="Engine" />
            <input
              value={form.engine}
              onChange={(e) => patch({ engine: e.target.value })}
              placeholder="3.5L V6"
              className={fieldClass}
            />
          </div>
          <div>
            <FieldLabel label="Transmission" />
            <select
              value={form.transmission || ""}
              onChange={(e) => patch({ transmission: e.target.value })}
              className={fieldClass}
            >
              <option value="">Select…</option>
              {TRANSMISSION_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              {form.transmission &&
              !TRANSMISSION_OPTIONS.includes(form.transmission as (typeof TRANSMISSION_OPTIONS)[number]) ? (
                <option value={form.transmission}>{form.transmission}</option>
              ) : null}
            </select>
          </div>
          <div>
            <FieldLabel label="Drivetrain" />
            <select
              value={form.drivetrain || ""}
              onChange={(e) => patch({ drivetrain: e.target.value })}
              className={fieldClass}
            >
              <option value="">Select…</option>
              {DRIVETRAIN_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
              {form.drivetrain &&
              !DRIVETRAIN_OPTIONS.includes(form.drivetrain as (typeof DRIVETRAIN_OPTIONS)[number]) ? (
                <option value={form.drivetrain}>{form.drivetrain}</option>
              ) : null}
            </select>
          </div>
          <div>
            <FieldLabel label="Color" />
            <div className="relative">
              <Palette className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground/60" />
              <Select value={form.color || undefined} onValueChange={(v) => patch({ color: v })}>
                <SelectTrigger className={cn(fieldClass, "w-full min-w-0 pl-9")}>
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <FieldLabel label="Mileage" />
            <div className="relative">
              <input
                value={form.mileage}
                onChange={(e) => patch({ mileage: e.target.value.replace(/\D/g, "") })}
                inputMode="numeric"
                placeholder="Odometer"
                className={cn(fieldClass, "pr-10")}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {mileageSuffix}
              </span>
            </div>
          </div>
          <div>
            <FieldLabel label="Units" />
            <select
              value={form.mileageUnits}
              onChange={(e) => patch({ mileageUnits: e.target.value as "miles" | "km" })}
              className={fieldClass}
            >
              {MILEAGE_UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <FieldLabel
              label="Vehicle Name (visible to customers)"
              required
              info="Shown on estimates, invoices, and customer-facing documents."
            />
            <input
              value={form.vehicleDisplayName}
              onChange={(e) => {
                setDisplayNameTouched(true);
                patch({ vehicleDisplayName: e.target.value });
              }}
              placeholder="2014 Honda Accord EX-L"
              className={fieldClass}
            />
          </div>
        </div>
      </FormSection>

      {/* Notes + Tags near footer actions */}
      <section className="space-y-3 border-t border-[#eaecf0] pt-5">
        <div className="flex items-center gap-2">
          <Info className="size-4 text-brand-orange" />
          <h3 className="text-sm font-semibold text-foreground">Notes</h3>
        </div>
        <Textarea
          value={form.notes}
          onChange={(e) => patch({ notes: e.target.value.slice(0, NOTES_MAX) })}
          rows={3}
          placeholder="Internal notes about this vehicle"
          className="min-h-[88px] resize-y rounded-none border-[#d0d5dd] bg-white text-sm shadow-none placeholder:text-muted-foreground/70 focus-visible:border-brand-orange/50 focus-visible:ring-brand-orange/20"
        />
        <p className="text-right text-xs text-muted-foreground">
          {notesCount}/{NOTES_MAX}
        </p>
      </section>

      <section className="space-y-3 border-t border-[#eaecf0] pt-5">
        <div className="flex items-center gap-2">
          <Tag className="size-4 text-brand-orange" />
          <h3 className="text-sm font-semibold text-foreground">Tags</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Add tags to help organize and find this vehicle easily.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-none border-[#d0d5dd] text-brand-orange hover:bg-brand-orange/5 hover:text-brand-orange"
          disabled
          title="Vehicle tags coming soon"
        >
          <Plus className="size-4" />
          Add tag
        </Button>
      </section>
    </div>
  );
}

export function CreateVehicleFormFooter({
  onCancel,
  onSave,
  saving,
  error,
}: {
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  error?: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-[#eaecf0] bg-white px-6 py-4">
      {error ? <span className="text-sm text-destructive">{error}</span> : null}
      <div className="ml-auto flex gap-3">
        <Button
          type="button"
          variant="outline"
          className={VEHICLE_INTAKE_BTN_OUTLINE}
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={onSave}
          disabled={saving}
          className={VEHICLE_INTAKE_BTN_PRIMARY}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save Vehicle
        </Button>
      </div>
    </div>
  );
}

export function formToCreateInput(
  form: VehicleFormData,
  customerId: string,
): { ok: true; data: import("@/lib/vehicle-schemas").CreateVehicleInput } | { ok: false; error: string } {
  if (!form.year && !form.make.trim() && !form.model.trim()) {
    return { ok: false, error: "Year, make, and model are required." };
  }
  if (!form.year) return { ok: false, error: "Year is required." };
  if (!form.make.trim()) return { ok: false, error: "Make is required." };
  if (!form.model.trim()) return { ok: false, error: "Model is required." };
  if (!form.vehicleDisplayName.trim()) return { ok: false, error: "Vehicle name is required." };

  const mileageRaw = form.mileage.trim();
  const initialMileage = mileageRaw ? Number(mileageRaw) : null;

  return {
    ok: true,
    data: {
      customerId,
      vin: form.vin.trim() || undefined,
      year: form.year,
      make: form.make.trim() || null,
      model: form.model.trim() || null,
      trim: form.trim.trim() || null,
      engine: form.engine.trim() || null,
      transmission: form.transmission.trim() || null,
      drivetrain: form.drivetrain.trim() || null,
      bodyClass: form.bodyClass.trim() || null,
      plate: form.plate.trim().toUpperCase() || null,
      plateState: form.plateState || null,
      color: form.color.trim() || null,
      notes: form.notes.trim() || null,
      unitNumber: form.unitNumber.trim() || null,
      initialMileage,
      mileageUnits: form.mileageUnits,
      decodedData: form.decodedData,
    },
  };
}
