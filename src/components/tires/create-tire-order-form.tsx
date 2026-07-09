"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DROP_OFF_TYPES, TIRE_TYPES } from "@/lib/tires";
import { createTireOrder } from "@/server/actions/tires";

type Props = {
  defaultDurationMins: number;
};

export function CreateTireOrderForm({ defaultDurationMins }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [vin, setVin] = useState("");
  const [tireSizeFront, setTireSizeFront] = useState("");
  const [tireSizeRear, setTireSizeRear] = useState("");
  const [tireBrand, setTireBrand] = useState("");
  const [tireQuantity, setTireQuantity] = useState("4");
  const [tireType, setTireType] = useState("");
  const [dropOffType, setDropOffType] = useState("drop-off");
  const [estimatedTotal, setEstimatedTotal] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [recordDepositNow, setRecordDepositNow] = useState(false);
  const [depositMethod, setDepositMethod] = useState<string>("CASH");
  const [depositReference, setDepositReference] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [startTime, setStartTime] = useState("10:00");
  const [notes, setNotes] = useState("");

  function submit() {
    setError(null);
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setError("Customer first name, last name, and phone are required.");
      return;
    }
    if (!tireSizeFront.trim() && !tireBrand.trim()) {
      setError("Enter at least a tire size or brand preference.");
      return;
    }

    startTransition(async () => {
      const depositCents = depositAmount
        ? Math.round(parseFloat(depositAmount) * 100)
        : 0;
      const estimatedTotalCents = estimatedTotal
        ? Math.round(parseFloat(estimatedTotal) * 100)
        : null;

      const res = await createTireOrder({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        year: year ? Number(year) : null,
        make: make.trim() || null,
        model: model.trim() || null,
        vin: vin.trim() || null,
        tireSizeFront: tireSizeFront.trim() || null,
        tireSizeRear: tireSizeRear.trim() || null,
        tireBrand: tireBrand.trim() || null,
        tireQuantity: Number(tireQuantity) || 4,
        tireType: tireType || null,
        dropOffType: dropOffType || null,
        estimatedTotalCents,
        depositCents,
        recordDepositNow: recordDepositNow && depositCents > 0,
        depositMethod: recordDepositNow ? (depositMethod as "CASH" | "CARD" | "CHECK" | "OTHER") : undefined,
        depositReference: depositReference.trim() || null,
        date: scheduleEnabled ? date : null,
        startTime: scheduleEnabled ? startTime : null,
        durationMins: defaultDurationMins,
        notes: notes.trim() || null,
        source: "CRM",
      });

      if (res.ok) {
        router.push(`/tires/${res.id}`);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {error ? (
        <div className="rounded-md border border-brand-red/30 bg-brand-red/10 px-4 py-3 text-sm text-brand-red">
          {error}
        </div>
      ) : null}

      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Customer
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Vehicle
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="year">Year</Label>
            <Input id="year" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="make">Make</Label>
            <Input id="make" value={make} onChange={(e) => setMake(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="model">Model</Label>
            <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="vin">VIN (optional)</Label>
            <Input id="vin" value={vin} onChange={(e) => setVin(e.target.value)} className="font-mono uppercase" />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Tire specs
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sizeFront">Size (front / all)</Label>
            <Input
              id="sizeFront"
              placeholder="225/65R17"
              className="font-mono"
              value={tireSizeFront}
              onChange={(e) => setTireSizeFront(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sizeRear">Size (rear, if staggered)</Label>
            <Input
              id="sizeRear"
              placeholder="255/60R17"
              className="font-mono"
              value={tireSizeRear}
              onChange={(e) => setTireSizeRear(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand">Brand preference</Label>
            <Input id="brand" placeholder="Michelin, Goodyear…" value={tireBrand} onChange={(e) => setTireBrand(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qty">Quantity</Label>
            <Select value={tireQuantity} onValueChange={setTireQuantity}>
              <SelectTrigger id="qty">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 4, 6, 8].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} tires
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tire type</Label>
            <Select value={tireType || "none"} onValueChange={(v) => setTireType(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not specified</SelectItem>
                {TIRE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Drop-off / wait</Label>
            <Select value={dropOffType} onValueChange={setDropOffType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DROP_OFF_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="estimate">Estimated total ($)</Label>
            <Input
              id="estimate"
              inputMode="decimal"
              placeholder="0.00"
              value={estimatedTotal}
              onChange={(e) => setEstimatedTotal(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Deposit
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="deposit">Deposit amount ($)</Label>
            <Input
              id="deposit"
              inputMode="decimal"
              placeholder="50.00"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2 pb-0.5">
            <Checkbox
              id="recordDeposit"
              checked={recordDepositNow}
              onCheckedChange={(v) => setRecordDepositNow(v === true)}
            />
            <Label htmlFor="recordDeposit" className="font-normal">
              Mark deposit as received now
            </Label>
          </div>
          {recordDepositNow ? (
            <>
              <div className="space-y-1.5">
                <Label>Payment method</Label>
                <Select value={depositMethod} onValueChange={setDepositMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="CHECK">Check</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="depositRef">Reference (check #, Stripe PI…)</Label>
                <Input id="depositRef" value={depositReference} onChange={(e) => setDepositReference(e.target.value)} />
              </div>
            </>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Checkbox
            id="schedule"
            checked={scheduleEnabled}
            onCheckedChange={(v) => setScheduleEnabled(v === true)}
          />
          <Label htmlFor="schedule" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Schedule install appointment
          </Label>
        </div>
        {scheduleEnabled ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="time">Time</Label>
              <Input id="time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Skip scheduling now — you can add an appointment later from the order detail page.
          </p>
        )}
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Notes
        </h2>
        <Textarea
          rows={3}
          placeholder="Special requests, TPMS, alignment, etc."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </section>

      <div className="flex justify-end gap-3 pb-8">
        <Button variant="outline" type="button" onClick={() => router.push("/tires")} disabled={pending}>
          Cancel
        </Button>
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Create tire order
        </Button>
      </div>
    </div>
  );
}
