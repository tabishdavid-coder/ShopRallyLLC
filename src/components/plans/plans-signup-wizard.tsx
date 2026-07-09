"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Loader2,
  User,
  Car,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlanPreviewCard } from "@/components/plans/plan-preview-card";
import { formatPhoneInput } from "@/lib/phone";
import {
  PAY_IN_FULL_SAVINGS_LABEL,
  computeMonthlyTotalFromPayInFull,
  resolvePlanPricing,
  VEHICLE_CLASS_LABELS,
} from "@/lib/maintenance-programs";
import type { MaintenanceVehicleClass } from "@/generated/prisma";
import type { PublicPlansPayload } from "@/server/maintenance-programs";
import { submitPublicPlanSignup } from "@/server/actions/maintenance-subscriptions";
import { cn } from "@/lib/utils";

type Plan = PublicPlansPayload["plans"][number];

type Props = {
  shopSlug: string;
  shopName: string;
  plan: Plan;
  vehicleClass: MaintenanceVehicleClass;
  termsText: string;
  stripeCheckoutAvailable?: boolean;
  onBack: () => void;
};

type Step = "payment" | "contact" | "vehicle" | "review" | "done";

export function PlansSignupWizard({
  shopSlug,
  shopName,
  plan,
  vehicleClass,
  termsText,
  stripeCheckoutAvailable = false,
  onBack,
}: Props) {
  const [step, setStep] = useState<Step>("payment");
  const [paymentOption, setPaymentOption] = useState<"pay_in_full" | "monthly" | "annual">(
    plan.payInFullCents ? "pay_in_full" : plan.monthlyCents ? "monthly" : "pay_in_full",
  );
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleVin, setVehicleVin] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberToken, setMemberToken] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const pricing = useMemo(
    () => resolvePlanPricing(plan, plan.useClassPricing ? vehicleClass : null),
    [plan, vehicleClass],
  );

  const steps: Step[] = ["payment", "contact", "vehicle", "review"];
  const stepIndex = steps.indexOf(step);

  function next() {
    setError(null);
    if (step === "payment") setStep("contact");
    else if (step === "contact") {
      if (!firstName.trim() || !lastName.trim() || phone.replace(/\D/g, "").length < 10) {
        setError("Enter your name and a valid phone number.");
        return;
      }
      setStep("vehicle");
    } else if (step === "vehicle") {
      if (!vehicleMake.trim() || !vehicleModel.trim()) {
        setError("Enter your vehicle make and model.");
        return;
      }
      setStep("review");
    }
  }

  function back() {
    setError(null);
    if (step === "payment") onBack();
    else if (step === "contact") setStep("payment");
    else if (step === "vehicle") setStep("contact");
    else if (step === "review") setStep("vehicle");
  }

  function submit() {
    if (!termsAccepted) {
      setError("Accept the terms to continue.");
      return;
    }
    setError(null);
    start(async () => {
      const res = await submitPublicPlanSignup({
        shopSlug,
        planId: plan.id,
        paymentOption,
        vehicleClass: plan.useClassPricing ? vehicleClass : undefined,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: formatPhoneInput(phone),
        email: email.trim(),
        vehicleYear: vehicleYear.trim(),
        vehicleMake: vehicleMake.trim(),
        vehicleModel: vehicleModel.trim(),
        vehicleVin: vehicleVin.trim(),
        termsAccepted: true,
      });
      if (res.ok && res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      if (res.ok) {
        setMemberToken(res.memberToken ?? null);
        setStep("done");
      } else {
        setError(res.error);
      }
    });
  }

  if (step === "done") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto size-12 text-green-600" />
        <h2 className="mt-4 text-xl font-bold">Welcome to {plan.name}!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You&apos;re enrolled with {shopName}. We&apos;ll see you at your first visit.
        </p>
        {memberToken ? (
          <Button className="mt-6 w-full bg-brand-navy" asChild>
            <Link href={`/member/${memberToken}`}>View my membership</Link>
          </Button>
        ) : null}
        <Button variant="outline" className="mt-2 w-full" onClick={onBack}>
          Back to plans
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl border bg-card shadow-sm overflow-hidden">
      <div className="border-b bg-brand-navy px-5 py-4 text-white">
        <button type="button" onClick={back} className="inline-flex items-center text-sm text-white/80 hover:text-white">
          <ChevronLeft className="size-4" /> Back
        </button>
        <h2 className="mt-2 text-lg font-bold">Sign up — {plan.name}</h2>
        <div className="mt-3 flex gap-1">
          {steps.map((s, i) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full",
                i <= stepIndex ? "bg-brand-light" : "bg-white/25",
              )}
            />
          ))}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {step === "payment" && (
          <>
            <p className="text-sm text-muted-foreground">Choose how you&apos;d like to pay.</p>
            {plan.useClassPricing ? (
              <p className="text-xs rounded-md bg-muted px-3 py-2">
                Pricing for: <strong>{VEHICLE_CLASS_LABELS[vehicleClass]}</strong>
              </p>
            ) : null}
            <div className="space-y-2">
              {pricing.payInFullCents != null && (
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 has-[:checked]:border-brand-navy has-[:checked]:bg-brand-light/10">
                  <input
                    type="radio"
                    name="pay"
                    checked={paymentOption === "pay_in_full"}
                    onChange={() => setPaymentOption("pay_in_full")}
                    className="size-4"
                  />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">Pay in full</p>
                      <span className="rounded-full bg-brand-light/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-navy">
                        {PAY_IN_FULL_SAVINGS_LABEL}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      ${(pricing.payInFullCents / 100).toFixed(2)} one time
                    </p>
                  </div>
                </label>
              )}
              {pricing.monthlyCents != null && (
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 has-[:checked]:border-brand-navy has-[:checked]:bg-brand-light/10">
                  <input
                    type="radio"
                    name="pay"
                    checked={paymentOption === "monthly"}
                    onChange={() => setPaymentOption("monthly")}
                    className="size-4"
                  />
                  <div>
                    <p className="font-medium">Monthly</p>
                    <p className="text-sm text-muted-foreground">
                      ${(pricing.monthlyCents / 100).toFixed(2)}/mo × {plan.monthlyTermMonths ?? 12} months
                      {pricing.payInFullCents != null ? (
                        <span className="block text-xs mt-0.5">
                          ${(computeMonthlyTotalFromPayInFull(pricing.payInFullCents) / 100).toFixed(2)} total
                          {" · "}
                          pay in full and save 15%
                        </span>
                      ) : null}
                    </p>
                  </div>
                </label>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CreditCard className="size-3.5" />
              {stripeCheckoutAvailable
                ? "You'll complete payment securely with Stripe at checkout."
                : "Demo mode — payment simulated locally. Connect Stripe in shop settings for live checkout."}
            </p>
          </>
        )}

        {step === "contact" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>First name</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1 h-11" />
              </div>
              <div>
                <Label>Last name</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1 h-11" />
              </div>
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(formatPhoneInput(e.target.value))} className="mt-1 h-11" />
            </div>
            <div>
              <Label>Email (optional)</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-11" />
            </div>
          </>
        )}

        {step === "vehicle" && (
          <>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Car className="size-4" /> Benefits apply to this vehicle only — they cannot be used on a
              different car.
            </p>
            <p className="text-xs rounded-md border bg-muted/40 px-3 py-2">
              Enter the exact vehicle you want covered. To switch vehicles later, the shop must
              cancel and re-enroll your plan.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Year</Label>
                <Input value={vehicleYear} onChange={(e) => setVehicleYear(e.target.value)} className="mt-1 h-11" />
              </div>
              <div>
                <Label>Make</Label>
                <Input value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} className="mt-1 h-11" />
              </div>
              <div>
                <Label>Model</Label>
                <Input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} className="mt-1 h-11" />
              </div>
            </div>
            <div>
              <Label>VIN (optional)</Label>
              <Input value={vehicleVin} onChange={(e) => setVehicleVin(e.target.value.toUpperCase())} className="mt-1 h-11" />
            </div>
          </>
        )}

        {step === "review" && (
          <>
            <PlanPreviewCard
              plan={{
                name: plan.name,
                tagline: plan.tagline,
                featured: plan.featured,
                payInFullCents: pricing.payInFullCents,
                monthlyCents: pricing.monthlyCents,
                monthlyTermMonths: plan.monthlyTermMonths,
                retailCents: plan.retailCents,
                entitlements: (plan.entitlements ?? []).map((e) => ({
                  kind: e.kind,
                  label: e.label,
                  quantity: e.quantity,
                })),
              }}
              signupDisabled
              className="border-0 shadow-none p-0"
            />
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={termsAccepted} onCheckedChange={(v) => setTermsAccepted(v === true)} className="mt-0.5" />
              <span>I agree to the plan terms and conditions.</span>
            </label>
            {termsText ? (
              <p className="text-xs text-muted-foreground max-h-24 overflow-y-auto rounded border p-2">{termsText}</p>
            ) : null}
          </>
        )}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex gap-2 pt-2">
          {step !== "review" ? (
            <Button className="flex-1 bg-brand-navy" onClick={next}>
              Continue <ChevronRight className="ml-1 size-4" />
            </Button>
          ) : (
            <Button className="flex-1 bg-brand-navy" onClick={submit} disabled={pending}>
              {pending ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : stripeCheckoutAvailable ? (
                <CreditCard className="mr-1 size-4" />
              ) : (
                <User className="mr-1 size-4" />
              )}
              {stripeCheckoutAvailable ? "Continue to payment" : "Complete signup"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
