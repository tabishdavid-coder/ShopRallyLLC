"use client";

import { useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { CrmDialogFooterButtons, CrmDialogShell } from "@/components/crm/crm-dialog-shell";
import { CrmFormField } from "@/components/crm/crm-form-field";
import { CrmFormSection } from "@/components/crm/crm-form-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateVehicle } from "@/server/actions/vehicles";
import {
  usePlateVinLookup,
  type VehicleLookupFields,
} from "@/components/vehicles/use-plate-vin-lookup";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

const inputClass = "border-brand-light/40";

export type EditableVehicle = {
  id: string;
  vin?: string | null;
  plate?: string | null;
  plateState?: string | null;
  unitNumber?: string | null;
  notes?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  engine?: string | null;
  transmission?: string | null;
  drivetrain?: string | null;
  bodyClass?: string | null;
  tireSizeFront?: string | null;
  tireSizeRear?: string | null;
};

export function EditVehicleDialog({
  vehicle,
  customerId,
  open,
  onOpenChange,
  onSaved,
}: {
  vehicle: EditableVehicle;
  customerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful save (e.g. to refresh local chip labels). */
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [vin, setVin] = useState(vehicle.vin ?? "");
  const [plate, setPlate] = useState(vehicle.plate ?? "");
  const [plateState, setPlateState] = useState(vehicle.plateState ?? "NY");
  const [unitNumber, setUnitNumber] = useState(vehicle.unitNumber ?? "");
  const [notes, setNotes] = useState(vehicle.notes ?? "");
  const [year, setYear] = useState<number | null>(vehicle.year ?? null);
  const [make, setMake] = useState(vehicle.make ?? "");
  const [model, setModel] = useState(vehicle.model ?? "");
  const [trim, setTrim] = useState(vehicle.trim ?? "");
  const [engine, setEngine] = useState(vehicle.engine ?? "");
  const [transmission, setTransmission] = useState(vehicle.transmission ?? "");
  const [drivetrain, setDrivetrain] = useState(vehicle.drivetrain ?? "");
  const [bodyClass, setBodyClass] = useState(vehicle.bodyClass ?? "");
  const [tireSizeFront, setTireSizeFront] = useState(vehicle.tireSizeFront ?? "");
  const [tireSizeRear, setTireSizeRear] = useState(vehicle.tireSizeRear ?? "");
  const [decodedData, setDecodedData] = useState<unknown | undefined>(undefined);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const { pending: lookupPending, error: lookupError, note: lookupNote, clearMessages, lookupByPlate, lookupByVin } =
    usePlateVinLookup();

  function currentFields(): VehicleLookupFields {
    return {
      vin,
      year,
      make: make || null,
      model: model || null,
      trim: trim || null,
      engine: engine || null,
      transmission: transmission || null,
      drivetrain: drivetrain || null,
      bodyClass: bodyClass || null,
      decodedData,
    };
  }

  function applyLookup(fields: VehicleLookupFields, resolvedVin: string | null) {
    if (resolvedVin) setVin(resolvedVin);
    if (fields.year != null) setYear(fields.year);
    if (fields.make) setMake(fields.make);
    if (fields.model) setModel(fields.model);
    if (fields.trim) setTrim(fields.trim);
    if (fields.engine) setEngine(fields.engine);
    if (fields.transmission) setTransmission(fields.transmission);
    if (fields.drivetrain) setDrivetrain(fields.drivetrain);
    if (fields.bodyClass) setBodyClass(fields.bodyClass);
    if (fields.decodedData !== undefined) setDecodedData(fields.decodedData);
  }

  function reset() {
    setVin(vehicle.vin ?? "");
    setPlate(vehicle.plate ?? "");
    setPlateState(vehicle.plateState ?? "NY");
    setUnitNumber(vehicle.unitNumber ?? "");
    setNotes(vehicle.notes ?? "");
    setYear(vehicle.year ?? null);
    setMake(vehicle.make ?? "");
    setModel(vehicle.model ?? "");
    setTrim(vehicle.trim ?? "");
    setEngine(vehicle.engine ?? "");
    setTransmission(vehicle.transmission ?? "");
    setDrivetrain(vehicle.drivetrain ?? "");
    setBodyClass(vehicle.bodyClass ?? "");
    setTireSizeFront(vehicle.tireSizeFront ?? "");
    setTireSizeRear(vehicle.tireSizeRear ?? "");
    setDecodedData(undefined);
    setSaveError(null);
    clearMessages();
  }

  function runPlateLookup() {
    lookupByPlate(plateState, plate, currentFields(), ({ vin: resolvedVin, fields }) =>
      applyLookup(fields, resolvedVin),
    );
  }

  function runVinDecode(raw?: string) {
    lookupByVin(raw ?? vin, currentFields(), ({ vin: resolvedVin, fields }) =>
      applyLookup(fields, resolvedVin),
    );
  }

  function submit() {
    setSaveError(null);
    startSave(async () => {
      const res = await updateVehicle({
        id: vehicle.id,
        customerId,
        vin: vin.trim() || undefined,
        plate: plate.trim() || undefined,
        plateState: plate.trim() ? plateState : undefined,
        unitNumber: unitNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        year,
        make: make.trim() || null,
        model: model.trim() || null,
        trim: trim.trim() || null,
        engine: engine.trim() || null,
        transmission: transmission.trim() || null,
        drivetrain: drivetrain.trim() || null,
        bodyClass: bodyClass.trim() || null,
        tireSizeFront: tireSizeFront.trim() || null,
        tireSizeRear: tireSizeRear.trim() || null,
        decodedData,
      });
      if (res.ok) {
        onOpenChange(false);
        onSaved?.();
        router.refresh();
      } else {
        setSaveError(res.error);
      }
    });
  }

  const displayError = saveError ?? lookupError;
  const busy = saving || lookupPending;
  const ymmSummary = [year, make, model, trim].filter(Boolean).join(" ");

  return (
    <CrmDialogShell
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
      eyebrow="Repair order"
      title="Edit vehicle"
      description={ymmSummary || "Update plate, VIN, tires, and notes for this RO."}
      maxWidth="sm:max-w-lg"
      footer={
        <CrmDialogFooterButtons
          onCancel={() => onOpenChange(false)}
          onSave={submit}
          pending={busy}
        />
      }
    >
      <div className="space-y-4">
        <CrmFormSection title="Identity" description="Decode by VIN or plate lookup" accent="navy">
          <CrmFormField label="VIN">
            <div className="flex gap-2">
              <Input
                value={vin}
                onChange={(e) => setVin(e.target.value.toUpperCase())}
                onBlur={() => {
                  if (vin.trim().replace(/\s/g, "").length === 17) runVinDecode(vin);
                }}
                maxLength={17}
                placeholder="17-character VIN"
                className={`font-mono uppercase ${inputClass}`}
              />
              {vin.trim().replace(/\s/g, "").length === 17 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-brand-light/50"
                  disabled={busy}
                  onClick={() => runVinDecode()}
                >
                  {lookupPending ? <Loader2 className="size-4 animate-spin" /> : "Decode"}
                </Button>
              ) : null}
            </div>
          </CrmFormField>

          <div className="mt-3 grid grid-cols-[1fr_80px] gap-3">
            <CrmFormField label="License plate">
              <Input
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                placeholder="e.g. RP1000"
                className={`font-mono uppercase ${inputClass}`}
              />
            </CrmFormField>
            <CrmFormField label="State">
              <Select value={plateState} onValueChange={setPlateState}>
                <SelectTrigger className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CrmFormField>
          </div>

          {plate.trim() ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3 gap-1.5"
              disabled={busy}
              onClick={runPlateLookup}
            >
              {lookupPending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              Look up VIN
            </Button>
          ) : null}

          {lookupNote ? <p className="mt-2 text-xs text-emerald-700">{lookupNote}</p> : null}
        </CrmFormSection>

        <CrmFormSection title="Vehicle details" accent="light">
          <CrmFormField label="Unit #">
            <Input value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} className={inputClass} />
          </CrmFormField>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <CrmFormField label="Tire size (front)">
              <Input
                value={tireSizeFront}
                onChange={(e) => setTireSizeFront(e.target.value)}
                placeholder="225/65R17"
                className={`font-mono ${inputClass}`}
              />
            </CrmFormField>
            <CrmFormField label="Tire size (rear)">
              <Input
                value={tireSizeRear}
                onChange={(e) => setTireSizeRear(e.target.value)}
                placeholder="Optional"
                className={`font-mono ${inputClass}`}
              />
            </CrmFormField>
          </div>
          <div className="mt-3">
            <CrmFormField label="Vehicle notes">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
            </CrmFormField>
          </div>
        </CrmFormSection>

        {displayError ? <p className="text-sm text-brand-red">{displayError}</p> : null}
      </div>
    </CrmDialogShell>
  );
}
