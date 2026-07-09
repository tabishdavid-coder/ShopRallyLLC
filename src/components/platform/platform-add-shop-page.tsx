"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, CheckCircle2, Link2, Loader2 } from "lucide-react";

import { MasterIdRevealDialog } from "@/components/platform/master-id-reveal-dialog";
import { PlatformInviteShopDialog } from "@/components/platform/platform-invite-shop-dialog";
import { PlatformMsaConsentCheckbox } from "@/components/platform/platform-msa-consent";
import { PlatformPageIntro } from "@/components/platform/platform-page-intro";
import {
  emptyPlatformShopForm,
  PlatformShopFormFields,
} from "@/components/platform/platform-shop-form-fields";
import { Button } from "@/components/ui/button";
import { MASTER_CRM_HOME } from "@/lib/platform-routing";
import { createPlatformShop } from "@/server/actions/platform";

const POST_CREATE_STEPS = [
  "Copy the shop Master ID — the owner needs it for first login.",
  "Open onboarding to track SMS, Stripe Connect, and website pipeline.",
  "Enter Shop CRM once to verify defaults (labor rate, matrices, email).",
] as const;

export function PlatformAddShopPage({
  prefill,
}: {
  prefill?: { name?: string; email?: string; phone?: string };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState(() =>
    emptyPlatformShopForm({
      name: prefill?.name ?? "",
      email: prefill?.email ?? "",
      shopEmail: prefill?.email ?? "",
      phone: prefill?.phone ?? "",
      billingStatus: "TRIAL",
    }),
  );
  const [error, setError] = useState<string | null>(null);
  const [msaAcknowledged, setMsaAcknowledged] = useState(false);
  const [masterReveal, setMasterReveal] = useState<{
    masterId: string;
    shopName: string;
    shopId: string;
  } | null>(null);

  function submit() {
    setError(null);
    start(async () => {
      const res = await createPlatformShop(form, { msaAcknowledged });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMasterReveal({
        masterId: res.masterId,
        shopName: res.shopName,
        shopId: res.shopId,
      });
    });
  }

  function continueToOnboarding() {
    if (!masterReveal) return;
    setMasterReveal(null);
    router.push(`/platform/onboarding?shopId=${encodeURIComponent(masterReveal.shopId)}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6" data-planned-change="PLAT-03">
      <div className="flex items-start gap-2">
        <Button variant="ghost" size="icon" asChild className="mt-1 shrink-0">
          <Link href={`${MASTER_CRM_HOME}/shops`}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <PlatformPageIntro
            title="Add shop"
            description={
              <>
                Operator-provision a tenant with address, billing defaults, labor rate, and CRM email.
                {prefill?.name || prefill?.email ? (
                  <>
                    {" "}
                    Prefilled from an intake lead — confirm details before creating.
                  </>
                ) : null}
              </>
            }
          >
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5 border-brand-navy/30"
              onClick={() => setInviteOpen(true)}
            >
              <Link2 className="size-3.5" />
              Send intake link instead
            </Button>
          </PlatformPageIntro>
        </div>
      </div>

      <div className="rounded-xl border border-brand-navy/15 bg-brand-navy/5 p-4">
        <p className="text-sm font-semibold text-brand-navy">After you create the shop</p>
        <ul className="mt-2 space-y-1.5">
          {POST_CREATE_STEPS.map((step) => (
            <li key={step} className="flex gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-brand-navy/70" />
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <PlatformShopFormFields
          form={form}
          onChange={setForm}
          onSubmit={submit}
          pending={pending}
          error={error}
          submitLabel={pending ? "Creating…" : "Create shop"}
          footer={
            <PlatformMsaConsentCheckbox
              id="add-shop-msa"
              checked={msaAcknowledged}
              onCheckedChange={setMsaAcknowledged}
            />
          }
          submitDisabled={!msaAcknowledged}
        />
        {pending ? (
          <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Assigning master key and default pricing matrices…
          </p>
        ) : null}
      </div>

      <PlatformInviteShopDialog open={inviteOpen} onOpenChange={setInviteOpen} />

      <MasterIdRevealDialog
        open={Boolean(masterReveal)}
        onOpenChange={(o) => !o && setMasterReveal(null)}
        masterId={masterReveal?.masterId ?? null}
        shopName={masterReveal?.shopName ?? ""}
        onContinue={continueToOnboarding}
      />
    </div>
  );
}
