"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  Pencil,
  Check,
  X,
  UploadCloud,
  Loader2,
  Copy,
  ChevronDown,
  CircleCheck,
  Circle,
  MapPin,
  Phone,
  ImageIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { shopTimezone } from "@/lib/shop-timezone";
import { PLANS } from "@/lib/plans";
import type { ShopPlan, ShopStatus } from "@/generated/prisma";
import { updateShopProfile, type ShopProfilePatch } from "@/server/actions/shop";

export type ShopProfileData = {
  id: string;
  name: string;
  code: string;
  masterId: string;
  masterIdCreatedAt: Date;
  bookingSlug: string | null;
  shopIdLabel: string | null;
  licenseNo: string | null;
  taxId: string | null;
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
  plan: ShopPlan;
  status: ShopStatus;
};

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

const inputCls =
  "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

const STATUS_META: Record<ShopStatus, { label: string; dot: string }> = {
  ACTIVE: { label: "Active", dot: "bg-emerald-400" },
  TRIAL: { label: "Trial", dot: "bg-amber-400" },
  SUSPENDED: { label: "Suspended", dot: "bg-brand-red" },
  PENDING: { label: "Pending", dot: "bg-slate-300" },
};

type Section = "address" | "contact" | "logo";

/**
 * Shop Profile — a single coherent workspace: a navy identity hero (name,
 * status/plan, Master ID) over a master-detail body. Left column is
 * "facts about the shop" (identity + completeness + rarely-touched IDs);
 * right column is "things you edit" (address / contact / logo), tabbed in
 * one card instead of a second disconnected block.
 */
export function ShopProfile({ shop }: { shop: ShopProfileData }) {
  const [section, setSection] = useState<Section>("address");
  const [logoUrl, setLogoUrl] = useState<string | null>(shop.logoUrl);
  const panelRef = useRef<HTMLDivElement>(null);

  function jumpToLogo() {
    setSection("logo");
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="space-y-5">
      <ShopProfileHero shop={shop} logoUrl={logoUrl} />

      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-4">
          <IdentityFactsCard shop={shop} />
          <ProfileChecklist shop={shop} logoUrl={logoUrl} onAddLogo={jumpToLogo} />
          <TechnicalIdsDisclosure shop={shop} />
        </div>

        <FormsPanel
          shop={shop}
          section={section}
          setSection={setSection}
          panelRef={panelRef}
          logoUrl={logoUrl}
          onLogoChange={setLogoUrl}
        />
      </div>
    </div>
  );
}

/* ───────────────────────── Hero identity strip ───────────────────────── */

function ShopAvatar({ code, logoUrl }: { code: string; logoUrl: string | null }) {
  return (
    <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/15 ring-1 ring-white/25">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="size-full bg-white object-contain p-1.5" />
      ) : (
        <span className="text-lg font-bold tracking-wide text-white">
          {code.slice(0, 3).toUpperCase()}
        </span>
      )}
    </span>
  );
}

function ShopProfileHero({
  shop,
  logoUrl,
}: {
  shop: ShopProfileData;
  logoUrl: string | null;
}) {
  const [name, setName] = useState(shop.name);
  const [draft, setDraft] = useState(shop.name);
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function begin() {
    setDraft(name);
    setEditing(true);
    setError(null);
    requestAnimationFrame(() => inputRef.current?.select());
  }

  function cancel() {
    setDraft(name);
    setEditing(false);
    setError(null);
  }

  function commit() {
    const trimmed = draft.trim();
    if (!trimmed) {
      setError("Shop name is required.");
      return;
    }
    if (trimmed === name) {
      setEditing(false);
      return;
    }
    setError(null);
    start(async () => {
      const res = await updateShopProfile({ name: trimmed });
      if (res.ok) {
        setName(trimmed);
        setEditing(false);
      } else {
        setError(res.error);
      }
    });
  }

  async function copyMasterId() {
    await navigator.clipboard.writeText(shop.masterId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const createdLabel = new Date(shop.masterIdCreatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const status = STATUS_META[shop.status];
  const planName = PLANS[shop.plan]?.name ?? shop.plan;

  return (
    <div className="rounded-xl bg-gradient-to-br from-brand-navy to-brand-navy/85 px-5 py-5 text-white shadow-sm sm:px-6 sm:py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <ShopAvatar code={shop.code} logoUrl={logoUrl} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {editing ? (
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                    if (e.key === "Escape") {
                      cancel();
                      e.currentTarget.blur();
                    }
                  }}
                  onBlur={commit}
                  className="min-w-0 max-w-[70vw] rounded-md border border-white/30 bg-white/10 px-2 py-0.5 text-lg font-bold text-white outline-none placeholder:text-white/50 focus:border-white/60 sm:text-xl"
                />
              ) : (
                <button
                  type="button"
                  onClick={begin}
                  className="group flex min-w-0 items-center gap-1.5 rounded-md text-left"
                >
                  <h1 className="truncate text-lg font-bold leading-tight sm:text-xl">{name}</h1>
                  <Pencil
                    className="size-3.5 shrink-0 text-white/50 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden
                  />
                </button>
              )}
              {pending ? <Loader2 className="size-3.5 shrink-0 animate-spin text-white/70" aria-hidden /> : null}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 font-medium">
                <span className={cn("size-1.5 rounded-full", status.dot)} aria-hidden />
                {status.label}
              </span>
              <span className="inline-flex items-center rounded-full bg-brand-light/20 px-2 py-0.5 font-medium text-brand-light">
                {planName} plan
              </span>
              <span className="text-white/60">Shop since {createdLabel}</span>
            </div>
            {error ? <p className="mt-1 text-xs text-red-200">{error}</p> : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
          <code
            className="rounded-md bg-white/10 px-2.5 py-1.5 font-mono text-xs font-semibold tracking-wide"
            title="Shop Master ID — use for ShopRally support, vendors, and billing"
          >
            {shop.masterId}
          </code>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 gap-1.5 border border-white/20 bg-white/15 text-white hover:bg-white/25"
            onClick={copyMasterId}
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy ID"}
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 bg-white text-brand-navy hover:bg-white/90"
            onClick={begin}
          >
            <Pencil className="size-3.5" /> Edit profile
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Identity facts (left column) ───────────────────────── */

function FactRow({
  label,
  value,
  mono,
  muted,
  hint,
  action,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  muted?: boolean;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">{label}</dt>
        <dd
          className={cn("mt-0.5 truncate text-sm", mono && "font-mono text-[13px]", muted && "text-muted-foreground")}
          title={hint}
        >
          {value}
        </dd>
      </div>
      {action ? <div className="shrink-0 pt-3.5">{action}</div> : null}
    </div>
  );
}

function IdentityFactsCard({ shop }: { shop: ShopProfileData }) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const tz = shopTimezone(shop.state);
  const appUrl = `getshoprally.com/shop/${shop.id.slice(-6)}`;

  async function copyUrl() {
    await navigator.clipboard.writeText(appUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 1500);
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identity</h2>
      <dl className="mt-3 space-y-3">
        <FactRow label="Shop code" value={shop.code} mono />
        <FactRow
          label="Booking slug"
          value={shop.bookingSlug ?? "Not set"}
          mono
          muted={!shop.bookingSlug}
          action={
            <Link href="/settings/booking" className="link-subtle text-xs whitespace-nowrap">
              Manage
            </Link>
          }
        />
        <FactRow
          label="Timezone"
          value={tz}
          mono
          hint={shop.state ? `Detected from shop address (${shop.state})` : "Add an address to detect timezone"}
        />
        <FactRow
          label="ShopRally URL"
          value={appUrl}
          mono
          action={
            <button type="button" onClick={copyUrl} className="link-subtle text-xs whitespace-nowrap">
              {copiedUrl ? "Copied" : "Copy"}
            </button>
          }
        />
      </dl>
    </div>
  );
}

/* ───────────────────────── Complete-your-profile checklist ───────────────────────── */

function InlineChecklistField({
  label,
  patchKey,
  value,
  onSaved,
  placeholder,
}: {
  label: string;
  patchKey: "shopIdLabel" | "licenseNo" | "taxId";
  value: string;
  onSaved: (value: string) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const done = value.length > 0;

  function begin() {
    setDraft(value);
    setEditing(true);
    setError(null);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
    setError(null);
  }

  function commit() {
    const trimmed = draft.trim();
    if (trimmed === value) {
      setEditing(false);
      return;
    }
    setError(null);
    const patch: ShopProfilePatch =
      patchKey === "shopIdLabel"
        ? { shopIdLabel: trimmed || null }
        : patchKey === "licenseNo"
          ? { licenseNo: trimmed || null }
          : { taxId: trimmed || null };
    start(async () => {
      const res = await updateShopProfile(patch);
      if (res.ok) {
        onSaved(trimmed);
        setEditing(false);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <li className="flex items-start gap-2.5 py-2.5">
      {done ? (
        <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
      ) : (
        <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground/40" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {editing ? (
          <div className="mt-1 flex items-center gap-1.5">
            <input
              autoFocus
              className={cn(inputCls, "h-8 text-sm")}
              value={draft}
              placeholder={placeholder}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
                if (e.key === "Escape") {
                  cancel();
                  e.currentTarget.blur();
                }
              }}
              onBlur={commit}
            />
            {pending ? <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" aria-hidden /> : null}
          </div>
        ) : (
          <button type="button" onClick={begin} className="group mt-0.5 flex items-center gap-1.5 text-left">
            <span className={cn("text-sm", done ? "text-foreground" : "text-muted-foreground italic")}>
              {done ? value : placeholder}
            </span>
            <Pencil
              className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden
            />
          </button>
        )}
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </div>
    </li>
  );
}

function ProfileChecklist({
  shop,
  logoUrl,
  onAddLogo,
}: {
  shop: ShopProfileData;
  logoUrl: string | null;
  onAddLogo: () => void;
}) {
  const [shopIdLabel, setShopIdLabel] = useState(shop.shopIdLabel ?? "");
  const [licenseNo, setLicenseNo] = useState(shop.licenseNo ?? "");
  const [taxId, setTaxId] = useState(shop.taxId ?? "");

  const total = 4;
  const doneCount = [shopIdLabel, licenseNo, taxId, logoUrl].filter((v) => !!v).length;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Complete your profile
        </h2>
        <span className="text-xs font-medium text-muted-foreground">
          {doneCount}/{total}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-brand-navy transition-all"
          style={{ width: `${(doneCount / total) * 100}%` }}
        />
      </div>
      <ul className="mt-1 divide-y divide-border/60">
        <InlineChecklistField
          label="Shop ID"
          patchKey="shopIdLabel"
          value={shopIdLabel}
          onSaved={setShopIdLabel}
          placeholder="Add a shop ID"
        />
        <InlineChecklistField
          label="Business license"
          patchKey="licenseNo"
          value={licenseNo}
          onSaved={setLicenseNo}
          placeholder="Add license number"
        />
        <InlineChecklistField
          label="Tax ID"
          patchKey="taxId"
          value={taxId}
          onSaved={setTaxId}
          placeholder="Add tax ID"
        />
        <li className="flex items-start gap-2.5 py-2.5">
          {logoUrl ? (
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
          ) : (
            <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground/40" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Shop logo</p>
            <button
              type="button"
              onClick={onAddLogo}
              className="group mt-0.5 flex items-center gap-1.5 text-left"
            >
              <span className={cn("text-sm", logoUrl ? "text-foreground" : "text-muted-foreground italic")}>
                {logoUrl ? "Uploaded" : "Add a logo"}
              </span>
              <Pencil
                className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
            </button>
          </div>
        </li>
      </ul>
    </div>
  );
}

/* ───────────────────────── Technical IDs (collapsed by default) ───────────────────────── */

function TechnicalIdsDisclosure({ shop }: { shop: ShopProfileData }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const createdLabel = new Date(shop.masterIdCreatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  async function copyMasterId() {
    await navigator.clipboard.writeText(shop.masterId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border bg-card">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Technical IDs</span>
        <ChevronDown
          className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t px-4 py-3">
        <dl className="space-y-3">
          <FactRow
            label="Master ID"
            value={shop.masterId}
            mono
            action={
              <button type="button" onClick={copyMasterId} className="link-subtle text-xs whitespace-nowrap">
                {copied ? "Copied" : "Copy"}
              </button>
            }
          />
          <p className="text-xs text-muted-foreground">Assigned {createdLabel}</p>
          <FactRow label="ShopRally ID" value={shop.id} mono muted />
        </dl>
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ───────────────────────── Forms panel (right column, tabbed) ───────────────────────── */

const TABS: { id: Section; label: string; icon: typeof MapPin }[] = [
  { id: "address", label: "Address", icon: MapPin },
  { id: "contact", label: "Phone & Email", icon: Phone },
  { id: "logo", label: "Logo", icon: ImageIcon },
];

function FormsPanel({
  shop,
  section,
  setSection,
  panelRef,
  logoUrl,
  onLogoChange,
}: {
  shop: ShopProfileData;
  section: Section;
  setSection: (s: Section) => void;
  panelRef: React.RefObject<HTMLDivElement | null>;
  logoUrl: string | null;
  onLogoChange: (v: string | null) => void;
}) {
  return (
    <div ref={panelRef} className="min-w-0 rounded-lg border bg-card">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <div className="inline-flex items-center gap-1 rounded-lg bg-muted/60 p-1">
          {TABS.map((tab) => {
            const active = section === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSection(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <tab.icon className="size-3.5" aria-hidden />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      {section === "address" ? <AddressForm shop={shop} /> : null}
      {section === "contact" ? <ContactForm shop={shop} /> : null}
      {section === "logo" ? <LogoForm logoUrl={logoUrl} onLogoChange={onLogoChange} /> : null}
    </div>
  );
}

function SavedNote({ saved, error }: { saved: boolean; error: string | null }) {
  if (error) return <span className="text-xs text-destructive">{error}</span>;
  if (saved) return <span className="flex items-center gap-1 text-xs text-emerald-600"><Check className="size-3.5" /> Saved</span>;
  return null;
}

function AddressForm({ shop }: { shop: ShopProfileData }) {
  const [f, setF] = useState({
    address: shop.address ?? "",
    address2: shop.address2 ?? "",
    city: shop.city ?? "",
    state: shop.state ?? "",
    zip: shop.zip ?? "",
  });
  const { saved, error, pending, run } = useSaver();

  return (
    <FormShell
      title="Update your shop address"
      desc="When changing your address, you are changing the address that is unique to this shop."
      onSave={() => run({ address: f.address, address2: f.address2, city: f.city, state: f.state, zip: f.zip })}
      saveLabel="Update Address"
      saved={saved}
      error={error}
      pending={pending}
    >
      <p className="text-sm text-muted-foreground">Enter the physical address location of your shop</p>
      <Field label="Address line 1" required>
        <input className={inputCls} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="123 Main St" />
      </Field>
      <Field label="Address line 2">
        <input className={inputCls} value={f.address2} onChange={(e) => setF({ ...f, address2: e.target.value })} placeholder="Enter address line 2" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="City" required>
          <input className={inputCls} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
        </Field>
        <Field label="State / Province" required>
          <select className={inputCls} value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })}>
            <option value="">Select…</option>
            {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Postal Code" required>
          <input className={inputCls} value={f.zip} onChange={(e) => setF({ ...f, zip: e.target.value })} />
        </Field>
      </div>
    </FormShell>
  );
}

/* ───────────────────────── Phone & Email ───────────────────────── */

function ContactForm({ shop }: { shop: ShopProfileData }) {
  const [f, setF] = useState({
    phone: shop.phone ?? "",
    email: shop.email ?? "",
    website: shop.website ?? "",
  });
  const { saved, error, pending, run } = useSaver();

  return (
    <FormShell
      title="Update your shop contact info"
      desc="Your shop phone, email and website will be displayed to customers on estimates and invoices."
      onSave={() => run({ phone: f.phone, email: f.email, website: f.website })}
      saveLabel="Update Contact Info"
      saved={saved}
      error={error}
      pending={pending}
    >
      <Field label="Business Phone" required>
        <input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="(555) 555-5555" />
      </Field>
      <Field label="Business Email">
        <input className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="shop@email.com" />
      </Field>
      <Field label="Business Website">
        <input className={inputCls} value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} placeholder="https://yourshop.com" />
      </Field>
    </FormShell>
  );
}

/* ───────────────────────── Logo ───────────────────────── */

function LogoForm({
  logoUrl,
  onLogoChange,
}: {
  logoUrl: string | null;
  onLogoChange: (value: string | null) => void;
}) {
  const [fileName, setFileName] = useState<string | null>(logoUrl ? "logo" : null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { saved, error, pending, run } = useSaver();
  const [localError, setLocalError] = useState<string | null>(null);

  function onFile(file: File | null) {
    setLocalError(null);
    if (!file) return;
    if (!/image\/(png|jpe?g)/.test(file.type)) {
      setLocalError("Please upload a JPG or PNG.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setLocalError("Image must be under 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onLogoChange(dataUrl);
      setFileName(file.name);
      run({ logoUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  }

  function remove() {
    onLogoChange(null);
    setFileName(null);
    run({ logoUrl: null });
  }

  return (
    <div className="p-5">
      <h3 className="text-base font-semibold">Shop Logo</h3>
      <p className="mb-4 text-sm text-muted-foreground">Upload your shop logo to display on estimates and invoice print-outs.</p>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0] ?? null); }}
        className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center"
      >
        <UploadCloud className="size-6 text-primary" />
        <p className="text-sm text-muted-foreground">Drag and drop files here, or</p>
        <Button size="sm" onClick={() => fileRef.current?.click()} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null} Choose files to upload
        </Button>
        <p className="text-xs text-muted-foreground">JPG or PNG</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {logoUrl ? (
        <div className="mt-4 flex items-center gap-3 rounded-lg border p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="Shop logo" className="size-12 rounded object-contain" />
          <span className="flex-1 truncate text-sm">{fileName ?? "logo"}</span>
          <button type="button" onClick={remove} aria-label="Remove logo" className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      <div className="mt-3 min-h-[1rem]">
        <SavedNote saved={saved} error={localError ?? error} />
      </div>
    </div>
  );
}

/* ───────────────────────── Shared form bits ───────────────────────── */

function useSaver() {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  function run(patch: ShopProfilePatch) {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await updateShopProfile(patch);
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(res.error);
      }
    });
  }
  return { saved, error, pending, run };
}

function FormShell({
  title,
  desc,
  children,
  onSave,
  saveLabel,
  saved,
  error,
  pending,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
  onSave: () => void;
  saveLabel: string;
  saved: boolean;
  error: string | null;
  pending: boolean;
}) {
  return (
    <div className="p-5">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mb-4 text-sm text-muted-foreground">{desc}</p>
      <div className="space-y-4 border-t pt-4">{children}</div>
      <div className="mt-5 flex items-center justify-end gap-3 border-t pt-4">
        <SavedNote saved={saved} error={error} />
        <Button size="sm" onClick={onSave} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null} {saveLabel}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">
        {label} {required ? <span className="text-destructive">*</span> : null}
      </label>
      {children}
    </div>
  );
}
