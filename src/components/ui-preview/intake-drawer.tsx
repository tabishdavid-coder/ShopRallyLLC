"use client";

import { Car, Search, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

type IntakeDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function IntakeDrawer({ open, onClose }: IntakeDrawerProps) {
  const [priority, setPriority] = useState("normal");

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-brand-navy/20 backdrop-blur-[2px]"
        aria-label="Close intake form"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-brand-light/40 bg-[oklch(0.985_0.008_247)] shadow-none"
        role="dialog"
        aria-labelledby="intake-title"
      >
        <div className="flex items-center justify-between border-b border-brand-light/35 bg-white px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-navy/60">
              Quick intake
            </p>
            <h2 id="intake-title" className="text-lg font-bold text-brand-navy">
              New Repair Order
            </h2>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <form
          className="flex flex-1 flex-col overflow-y-auto p-5"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="intake-customer" className="text-brand-navy">
                Customer
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="intake-customer"
                  placeholder="Search name, phone, or email…"
                  className="border-brand-light/50 bg-white pl-8"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Or{" "}
                <button type="button" className="font-medium text-brand-navy underline-offset-2 hover:underline">
                  add new customer
                </button>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="intake-vehicle" className="text-brand-navy">
                Vehicle
              </Label>
              <div className="relative">
                <Car className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="intake-vehicle"
                  placeholder="Year make model, plate, or VIN…"
                  className="border-brand-light/50 bg-white pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="intake-concern" className="text-brand-navy">
                Customer concern
              </Label>
              <Textarea
                id="intake-concern"
                placeholder="What brought them in today?"
                rows={4}
                className="resize-none border-brand-light/50 bg-white"
              />
              <p className="text-xs text-muted-foreground">
                Concern-first intake — estimate builder opens after save.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-brand-navy">Service writer</Label>
                <Select defaultValue="alex">
                  <SelectTrigger className="border-brand-light/50 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alex">Alex Rivera</SelectItem>
                    <SelectItem value="sam">Sam Ortiz</SelectItem>
                    <SelectItem value="jordan">Jordan Reed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-brand-navy">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="border-brand-light/50 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="waiting">Customer waiting</SelectItem>
                    <SelectItem value="urgent">Same-day urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border border-brand-light/40 bg-brand-light/10 p-3">
              <p className="text-xs font-medium text-brand-navy">Suggested next steps</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li>Run digital inspection template</li>
                <li>Assign bay and technician</li>
                <li>Send authorization when estimate is ready</li>
              </ul>
            </div>
          </div>

          <div className="mt-auto flex gap-2 border-t border-brand-light/30 pt-5">
            <Button
              type="submit"
              className="flex-1 bg-brand-navy hover:bg-brand-navy/90"
            >
              Create & open workflow
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-brand-light/50 text-brand-navy"
            >
              Save estimate
            </Button>
          </div>
        </form>
      </aside>
    </>
  );
}

type IntakeFormPanelProps = {
  className?: string;
};

/** Standalone form panel for the Forms preview tab */
export function IntakeFormPanel({ className }: IntakeFormPanelProps) {
  return (
    <div
      className={cn(
        "mx-auto max-w-lg rounded-xl border border-brand-light/40 bg-white p-6",
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-brand-navy/60">
        Form pattern
      </p>
      <h2 className="mt-1 text-xl font-bold text-brand-navy">Quick job intake</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Slide-over drawer triggered by the red New job button — not a full-page
        route. Uses middle-tone surfaces with navy labels and light-blue field
        borders.
      </p>
      <div className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-brand-navy">Customer</Label>
          <Input
            placeholder="Search name or phone…"
            className="border-brand-light/50"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-brand-navy">Vehicle</Label>
          <Input
            placeholder="Year make model or VIN…"
            className="border-brand-light/50"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-brand-navy">Customer concern</Label>
          <Textarea
            placeholder="What brought them in today?"
            rows={3}
            className="border-brand-light/50"
          />
        </div>
        <Button type="button" className="w-full bg-brand-red hover:bg-brand-red/90">
          Preview drawer on dashboard
        </Button>
      </div>
    </div>
  );
}
