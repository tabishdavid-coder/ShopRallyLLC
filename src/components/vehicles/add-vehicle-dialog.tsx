"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Car, Loader2, MapPin, Search } from "lucide-react";

import {
  CreateVehicleForm,
  CreateVehicleFormFooter,
  emptyVehicleForm,
  formToCreateInput,
  US_STATE_CODES,
  US_STATE_NAMES,
  vehicleFormFromDecoded,
  fieldClass,
  type VehicleFormData,
} from "@/components/vehicles/create-vehicle-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { parseYmmSearch } from "@/lib/parse-ymm-search";
import { useAutodevDecodingUiEnabled } from "@/lib/shop-capabilities";
import { decodeVin, lookupPlate, createVehicle } from "@/server/actions/vehicles";

export function AddVehicleDialog({
  customerId,
  customerName,
  onCreated,
  trigger,
  open: controlledOpen,
  onOpenChange,
  initialLookup = "",
  initialPlateState = "NY",
  initialFields,
}: {
  customerId: string;
  customerName?: string;
  onCreated?: (id: string, label: string) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialLookup?: string;
  initialPlateState?: string;
  /** When set (e.g. from intake lookup click), apply decoded fields without re-search. */
  initialFields?: Partial<VehicleFormData> | null;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const [vehicleForm, setVehicleForm] = useState<VehicleFormData>(() =>
    emptyVehicleForm(initialPlateState || "NY"),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [headerPlateState, setHeaderPlateState] = useState(initialPlateState || "NY");
  const [lookupNote, setLookupNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [searching, startSearch] = useTransition();
  const autodevDecodingOk = useAutodevDecodingUiEnabled();

  const years = useMemo(() => {
    const max = new Date().getFullYear() + 1;
    return Array.from({ length: max - 1980 }, (_, i) => max - i);
  }, []);

  function applyLookupResult(form: VehicleFormData) {
    setVehicleForm(form);
    setLookupNote(null);
    setError(null);
  }

  function runSearchFor(raw: string, state: string) {
    const v = raw.trim().replace(/\s/g, "");
    if (!v) return;

    setLookupNote(null);
    startSearch(async () => {
      if (v.length === 17) {
        const res = await decodeVin(v);
        if (res.ok) {
          applyLookupResult(
            vehicleFormFromDecoded(res.decoded, {
              vin: v.toUpperCase(),
              plateState: state,
            }),
          );
          setSearchQuery(v.toUpperCase());
        } else {
          setLookupNote(res.error);
        }
        return;
      }

      if (/^[A-Z0-9]{2,8}$/i.test(v)) {
        if (!autodevDecodingOk) {
          setVehicleForm((prev) => ({
            ...prev,
            plate: v.toUpperCase(),
            plateState: state,
          }));
          setSearchQuery(v.toUpperCase());
          setLookupNote(
            "Plate saved — enter a 17-character VIN to decode (free), or fill in year / make / model below.",
          );
          return;
        }
        const res = await lookupPlate(state, v);
        if (res.ok) {
          applyLookupResult(
            vehicleFormFromDecoded(res.decoded, {
              vin: res.vin ?? undefined,
              plate: v.toUpperCase(),
              plateState: state,
            }),
          );
          setSearchQuery(v.toUpperCase());
        } else {
          setLookupNote(res.error);
        }
        return;
      }

      const ymm = parseYmmSearch(raw.trim());
      if (ymm) {
        applyLookupResult({
          ...emptyVehicleForm(state),
          ...vehicleForm,
          year: ymm.year,
          make: ymm.make,
          model: ymm.model,
          trim: "",
          vehicleDisplayName: [ymm.year, ymm.make, ymm.model].join(" "),
          plateState: state,
        });
        setLookupNote(null);
        return;
      }

      setLookupNote(
        autodevDecodingOk
          ? "Enter a 17-character VIN or a license plate. Use Year / Make / Model below only if VIN or plate is unavailable."
          : "Enter a 17-character VIN to decode (free NHTSA). Use Year / Make / Model below, or type the plate in the form.",
      );
    });
  }

  function runSearch() {
    runSearchFor(searchQuery, headerPlateState);
  }

  function resetForm(prefillLookup = "", prefillPlateState = "NY") {
    const state = prefillPlateState || "NY";
    setSearchQuery(prefillLookup.trim());
    setHeaderPlateState(state);
    setVehicleForm(emptyVehicleForm(state));
    setLookupNote(null);
    setError(null);
  }

  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      const prefillLookup = initialLookup.trim();
      const prefillPlateState = initialPlateState || "NY";
      resetForm(prefillLookup, prefillPlateState);
      if (initialFields && (initialFields.year || initialFields.make || initialFields.model || initialFields.vin)) {
        const base = emptyVehicleForm(prefillPlateState);
        const year = initialFields.year ?? null;
        const make = initialFields.make ?? "";
        const model = initialFields.model ?? "";
        const trim = initialFields.trim ?? "";
        applyLookupResult({
          ...base,
          ...initialFields,
          year,
          make,
          model,
          trim,
          vin: initialFields.vin ?? "",
          plate: initialFields.plate ?? (/^[A-Z0-9]{2,8}$/i.test(prefillLookup) ? prefillLookup.toUpperCase() : ""),
          plateState: initialFields.plateState || prefillPlateState,
          vehicleDisplayName:
            initialFields.vehicleDisplayName ||
            [year, make, model, trim].filter(Boolean).join(" "),
        });
        setSearchQuery(prefillLookup || initialFields.vin || "");
      } else {
        const key = prefillLookup.replace(/\s/g, "");
        if (key) runSearchFor(key, prefillPlateState);
      }
    }
    if (!open && wasOpenRef.current) {
      resetForm();
    }
    wasOpenRef.current = open;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per open/close transition
  }, [open, initialLookup, initialPlateState, initialFields]);

  useEffect(() => {
    setVehicleForm((prev) => ({ ...prev, plateState: headerPlateState }));
  }, [headerPlateState]);

  function openDialog() {
    setOpen(true);
  }

  function handleSave() {
    const parsed = formToCreateInput(vehicleForm, customerId);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(null);
    startSave(async () => {
      const res = await createVehicle(parsed.data);
      if (res.ok) {
        setOpen(false);
        onCreated?.(res.id, vehicleForm.vehicleDisplayName.trim() || res.label);
      } else {
        setError(res.error);
      }
    });
  }

  const subtitle = customerName
    ? autodevDecodingOk
      ? `For ${customerName} — search by VIN or license plate first, then confirm vehicle details.`
      : `For ${customerName} — decode a VIN (free) or enter year / make / model; add the plate manually on Core.`
    : autodevDecodingOk
      ? "Search by VIN or license plate first, then confirm vehicle details."
      : "Decode a VIN (free) or enter year / make / model; add the plate manually on Core.";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <span onClick={openDialog}>{trigger}</span>
      ) : (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={openDialog}>
          <Car className="size-4" /> Add Vehicle
        </Button>
      )}

      <DialogContent
        showCloseButton={false}
        className="flex h-[min(92vh,880px)] max-h-[92vh] w-full flex-col gap-0 overflow-hidden rounded-none border border-[#eaecf0] bg-white p-0 shadow-2xl sm:max-w-[960px]"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-[#eaecf0] bg-white px-6 pb-4 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-none bg-brand-orange">
                <Car className="size-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">Add Vehicle</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex size-9 shrink-0 items-center justify-center rounded-none border border-[#d0d5dd] text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              aria-label="Close"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>
        </div>

        {/* Primary search — VIN or plate */}
        <div className="shrink-0 border-b border-[#eaecf0] bg-[#f9fafb] px-6 py-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-orange">
            Primary search
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full shrink-0 sm:w-[140px]">
              <label className="sr-only">Registration state</label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground/60" />
                <Select value={headerPlateState} onValueChange={setHeaderPlateState}>
                  <SelectTrigger className={cn(fieldClass, "w-full min-w-0 pl-9")}>
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
            </div>
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    runSearch();
                  }
                }}
                placeholder="VIN (17 characters) or license plate"
                autoFocus
                className={cn(fieldClass, "pl-9 font-mono uppercase")}
              />
            </div>
            <Button
              type="button"
              onClick={runSearch}
              disabled={searching || !searchQuery.trim()}
              className="h-10 shrink-0 gap-1.5 rounded-none bg-brand-orange px-5 text-white hover:bg-brand-orange/90"
            >
              {searching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              Decode / Search
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            VIN decode preferred. Plate uses the registration state on the left. Year / make / model
            below is for manual entry when VIN or plate is unavailable.
          </p>
        </div>

        {/* Form body */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-white px-6 py-5">
          <CreateVehicleForm
            form={vehicleForm}
            onChange={setVehicleForm}
            years={years}
            lookupNote={lookupNote}
          />
        </div>

        <CreateVehicleFormFooter
          onCancel={() => setOpen(false)}
          onSave={handleSave}
          saving={saving}
          error={error}
        />
      </DialogContent>
    </Dialog>
  );
}
